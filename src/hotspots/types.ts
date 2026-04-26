import type { MineResult } from "../commit-mining/types.js";

/**
 * Default Bayesian smoothing prior. Score formula:
 * `bugFixCommits / (totalCommits + DEFAULT_HOTSPOT_PRIOR)`. A prior of 5
 * means the engine assumes 5 hypothetical "clean" commits against every
 * file; rarely-touched files don't dominate.
 *
 * @public
 */
export const DEFAULT_HOTSPOT_PRIOR = 5;

/**
 * Per-file hotspot metrics.
 *
 * @public
 */
export interface HotspotMetrics {
  readonly file: string;
  /** Total commits touching this file. ≥ 1 by construction. */
  readonly totalCommits: number;
  /** Subset classified as bug-fix. */
  readonly bugFixCommits: number;
  /**
   * Smoothed bug-fix ratio:
   * `bugFixCommits / (totalCommits + prior)`. In `[0, 1)`. `0` is a real
   * measurement ("we observed no bug-fix commits"), not a missing value.
   */
  readonly score: number;
  /**
   * SHA of the most recent bug-fix commit touching this file, or `null`
   * if no bug-fix commit has touched it.
   */
  readonly lastBugFixSha: string | null;
  /** Authored-at timestamp of the most recent bug-fix touch, or `null`. */
  readonly lastBugFixAt: string | null;
}

/**
 * Options for {@link computeHotspots}.
 *
 * @public
 */
export interface HotspotsOpts {
  readonly mined: MineResult;
  /**
   * Bayesian smoothing prior. Higher values down-weight rarely-touched
   * files. Default {@link DEFAULT_HOTSPOT_PRIOR}.
   */
  readonly prior?: number;
}

/**
 * Aggregate stats.
 *
 * @public
 */
export interface HotspotsStats {
  readonly fileCount: number;
  /** Echo of the prior used (defaulted if unset). */
  readonly priorUsed: number;
}

/**
 * Result of {@link computeHotspots}.
 *
 * @public
 */
export interface HotspotsReport {
  readonly byFile: { readonly [filepath: string]: HotspotMetrics };
  readonly files: readonly string[];
  readonly stats: HotspotsStats;
}
