import { BUGFIX_REGEX, inferBugFixSignal } from "./bugfix.js";
import type {
  BugFixDetector,
  BugFixSignal,
  CommitRecord,
  MinedCommit,
  MineOpts,
  MineResult,
  MineStats,
} from "./types.js";

const DEFAULT_DETECTOR: BugFixDetector = {
  kind: "regex",
  pattern: BUGFIX_REGEX,
};

interface Classification {
  readonly isBugFix: boolean;
  readonly signal: BugFixSignal | null;
}

function testPattern(pattern: RegExp, message: string): boolean {
  // Stateful regex flags (`g`, `y`) advance `lastIndex` between calls,
  // which would cause `.test()` to skip matches on subsequent commits.
  // Reset the index defensively before each call so callers can pass any
  // RegExp (including ones with `g`) without surprising behaviour.
  if (pattern.global || pattern.sticky) {
    pattern.lastIndex = 0;
  }
  return pattern.test(message);
}

function classify(commit: CommitRecord, detector: BugFixDetector): Classification {
  const matched =
    detector.kind === "regex"
      ? testPattern(detector.pattern, commit.message)
      : detector.predicate(commit);
  if (!matched) return { isBugFix: false, signal: null };
  return { isBugFix: true, signal: inferBugFixSignal(commit.message) };
}

function computeStats(minedCommits: readonly MinedCommit[]): MineStats {
  const total = minedCommits.length;
  let bugFixCount = 0;
  let earliest: string | null = null;
  let latest: string | null = null;
  for (const c of minedCommits) {
    if (c.isBugFix) bugFixCount += 1;
    if (earliest === null || c.authoredAt < earliest) earliest = c.authoredAt;
    if (latest === null || c.authoredAt > latest) latest = c.authoredAt;
  }
  return {
    totalCommits: total,
    bugFixCommits: bugFixCount,
    bugFixRatio: total === 0 ? 0 : bugFixCount / total,
    earliestAuthoredAt: earliest,
    latestAuthoredAt: latest,
  };
}

/**
 * Classify a list of commits as bug-fix vs not, attaching a signal that
 * explains why. The output preserves the input order.
 *
 * Pure function: same input → same output, bit-for-bit. No I/O.
 *
 * @public
 */
export function mineCommits(opts: MineOpts): MineResult {
  const detector = opts.bugFixDetector ?? DEFAULT_DETECTOR;
  const minedCommits: MinedCommit[] = opts.commits.map((c) => {
    const { isBugFix, signal } = classify(c, detector);
    return { ...c, isBugFix, bugFixSignal: signal };
  });
  return {
    commits: minedCommits,
    stats: computeStats(minedCommits),
  };
}
