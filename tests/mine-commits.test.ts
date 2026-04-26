import { describe, expect, it } from "vitest";
import { mineCommits } from "../src/commit-mining/mine-commits.js";
import type { CommitRecord } from "../src/commit-mining/types.js";

function commit(overrides: Partial<CommitRecord>): CommitRecord {
  return {
    sha: "abc",
    parentSha: null,
    message: "feat: thing",
    authorLogin: "alice",
    authoredAt: "2026-04-01T00:00:00Z",
    filesTouched: [],
    ...overrides,
  };
}

describe("mineCommits — default detector", () => {
  it("returns empty result for empty input", () => {
    const r = mineCommits({ commits: [] });
    expect(r.commits).toEqual([]);
    expect(r.stats).toEqual({
      totalCommits: 0,
      bugFixCommits: 0,
      bugFixRatio: 0,
      earliestAuthoredAt: null,
      latestAuthoredAt: null,
    });
  });

  it("classifies subject-prefix matches with signal=subject-prefix", () => {
    const r = mineCommits({
      commits: [commit({ sha: "a", message: "fix: crash" })],
    });
    expect(r.commits[0]?.isBugFix).toBe(true);
    expect(r.commits[0]?.bugFixSignal).toBe("subject-prefix");
  });

  it("classifies github-keyword matches with signal=github-keyword", () => {
    const r = mineCommits({
      commits: [commit({ sha: "a", message: "Refactor stuff\n\nCloses #42" })],
    });
    expect(r.commits[0]?.isBugFix).toBe(true);
    expect(r.commits[0]?.bugFixSignal).toBe("github-keyword");
  });

  it("subject-prefix wins over keyword when both are present", () => {
    const r = mineCommits({
      commits: [commit({ message: "fix: thing\n\nCloses #1" })],
    });
    expect(r.commits[0]?.bugFixSignal).toBe("subject-prefix");
  });

  it("classifies non-bug-fix commits with isBugFix=false and signal=null", () => {
    const r = mineCommits({
      commits: [commit({ sha: "a", message: "feat: new endpoint" })],
    });
    expect(r.commits[0]?.isBugFix).toBe(false);
    expect(r.commits[0]?.bugFixSignal).toBeNull();
  });

  it("preserves all CommitRecord fields on MinedCommit", () => {
    const input = commit({
      sha: "a",
      parentSha: "p",
      message: "fix: x",
      authorLogin: "bob",
      authoredAt: "2026-01-01T00:00:00Z",
      filesTouched: ["src/x.ts"],
    });
    const r = mineCommits({ commits: [input] });
    const m = r.commits[0]!;
    expect(m.sha).toBe("a");
    expect(m.parentSha).toBe("p");
    expect(m.authorLogin).toBe("bob");
    expect(m.authoredAt).toBe("2026-01-01T00:00:00Z");
    expect(m.filesTouched).toEqual(["src/x.ts"]);
  });

  it("preserves input order", () => {
    const r = mineCommits({
      commits: [
        commit({ sha: "a", message: "feat: 1" }),
        commit({ sha: "b", message: "fix: 2" }),
        commit({ sha: "c", message: "chore: 3" }),
      ],
    });
    expect(r.commits.map((c) => c.sha)).toEqual(["a", "b", "c"]);
  });
});

describe("mineCommits — custom regex detector", () => {
  it("uses the supplied regex instead of the default", () => {
    const r = mineCommits({
      commits: [
        commit({ sha: "a", message: "feat: thing" }),
        commit({ sha: "b", message: "WORKAROUND: thing" }),
      ],
      bugFixDetector: { kind: "regex", pattern: /WORKAROUND/ },
    });
    expect(r.commits.find((c) => c.sha === "a")?.isBugFix).toBe(false);
    expect(r.commits.find((c) => c.sha === "b")?.isBugFix).toBe(true);
  });

  it("emits signal=custom when neither built-in pattern matches", () => {
    const r = mineCommits({
      commits: [commit({ sha: "a", message: "WORKAROUND: thing" })],
      bugFixDetector: { kind: "regex", pattern: /WORKAROUND/ },
    });
    expect(r.commits[0]?.bugFixSignal).toBe("custom");
  });

  it("still emits subject-prefix when the custom regex matches a fix-prefixed commit", () => {
    // A custom regex can be a superset; the signal comes from the
    // message, not the detector.
    const r = mineCommits({
      commits: [commit({ message: "fix: thing" })],
      bugFixDetector: { kind: "regex", pattern: /./ },
    });
    expect(r.commits[0]?.bugFixSignal).toBe("subject-prefix");
  });
});

describe("mineCommits — predicate detector", () => {
  it("uses the supplied predicate", () => {
    const r = mineCommits({
      commits: [
        commit({ sha: "a", filesTouched: ["src/safe.ts"] }),
        commit({ sha: "b", filesTouched: ["src/critical.ts"] }),
      ],
      bugFixDetector: {
        kind: "function",
        predicate: (c) => c.filesTouched.includes("src/critical.ts"),
      },
    });
    expect(r.commits.find((c) => c.sha === "a")?.isBugFix).toBe(false);
    expect(r.commits.find((c) => c.sha === "b")?.isBugFix).toBe(true);
  });

  it("emits signal=custom when predicate matches but message has no built-in pattern", () => {
    const r = mineCommits({
      commits: [commit({ message: "feat: x" })],
      bugFixDetector: { kind: "function", predicate: () => true },
    });
    expect(r.commits[0]?.bugFixSignal).toBe("custom");
  });
});

describe("mineCommits — stats", () => {
  it("computes counts and ratio correctly", () => {
    const r = mineCommits({
      commits: [
        commit({ sha: "a", message: "fix: 1" }),
        commit({ sha: "b", message: "fix: 2" }),
        commit({ sha: "c", message: "feat: 3" }),
        commit({ sha: "d", message: "chore: 4" }),
      ],
    });
    expect(r.stats.totalCommits).toBe(4);
    expect(r.stats.bugFixCommits).toBe(2);
    expect(r.stats.bugFixRatio).toBe(0.5);
  });

  it("computes earliest and latest authoredAt", () => {
    const r = mineCommits({
      commits: [
        commit({ authoredAt: "2026-04-01T00:00:00Z" }),
        commit({ authoredAt: "2026-01-01T00:00:00Z" }),
        commit({ authoredAt: "2026-06-01T00:00:00Z" }),
      ],
    });
    expect(r.stats.earliestAuthoredAt).toBe("2026-01-01T00:00:00Z");
    expect(r.stats.latestAuthoredAt).toBe("2026-06-01T00:00:00Z");
  });

  it("returns null timestamps when there are no commits (no fabrication)", () => {
    const r = mineCommits({ commits: [] });
    expect(r.stats.earliestAuthoredAt).toBeNull();
    expect(r.stats.latestAuthoredAt).toBeNull();
  });

  it("ratio is exactly 0 (not NaN) when totalCommits is 0", () => {
    const r = mineCommits({ commits: [] });
    expect(r.stats.bugFixRatio).toBe(0);
    expect(Number.isNaN(r.stats.bugFixRatio)).toBe(false);
  });
});

describe("mineCommits — determinism", () => {
  it("produces identical output across runs", () => {
    const inputs: CommitRecord[] = [
      commit({ sha: "a", message: "fix: 1" }),
      commit({ sha: "b", message: "feat: 2" }),
      commit({ sha: "c", message: "Refactor\n\nCloses #1" }),
    ];
    const first = JSON.stringify(mineCommits({ commits: inputs }));
    for (let i = 0; i < 9; i += 1) {
      const next = JSON.stringify(mineCommits({ commits: inputs }));
      expect(next).toBe(first);
    }
  });

  it("does not mutate the input commits", () => {
    const inputs: CommitRecord[] = [
      commit({ sha: "a", message: "fix: 1", filesTouched: ["x.ts"] }),
    ];
    const beforeKeys = Object.keys(inputs[0]!);
    mineCommits({ commits: inputs });
    expect(Object.keys(inputs[0]!)).toEqual(beforeKeys);
    expect("isBugFix" in inputs[0]!).toBe(false);
  });
});
