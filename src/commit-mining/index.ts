/**
 * Commit-mining surface.
 *
 * @packageDocumentation
 */

export type {
  BugFixDetector,
  BugFixSignal,
  CommitRecord,
  MinedCommit,
  MineOpts,
  MineResult,
  MineStats,
} from "./types.js";

export { BUGFIX_REGEX, filterBugFixCommits, isBugFixCommit } from "./bugfix.js";

export { parseCommitFiles, parseCommitMetadata } from "./parse-git-log.js";

export { mineCommits } from "./mine-commits.js";
