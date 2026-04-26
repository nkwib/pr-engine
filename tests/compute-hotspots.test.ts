import { describe, expect, it } from "vitest";
import { computeHotspots, DEFAULT_HOTSPOT_PRIOR } from "../src/hotspots/index.js";
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

describe("computeHotspots — empty input", () => {
  it("empty commits → empty report", () => {
    const r = computeHotspots({ mined: mineCommits({ commits: [] }) });
    expect(r.byFile).toEqual({});
    expect(r.files).toEqual([]);
    expect(r.stats.fileCount).toBe(0);
    expect(r.stats.priorUsed).toBe(DEFAULT_HOTSPOT_PRIOR);
  });
});

describe("computeHotspots — counts and score", () => {
  it("counts total vs bug-fix touches per file", () => {
    const mined = mineCommits({
      commits: [
        commit({
          sha: "a",
          message: "fix: x",
          authoredAt: "2026-02-01T00:00:00Z",
          filesTouched: ["src/auth.ts", "src/db.ts"],
        }),
        commit({
          sha: "b",
          message: "feat: y",
          filesTouched: ["src/auth.ts"],
        }),
        commit({
          sha: "c",
          message: "fix: z",
          authoredAt: "2026-03-01T00:00:00Z",
          filesTouched: ["src/auth.ts"],
        }),
        commit({
          sha: "d",
          message: "chore: w",
          filesTouched: ["src/db.ts", "src/api.ts"],
        }),
      ],
    });
    const r = computeHotspots({ mined });
    expect(r.byFile["src/auth.ts"]?.totalCommits).toBe(3);
    expect(r.byFile["src/auth.ts"]?.bugFixCommits).toBe(2);
    expect(r.byFile["src/db.ts"]?.totalCommits).toBe(2);
    expect(r.byFile["src/db.ts"]?.bugFixCommits).toBe(1);
    expect(r.byFile["src/api.ts"]?.totalCommits).toBe(1);
    expect(r.byFile["src/api.ts"]?.bugFixCommits).toBe(0);
  });

  it("score = bugFixCommits / (totalCommits + prior) — Bayesian smoothing", () => {
    const mined = mineCommits({
      commits: [
        commit({
          sha: "a",
          message: "fix: 1",
          filesTouched: ["hot.ts"],
        }),
        commit({
          sha: "b",
          message: "fix: 2",
          filesTouched: ["hot.ts"],
        }),
        commit({
          sha: "c",
          message: "feat: x",
          filesTouched: ["cold.ts"],
        }),
      ],
    });
    const r = computeHotspots({ mined });
    // hot: 2 / (2 + 5) = 2/7
    expect(r.byFile["hot.ts"]?.score).toBeCloseTo(2 / 7, 10);
    // cold: 0 / (1 + 5) = 0 — real measurement, smoothing keeps it at 0.
    expect(r.byFile["cold.ts"]?.score).toBe(0);
    // Prior smoothing keeps a 100%-bug-fix file under 1.
    expect(r.byFile["hot.ts"]?.score).toBeLessThan(1);
  });

  it("custom prior is honoured and echoed in stats", () => {
    const mined = mineCommits({
      commits: [commit({ sha: "a", message: "fix: x", filesTouched: ["a.ts"] })],
    });
    const r = computeHotspots({ mined, prior: 0 });
    expect(r.byFile["a.ts"]?.score).toBe(1); // 1 / (1 + 0)
    expect(r.stats.priorUsed).toBe(0);
  });
});

describe("computeHotspots — last-bug-fix tracking", () => {
  it("lastBugFix{Sha,At} track the most recent bug-fix commit", () => {
    const mined = mineCommits({
      commits: [
        commit({
          sha: "old",
          message: "fix: 1",
          authoredAt: "2026-01-01T00:00:00Z",
          filesTouched: ["f.ts"],
        }),
        commit({
          sha: "new",
          message: "fix: 2",
          authoredAt: "2026-06-01T00:00:00Z",
          filesTouched: ["f.ts"],
        }),
        commit({
          sha: "mid",
          message: "fix: 3",
          authoredAt: "2026-03-01T00:00:00Z",
          filesTouched: ["f.ts"],
        }),
      ],
    });
    const m = computeHotspots({ mined }).byFile["f.ts"];
    expect(m?.lastBugFixSha).toBe("new");
    expect(m?.lastBugFixAt).toBe("2026-06-01T00:00:00Z");
  });

  it("non-bug-fix touches do not populate lastBugFix*", () => {
    const mined = mineCommits({
      commits: [
        commit({
          sha: "only",
          message: "feat: x",
          authoredAt: "2026-06-01T00:00:00Z",
          filesTouched: ["f.ts"],
        }),
      ],
    });
    const m = computeHotspots({ mined }).byFile["f.ts"];
    expect(m?.lastBugFixSha).toBeNull();
    expect(m?.lastBugFixAt).toBeNull();
  });
});

describe("computeHotspots — JSON cleanness + determinism", () => {
  it("output round-trips through JSON", () => {
    const mined = mineCommits({
      commits: [commit({ sha: "a", message: "fix: x", filesTouched: ["a.ts"] })],
    });
    const r = computeHotspots({ mined });
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  it("identical input produces identical output across 10 runs", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", message: "fix: 1", filesTouched: ["a", "b"] }),
        commit({ sha: "2", message: "feat: 2", filesTouched: ["b", "c"] }),
      ],
    });
    const first = JSON.stringify(computeHotspots({ mined }));
    for (let i = 0; i < 9; i += 1) {
      expect(JSON.stringify(computeHotspots({ mined }))).toBe(first);
    }
  });
});
