import type { CommitRecord } from "../commit-mining/types.js";

/**
 * Status of a file in a diff. Mirrors the GitHub diff vocabulary.
 *
 * @public
 */
export type DiffStatus = "added" | "modified" | "removed" | "renamed" | "copied";

/**
 * One file changed in a PR diff.
 *
 * @public
 */
export interface DiffFile {
  readonly path: string;
  /** Previous path for renames/copies; `null` otherwise. */
  readonly previousPath: string | null;
  readonly status: DiffStatus;
  readonly additions: number;
  readonly deletions: number;
  /**
   * Unified diff patch text. `null` when the file is binary, too large,
   * or the adapter chose not to fetch it.
   */
  readonly patch: string | null;
}

/**
 * The diff portion of an {@link AnalyzeContext}.
 *
 * @public
 */
export interface AnalyzeContextDiff {
  readonly baseSha: string;
  readonly headSha: string;
  readonly files: readonly DiffFile[];
}

/**
 * Pull-request metadata, when the adapter can supply it. `null` for
 * anonymous local diffs.
 *
 * @public
 */
export interface AnalyzeContextPR {
  readonly title: string | null;
  readonly body: string | null;
  readonly number: number | null;
  readonly authorLogin: string | null;
}

/**
 * The uniform analysis context produced by every adapter. Engines
 * consume this; they never see the adapter directly.
 *
 * @public
 */
export interface AnalyzeContext {
  readonly commits: readonly CommitRecord[];
  readonly diff: AnalyzeContextDiff;
  readonly pr: AnalyzeContextPR | null;
}

/**
 * The provider adapter contract. Implementations live outside core
 * (LocalAdapter and GitHubAdapter ship with `@prcompass/cli`) so that
 * core remains free of subprocess and network I/O.
 *
 * @public
 */
export interface ProviderAdapter {
  /** Short identifier for diagnostics. e.g. "local", "github". */
  readonly name: string;
  /**
   * Produce an {@link AnalyzeContext}. Adapters may perform network or
   * subprocess I/O here; callers should treat this as a side-effecting,
   * potentially expensive operation.
   */
  collect(): Promise<AnalyzeContext>;
}
