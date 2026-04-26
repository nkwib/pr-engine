import { describe, expect, it } from "vitest";
import {
  BUGFIX_REGEX,
  filterBugFixCommits,
  isBugFixCommit,
} from "../src/commit-mining/bugfix.js";

describe("isBugFixCommit — matches", () => {
  const matches = [
    "fix: off-by-one in tax calc",
    "Fix: panic on empty cart",
    "FIX: regression from #321",
    "fix(auth): null check on session cookie",
    "bug: trailing whitespace in header parser",
    "bug(ui/modal): dialog z-index",
    "hotfix: revert migration 0042",
    "regression: broken CI after node bump",
    'revert: "feat: add cohort field"',
    "Refactor auth layer\n\nCloses #42",
    "refactor: move helpers\n\ncloses #123",
    "Some change\n\nResolves #7",
    "Some change\n\nresolve #7", // singular "resolve"
    "Unrelated subject\n\nclose #99",
  ];
  for (const msg of matches) {
    it(`matches: ${JSON.stringify(msg.slice(0, 40))}`, () => {
      expect(isBugFixCommit(msg)).toBe(true);
    });
  }
});

describe("isBugFixCommit — does not match", () => {
  const nonMatches = [
    "feat: add coupon support",
    "chore: bump deps",
    "docs: update README",
    "refactor: rename helpers",
    "test: add fixtures",
    "Merge pull request #42 from acme/topic",
    "Add fix button UI (not starting with 'fix:')",
    "", // empty
    "This is a long commit that mentions #42 but not via closes/resolves",
  ];
  for (const msg of nonMatches) {
    it(`skips: ${JSON.stringify(msg.slice(0, 40))}`, () => {
      expect(isBugFixCommit(msg)).toBe(false);
    });
  }
});

describe("filterBugFixCommits", () => {
  it("preserves order and keeps only bug-fix commits", () => {
    const commits = [
      { sha: "a", message: "feat: new endpoint" },
      { sha: "b", message: "fix: crash on startup" },
      { sha: "c", message: "chore: lint" },
      { sha: "d", message: "Unrelated\n\ncloses #7" },
    ];
    const filtered = filterBugFixCommits(commits);
    expect(filtered.map((c) => c.sha)).toEqual(["b", "d"]);
  });
});

describe("BUGFIX_REGEX — flags", () => {
  it("is case-insensitive and multiline", () => {
    expect(BUGFIX_REGEX.flags).toContain("i");
    expect(BUGFIX_REGEX.flags).toContain("m");
  });
});
