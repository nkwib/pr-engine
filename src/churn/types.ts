import type { MineResult } from "../commit-mining/types.js";

/**
 * Per-file churn metrics. A file appears in {@link ChurnReport.byFile}
 * only if at least one commit in the input touched it; therefore every
 * field is always defined for any file present in the report.
 *
 * @public
 */
export interface ChurnMetrics {
  /**
   * Total commits whose `filesTouched` includes this path. ≥ 1 by
   * construction (the file would not be in `byFile` otherwise).
   */
  readonly commitCount: number;
  /**
   * Subset of `commitCount` classified as bug-fix (per `MinedCommit.isBugFix`).
   * `0` is a legitimate observation, not a missing value.
   */
  readonly bugFixCount: number;
  /**
   * `bugFixCount / commitCount`, in `[0, 1]`. Never `null`: by construction
   * `commitCount ≥ 1`, so the ratio is always a real fraction. `0` here
   * means "this file was touched but never by a bug-fix commit"; that is
   * a real measurement, not a fabrication.
   */
  readonly defectDensity: number;
  /** ISO 8601 of the earliest commit touching this file. */
  readonly firstTouchedAt: string;
  /** ISO 8601 of the latest commit touching this file. */
  readonly lastTouchedAt: string;
}

/**
 * Options for {@link computeChurn}.
 *
 * @public
 */
export interface ChurnOpts {
  readonly mined: MineResult;
}

/**
 * Aggregate churn over a `MineResult`.
 *
 * @public
 */
export interface ChurnReport {
  /**
   * Per-file metrics, keyed by filepath. Iteration order matches
   * {@link ChurnReport.files}.
   */
  readonly byFile: { readonly [filepath: string]: ChurnMetrics };
  /**
   * All filepaths in first-seen order across `mined.commits`.
   * `[...Object.keys(byFile)]` returns the same order in V8.
   */
  readonly files: readonly string[];
  readonly stats: ChurnStats;
}

/** @public */
export interface ChurnStats {
  readonly fileCount: number;
  /** Sum of all per-file `commitCount`. */
  readonly totalTouches: number;
}
