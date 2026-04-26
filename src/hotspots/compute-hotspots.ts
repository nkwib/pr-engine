import {
  DEFAULT_HOTSPOT_PRIOR,
  type HotspotMetrics,
  type HotspotsOpts,
  type HotspotsReport,
} from "./types.js";

interface Accumulator {
  total: number;
  bugfix: number;
  lastBugFixSha: string | null;
  lastBugFixAt: string | null;
}

/**
 * Compute per-file hotspot scores from a `MineResult`.
 *
 * The score is a Bayesian-smoothed bug-fix ratio
 * (`bugFixCommits / (totalCommits + prior)`). The smoothing prevents
 * rarely-touched files with one bug-fix from dominating long-lived files.
 *
 * Pure function; no I/O; no `Date.now`.
 *
 * @public
 */
export function computeHotspots(opts: HotspotsOpts): HotspotsReport {
  const prior = opts.prior ?? DEFAULT_HOTSPOT_PRIOR;
  const accumulators = new Map<string, Accumulator>();
  const fileOrder: string[] = [];

  for (const commit of opts.mined.commits) {
    for (const file of commit.filesTouched) {
      const existing = accumulators.get(file);
      if (existing === undefined) {
        accumulators.set(file, {
          total: 1,
          bugfix: commit.isBugFix ? 1 : 0,
          lastBugFixSha: commit.isBugFix ? commit.sha : null,
          lastBugFixAt: commit.isBugFix ? commit.authoredAt : null,
        });
        fileOrder.push(file);
        continue;
      }
      existing.total += 1;
      if (commit.isBugFix) {
        existing.bugfix += 1;
        if (
          existing.lastBugFixAt === null ||
          commit.authoredAt > existing.lastBugFixAt
        ) {
          existing.lastBugFixAt = commit.authoredAt;
          existing.lastBugFixSha = commit.sha;
        }
      }
    }
  }

  const byFile: Record<string, HotspotMetrics> = {};
  for (const file of fileOrder) {
    const acc = accumulators.get(file);
    if (acc === undefined) continue;
    byFile[file] = {
      file,
      totalCommits: acc.total,
      bugFixCommits: acc.bugfix,
      score: acc.bugfix / (acc.total + prior),
      lastBugFixSha: acc.lastBugFixSha,
      lastBugFixAt: acc.lastBugFixAt,
    };
  }

  return {
    byFile,
    files: fileOrder,
    stats: {
      fileCount: fileOrder.length,
      priorUsed: prior,
    },
  };
}
