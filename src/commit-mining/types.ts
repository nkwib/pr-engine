/**
 * Public types for commit-mining.
 *
 * @public
 */

/**
 * A parsed git commit. Producing this shape from a git directory is the
 * caller's job (`apps/worker` uses subprocess git; `@prcompass/cli` uses
 * its LocalAdapter). Core consumes it.
 *
 * @public
 */
export interface CommitRecord {
  readonly sha: string;
  readonly parentSha: string | null;
  readonly message: string;
  /**
   * Git author **name** (`%aN`), not a GitHub login. Free-form display
   * string from the local commit's author identity.
   */
  readonly authorName: string | null;
  /** ISO 8601 author date. */
  readonly authoredAt: string;
  readonly filesTouched: readonly string[];
}

/**
 * Why `mineCommits` classified a commit as a bug-fix.
 *
 * - `subject-prefix`: the message starts with `fix:` / `bug:` / `hotfix:` /
 *   `regression:` / `revert:` (optionally scoped, e.g. `fix(auth):`).
 * - `github-keyword`: the message contains `closes #N` or `resolves #N`.
 * - `custom`: matched a caller-provided detector and neither built-in
 *   pattern.
 *
 * @public
 */
export type BugFixSignal = "subject-prefix" | "github-keyword" | "custom";

/**
 * `CommitRecord` enriched with bug-fix classification.
 *
 * @public
 */
export interface MinedCommit extends CommitRecord {
  readonly isBugFix: boolean;
  readonly bugFixSignal: BugFixSignal | null;
}

/**
 * Bug-fix detector. Pass a regex for simple patterns; pass a predicate
 * for richer logic (e.g. inspecting `filesTouched`).
 *
 * @public
 */
export type BugFixDetector =
  | { readonly kind: "regex"; readonly pattern: RegExp }
  | {
      readonly kind: "function";
      readonly predicate: (commit: CommitRecord) => boolean;
    };

/**
 * Options for `mineCommits`.
 *
 * @public
 */
export interface MineOpts {
  readonly commits: readonly CommitRecord[];
  /**
   * Override the default bug-fix detector. Default: `BUGFIX_REGEX`
   * (subject-prefix or `closes #N` / `resolves #N`).
   */
  readonly bugFixDetector?: BugFixDetector;
}

/**
 * Aggregate stats over the input commits. The string date fields are
 * `null` when there are zero commits rather than an empty string. The
 * numeric counters (`totalCommits`, `bugFixCommits`) are real `0` counts in
 * that case, and `bugFixRatio` is `0` as documented on the field below.
 *
 * @public
 */
export interface MineStats {
  readonly totalCommits: number;
  readonly bugFixCommits: number;
  /**
   * Bug-fix commits divided by total commits, in `[0, 1]`. Defined as `0`
   * for an empty commit list (the `0 / 0` case is reported as `0`, not
   * `NaN` or `null`).
   */
  readonly bugFixRatio: number;
  readonly earliestAuthoredAt: string | null;
  readonly latestAuthoredAt: string | null;
}

/**
 * Result of `mineCommits`.
 *
 * @public
 */
export interface MineResult {
  readonly commits: readonly MinedCommit[];
  readonly stats: MineStats;
}
