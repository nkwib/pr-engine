import {
  DEFAULT_RECENCY_HALF_LIFE_DAYS,
  DEFAULT_RISK_WEIGHTS,
  DEFAULT_STRONG_COUPLING_JACCARD,
  type FileRiskReport,
  type RiskMetric,
  type RiskOpts,
  type RiskReport,
  type RiskWeights,
} from "./types.js";

const NO_SIGNAL_METRIC: RiskMetric = {
  value: null,
  groundedIn: [],
};

const NO_SIGNAL_COUPLING: RiskMetric<number> = {
  value: null,
  groundedIn: [],
};

const MS_PER_DAY = 86_400_000;

/**
 * Combine hotspots + churn + cochange into a per-file risk report.
 *
 * Honors the no-fabrication invariant: when `mined.stats.bugFixCommits`
 * is `0`, every metric and the combined score is `null`. When the repo
 * has bug-fix history but a particular file has none, that's a real
 * negative observation and is reported as `0` (grounded by the file's
 * non-bug-fix commits).
 *
 * Pure function; no I/O; no `Date.now()`.
 *
 * @public
 */
export function computeRisk(opts: RiskOpts): RiskReport {
  const weights: RiskWeights = {
    hotspot: opts.weights?.hotspot ?? DEFAULT_RISK_WEIGHTS.hotspot,
    defectDensity: opts.weights?.defectDensity ?? DEFAULT_RISK_WEIGHTS.defectDensity,
    couplingDegree: opts.weights?.couplingDegree ?? DEFAULT_RISK_WEIGHTS.couplingDegree,
    recencyDays: opts.weights?.recencyDays ?? DEFAULT_RISK_WEIGHTS.recencyDays,
  };
  const recencyHalfLifeDays =
    opts.recencyHalfLifeDays ?? DEFAULT_RECENCY_HALF_LIFE_DAYS;
  const strongCouplingJaccard =
    opts.strongCouplingJaccard ?? DEFAULT_STRONG_COUPLING_JACCARD;
  const now = opts.now ?? opts.mined.stats.latestAuthoredAt;

  // Pre-index bug-fix commits per file (for groundedIn).
  const bugFixShasByFile = new Map<string, string[]>();
  // Pre-index latest commit SHA per file (for recencyDays.groundedIn).
  const latestShaByFile = new Map<string, { sha: string; at: string }>();
  for (const commit of opts.mined.commits) {
    for (const file of commit.filesTouched) {
      if (commit.isBugFix) {
        const arr = bugFixShasByFile.get(file);
        if (arr === undefined) {
          bugFixShasByFile.set(file, [commit.sha]);
        } else {
          arr.push(commit.sha);
        }
      }
      const latest = latestShaByFile.get(file);
      if (latest === undefined || commit.authoredAt > latest.at) {
        latestShaByFile.set(file, { sha: commit.sha, at: commit.authoredAt });
      }
    }
  }

  // Union of files seen across upstream reports, first-seen order.
  const fileSet = new Set<string>();
  const fileOrder: string[] = [];
  for (const file of opts.hotspots.files) {
    if (!fileSet.has(file)) {
      fileSet.add(file);
      fileOrder.push(file);
    }
  }
  for (const file of opts.churn.files) {
    if (!fileSet.has(file)) {
      fileSet.add(file);
      fileOrder.push(file);
    }
  }
  for (const file of opts.cochange.files) {
    if (!fileSet.has(file)) {
      fileSet.add(file);
      fileOrder.push(file);
    }
  }

  const noBugFixHistory = opts.mined.stats.bugFixCommits === 0;

  const byFile: Record<string, FileRiskReport> = {};
  let scoreSum = 0;
  let filesWithScore = 0;

  for (const file of fileOrder) {
    if (noBugFixHistory) {
      // No-fabrication: zero bug-fix commits in the entire input → no
      // claim about risk for any file.
      byFile[file] = {
        file,
        score: null,
        hotspot: NO_SIGNAL_METRIC,
        defectDensity: NO_SIGNAL_METRIC,
        couplingDegree: NO_SIGNAL_COUPLING,
        recencyDays: NO_SIGNAL_METRIC,
        caveats: ["no-bugfix-history-in-repo"],
      };
      continue;
    }

    const hot = opts.hotspots.byFile[file];
    const ch = opts.churn.byFile[file];
    const co = opts.cochange.nodes[file];
    const fileBugFixShas = bugFixShasByFile.get(file) ?? [];
    const latest = latestShaByFile.get(file);

    const hotspotMetric: RiskMetric =
      hot === undefined
        ? NO_SIGNAL_METRIC
        : {
            value: hot.score,
            groundedIn: fileBugFixShas,
          };

    const defectMetric: RiskMetric =
      ch === undefined
        ? NO_SIGNAL_METRIC
        : {
            value: ch.bugFixCount / ch.commitCount,
            groundedIn: fileBugFixShas,
          };

    let couplingMetric: RiskMetric<number>;
    if (co === undefined) {
      couplingMetric = NO_SIGNAL_COUPLING;
    } else {
      let strong = 0;
      const groundingFiles: string[] = [];
      for (const edge of co.neighbors) {
        if (edge.jaccard >= strongCouplingJaccard) {
          strong += 1;
          groundingFiles.push(edge.file);
        }
      }
      // groundedIn: the cochange neighbor file paths whose Jaccard met the
      // threshold and therefore drove the strong-coupling count. Empty when
      // value is 0 (no claim made). Files are used here (not commit SHAs)
      // because cochange edges aggregate over many commits.
      couplingMetric = { value: strong, groundedIn: groundingFiles };
    }

    let recencyMetric: RiskMetric;
    if (latest === undefined) {
      recencyMetric = NO_SIGNAL_METRIC;
    } else {
      const lastMs = Date.parse(latest.at);
      const nowMs = Date.parse(now ?? "");
      if (!Number.isFinite(lastMs) || !Number.isFinite(nowMs)) {
        recencyMetric = NO_SIGNAL_METRIC;
      } else {
        const days = (nowMs - lastMs) / MS_PER_DAY;
        recencyMetric = { value: days, groundedIn: [latest.sha] };
      }
    }

    // Combine into [0, 1] score.
    let weighted = 0;
    let totalWeight = 0;
    if (hotspotMetric.value !== null) {
      weighted += weights.hotspot * hotspotMetric.value;
      totalWeight += weights.hotspot;
    }
    if (defectMetric.value !== null) {
      weighted += weights.defectDensity * defectMetric.value;
      totalWeight += weights.defectDensity;
    }
    if (couplingMetric.value !== null) {
      const couplingNorm = Math.min(1, couplingMetric.value / 5);
      weighted += weights.couplingDegree * couplingNorm;
      totalWeight += weights.couplingDegree;
    }
    if (recencyMetric.value !== null) {
      // Clamp days to a non-negative value: if `opts.now` precedes the
      // file's last commit (clock skew, caller passed a "since" instead
      // of "now"), treat recency as "just edited" instead of letting
      // exp(-negative) push the score above 1.
      const daysClamped = Math.max(0, recencyMetric.value);
      const recencyNorm = Math.exp(-daysClamped / recencyHalfLifeDays);
      weighted += weights.recencyDays * recencyNorm;
      totalWeight += weights.recencyDays;
    }

    const score = totalWeight > 0 ? weighted / totalWeight : null;
    if (score !== null) {
      scoreSum += score;
      filesWithScore += 1;
    }

    const caveats: string[] = [];
    if (ch !== undefined && ch.commitCount < 5) caveats.push("low-commit-history");
    if (defectMetric.value !== null && ch !== undefined && ch.bugFixCount === 1) {
      caveats.push("single-bugfix-event");
    }

    byFile[file] = {
      file,
      score,
      hotspot: hotspotMetric,
      defectDensity: defectMetric,
      couplingDegree: couplingMetric,
      recencyDays: recencyMetric,
      caveats,
    };
  }

  return {
    byFile,
    files: fileOrder,
    stats: {
      fileCount: fileOrder.length,
      filesWithScore,
      meanScore: filesWithScore === 0 ? null : scoreSum / filesWithScore,
      weightsUsed: weights,
    },
  };
}
