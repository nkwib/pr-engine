import type { ChurnReport } from "../churn/types.js";
import type { CochangeReport } from "../cochange/types.js";
import type { MineResult } from "../commit-mining/types.js";
import type { HotspotsReport } from "../hotspots/types.js";

/**
 * Default per-metric weights for the combined risk score. Tuned so
 * bug-fix density dominates; coupling and recency are tiebreakers.
 *
 * @public
 */
export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  hotspot: 0.5,
  defectDensity: 0.3,
  couplingDegree: 0.1,
  recencyDays: 0.1,
};

/** @public */
export const DEFAULT_RECENCY_HALF_LIFE_DAYS = 90;

/** @public */
export const DEFAULT_STRONG_COUPLING_JACCARD = 0.3;

/**
 * One numeric signal contributing to a risk score, plus the commit SHAs
 * that grounded it. `value === null` means the signal is unavailable;
 * the metric does NOT default to `0` (no fabrication).
 *
 * @public
 */
export interface RiskMetric<T = number> {
  readonly value: T | null;
  readonly groundedIn: readonly string[];
}

/**
 * Per-component weights for the combined score.
 *
 * @public
 */
export interface RiskWeights {
  readonly hotspot: number;
  readonly defectDensity: number;
  readonly couplingDegree: number;
  readonly recencyDays: number;
}

/**
 * Per-file risk report with each component metric and the combined score.
 *
 * @public
 */
export interface FileRiskReport {
  readonly file: string;
  /**
   * Combined risk score in `[0, 1]`, or `null` when no upstream signal
   * can ground a claim (e.g., the repo has zero bug-fix commits).
   */
  readonly score: number | null;
  readonly hotspot: RiskMetric;
  readonly defectDensity: RiskMetric;
  readonly couplingDegree: RiskMetric<number>;
  readonly recencyDays: RiskMetric;
  /** Human-readable reasons the score may be misleading. */
  readonly caveats: readonly string[];
}

/**
 * Options for {@link computeRisk}.
 *
 * @public
 */
export interface RiskOpts {
  readonly mined: MineResult;
  readonly hotspots: HotspotsReport;
  readonly churn: ChurnReport;
  readonly cochange: CochangeReport;
  /** Override default weights. Missing fields default to {@link DEFAULT_RISK_WEIGHTS}. */
  readonly weights?: Partial<RiskWeights>;
  /**
   * ISO 8601 reference instant for recency. Defaults to
   * `mined.stats.latestAuthoredAt`. Never `Date.now()`.
   */
  readonly now?: string;
  /** Recency half-life in days. Default {@link DEFAULT_RECENCY_HALF_LIFE_DAYS}. */
  readonly recencyHalfLifeDays?: number;
  /**
   * Jaccard threshold above which a cochange neighbor is "strong" and
   * counted toward couplingDegree. Default {@link DEFAULT_STRONG_COUPLING_JACCARD}.
   */
  readonly strongCouplingJaccard?: number;
}

/** @public */
export interface RiskStats {
  readonly fileCount: number;
  readonly filesWithScore: number;
  readonly meanScore: number | null;
  readonly weightsUsed: RiskWeights;
}

/**
 * Result of {@link computeRisk}.
 *
 * @public
 */
export interface RiskReport {
  readonly byFile: { readonly [filepath: string]: FileRiskReport };
  readonly files: readonly string[];
  readonly stats: RiskStats;
}
