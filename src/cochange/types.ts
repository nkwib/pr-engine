import type { MineResult } from "../commit-mining/types.js";

/**
 * One edge of the cochange graph: a co-changed neighbor of some file.
 *
 * @public
 */
export interface CochangeEdge {
  /** The neighbor's filepath. */
  readonly file: string;
  /**
   * Number of commits in `mined` (post-mass-refactor-filter) whose
   * `filesTouched` includes both this neighbor and the parent node.
   * `≥ minCochangeCount` (otherwise the edge is dropped).
   */
  readonly cochangeCount: number;
  /**
   * Jaccard similarity in `[0, 1]`:
   * `cochangeCount / (commitCount(parent) + commitCount(neighbor) - cochangeCount)`.
   * Normalised so frequent files don't always dominate.
   */
  readonly jaccard: number;
}

/**
 * One node of the cochange graph: a file plus its sorted neighbor list.
 *
 * @public
 */
export interface CochangeNode {
  readonly file: string;
  /**
   * Total commits (post-mass-refactor-filter) whose `filesTouched`
   * included this file. May differ from `ChurnMetrics.commitCount`
   * when the filter dropped some commits — by design.
   */
  readonly commitCount: number;
  /**
   * Edges sorted by `cochangeCount` desc, ties broken by `jaccard` desc,
   * then by `file` asc. Deterministic.
   */
  readonly neighbors: readonly CochangeEdge[];
}

/**
 * Options for {@link computeCochange}.
 *
 * @public
 */
export interface CochangeOpts {
  readonly mined: MineResult;
  /**
   * Skip commits touching more than this many files. Mass-refactor
   * commits ("rename foo to bar across 2k files") create spurious
   * uniform co-change weight that drowns the real signal. Default `50`.
   */
  readonly maxFilesPerCommit?: number;
  /**
   * Drop edges with `cochangeCount` below this. A pair that co-changed
   * exactly once is barely a signal. Default `2`.
   */
  readonly minCochangeCount?: number;
}

/**
 * Aggregate stats for the report.
 *
 * @public
 */
export interface CochangeStats {
  readonly nodeCount: number;
  /** Total directed edges across all nodes (each pair counted twice). */
  readonly edgeCount: number;
  readonly skippedMassRefactorCommits: number;
  /** Echo of the option used (default 50 if unset). */
  readonly maxFilesPerCommit: number;
  /** Echo of the option used (default 2 if unset). */
  readonly minCochangeCount: number;
}

/**
 * Result of {@link computeCochange}.
 *
 * @public
 */
export interface CochangeReport {
  readonly nodes: { readonly [filepath: string]: CochangeNode };
  /**
   * All filepaths in first-seen-in-input order. Equals
   * `Object.keys(nodes)` in V8.
   */
  readonly files: readonly string[];
  readonly stats: CochangeStats;
}
