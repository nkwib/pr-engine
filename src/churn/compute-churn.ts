import type { ChurnMetrics, ChurnOpts, ChurnReport } from "./types.js";

interface Accumulator {
  commitCount: number;
  bugFixCount: number;
  firstTouchedAt: string;
  lastTouchedAt: string;
}

/**
 * Compute per-file churn metrics from a `MineResult`.
 *
 * The function iterates each `MinedCommit` once, accumulating per-file
 * counts and timestamp bounds. Output preserves the first-seen-in-input
 * order of files, which is deterministic given the same input.
 *
 * Pure function: no I/O, no `Date.now`, no mutation of inputs.
 *
 * @public
 */
export function computeChurn(opts: ChurnOpts): ChurnReport {
  const accumulators = new Map<string, Accumulator>();
  const fileOrder: string[] = [];

  for (const commit of opts.mined.commits) {
    for (const file of commit.filesTouched) {
      const existing = accumulators.get(file);
      if (existing === undefined) {
        accumulators.set(file, {
          commitCount: 1,
          bugFixCount: commit.isBugFix ? 1 : 0,
          firstTouchedAt: commit.authoredAt,
          lastTouchedAt: commit.authoredAt,
        });
        fileOrder.push(file);
        continue;
      }
      existing.commitCount += 1;
      if (commit.isBugFix) existing.bugFixCount += 1;
      if (commit.authoredAt < existing.firstTouchedAt) {
        existing.firstTouchedAt = commit.authoredAt;
      }
      if (commit.authoredAt > existing.lastTouchedAt) {
        existing.lastTouchedAt = commit.authoredAt;
      }
    }
  }

  const byFile: Record<string, ChurnMetrics> = {};
  let totalTouches = 0;
  for (const file of fileOrder) {
    const acc = accumulators.get(file);
    // Defensive: cannot happen given fileOrder is populated only when
    // we set the accumulator. Branch is unreachable but typed for
    // strict noUncheckedIndexedAccess compliance.
    if (acc === undefined) continue;
    byFile[file] = {
      commitCount: acc.commitCount,
      bugFixCount: acc.bugFixCount,
      defectDensity: acc.bugFixCount / acc.commitCount,
      firstTouchedAt: acc.firstTouchedAt,
      lastTouchedAt: acc.lastTouchedAt,
    };
    totalTouches += acc.commitCount;
  }

  return {
    byFile,
    files: fileOrder,
    stats: {
      fileCount: fileOrder.length,
      totalTouches,
    },
  };
}
