import type { BugFixSignal } from "./types.js";

/**
 * Bug-fix commit regex, canonical version — matches if ANY of:
 *   - subject begins with `fix:` / `bug:` / `hotfix:` / `regression:` / `revert:`
 *     (optionally scoped: `fix(auth):`, `bug(ui/modal):`)
 *   - message contains `closes #<n>` or `close #<n>`
 *   - message contains `resolves #<n>` or `resolve #<n>`
 *
 * Multiline (`/m`) so it matches subject-line patterns AND body-line
 * patterns. Case-insensitive (`/i`).
 *
 * Intentionally not matching `fixes #<n>` as a subject prefix — the
 * GitHub keyword list uses bare `fix / fixes / close / closed / closes /
 * resolve / resolves / resolved`. We match the most common variants.
 *
 * @public
 */
export const BUGFIX_REGEX =
  /^(fix|bug|hotfix|regression|revert)(\(.+\))?:|closes?\s+#\d+|resolves?\s+#\d+/im;

/** Subject-prefix sub-pattern, used for signal attribution. */
const SUBJECT_PREFIX_PATTERN = /^(fix|bug|hotfix|regression|revert)(\(.+\))?:/im;

/** GitHub-keyword sub-pattern, used for signal attribution. */
const GITHUB_KEYWORD_PATTERN = /(closes?|resolves?)\s+#\d+/im;

/**
 * Classify a commit message against the default heuristic.
 *
 * Returns `true` when {@link BUGFIX_REGEX} matches.
 *
 * @public
 */
export function isBugFixCommit(message: string): boolean {
  return BUGFIX_REGEX.test(message);
}

/**
 * Filter a list of commit-shaped objects to only those whose `message`
 * matches {@link BUGFIX_REGEX}.
 *
 * @public
 */
export function filterBugFixCommits<T extends { message: string }>(
  commits: readonly T[],
): readonly T[] {
  return commits.filter((c) => isBugFixCommit(c.message));
}

/**
 * Infer the signal source for a message that is already known to be a
 * bug-fix. Used by `mineCommits`. Subject-prefix wins over keyword
 * when both are present (it's the more authoritative signal).
 *
 * @internal
 */
export function inferBugFixSignal(message: string): BugFixSignal {
  if (SUBJECT_PREFIX_PATTERN.test(message)) return "subject-prefix";
  if (GITHUB_KEYWORD_PATTERN.test(message)) return "github-keyword";
  return "custom";
}
