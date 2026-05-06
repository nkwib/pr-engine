import { describe, expect, it } from "vitest";
import { computeChurn } from "../src/churn/compute-churn.js";
import { mineCommits } from "../src/commit-mining/mine-commits.js";
import type { CommitRecord } from "../src/commit-mining/types.js";

function commit(overrides: Partial<CommitRecord>): CommitRecord {
  return {
    sha: "abc",
    parentSha: null,
    message: "feat: thing",
    authorName: "alice",
    authoredAt: "2026-04-01T00:00:00Z",
    filesTouched: [],
    ...overrides,
  };
}

describe("computeChurn — empty input", () => {
  it("returns empty report when there are no commits", () => {
    const r = computeChurn({ mined: mineCommits({ commits: [] }) });
    expect(r.byFile).toEqual({});
    expect(r.files).toEqual([]);
    expect(r.stats).toEqual({ fileCount: 0, totalTouches: 0 });
  });

  it("returns empty report when commits exist but touch zero files", () => {
    const mined = mineCommits({
      commits: [commit({ sha: "a", filesTouched: [] })],
    });
    const r = computeChurn({ mined });
    expect(r.byFile).toEqual({});
    expect(r.stats.fileCount).toBe(0);
  });
});

describe("computeChurn — counts and density", () => {
  it("single commit, single file", () => {
    const mined = mineCommits({
      commits: [
        commit({
          sha: "a",
          message: "fix: bug",
          authoredAt: "2026-04-01T10:00:00Z",
          filesTouched: ["src/a.ts"],
        }),
      ],
    });
    const r = computeChurn({ mined });
    expect(r.byFile["src/a.ts"]).toEqual({
      commitCount: 1,
      bugFixCount: 1,
      defectDensity: 1,
      firstTouchedAt: "2026-04-01T10:00:00Z",
      lastTouchedAt: "2026-04-01T10:00:00Z",
    });
  });

  it("counts bug-fix vs non-bug-fix per file", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "a", message: "feat: x", filesTouched: ["a.ts"] }),
        commit({ sha: "b", message: "fix: y", filesTouched: ["a.ts"] }),
        commit({
          sha: "c",
          message: "chore: z",
          filesTouched: ["a.ts"],
        }),
        commit({
          sha: "d",
          message: "fix: w",
          filesTouched: ["a.ts"],
        }),
      ],
    });
    const m = computeChurn({ mined }).byFile["a.ts"];
    expect(m?.commitCount).toBe(4);
    expect(m?.bugFixCount).toBe(2);
    expect(m?.defectDensity).toBe(0.5);
  });

  it("defectDensity is 0 (real measurement) when file has commits but no bug-fixes", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "a", message: "feat: x", filesTouched: ["a.ts"] }),
        commit({ sha: "b", message: "chore: y", filesTouched: ["a.ts"] }),
      ],
    });
    const m = computeChurn({ mined }).byFile["a.ts"];
    expect(m?.bugFixCount).toBe(0);
    expect(m?.defectDensity).toBe(0);
  });

  it("computes earliest and latest touched per file", () => {
    const mined = mineCommits({
      commits: [
        commit({
          sha: "a",
          authoredAt: "2026-04-01T00:00:00Z",
          filesTouched: ["x.ts"],
        }),
        commit({
          sha: "b",
          authoredAt: "2026-01-01T00:00:00Z",
          filesTouched: ["x.ts"],
        }),
        commit({
          sha: "c",
          authoredAt: "2026-06-01T00:00:00Z",
          filesTouched: ["x.ts"],
        }),
      ],
    });
    const m = computeChurn({ mined }).byFile["x.ts"];
    expect(m?.firstTouchedAt).toBe("2026-01-01T00:00:00Z");
    expect(m?.lastTouchedAt).toBe("2026-06-01T00:00:00Z");
  });
});

describe("computeChurn — multiple files", () => {
  it("reports counts independently per file", () => {
    const mined = mineCommits({
      commits: [
        commit({
          sha: "a",
          message: "fix: 1",
          filesTouched: ["a.ts", "b.ts"],
        }),
        commit({
          sha: "b",
          message: "feat: 2",
          filesTouched: ["b.ts"],
        }),
      ],
    });
    const r = computeChurn({ mined });
    expect(r.byFile["a.ts"]?.commitCount).toBe(1);
    expect(r.byFile["a.ts"]?.bugFixCount).toBe(1);
    expect(r.byFile["b.ts"]?.commitCount).toBe(2);
    expect(r.byFile["b.ts"]?.bugFixCount).toBe(1);
  });

  it("preserves first-seen-in-input order in `files`", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", filesTouched: ["c.ts", "a.ts"] }),
        commit({ sha: "2", filesTouched: ["b.ts", "a.ts"] }),
      ],
    });
    expect(computeChurn({ mined }).files).toEqual(["c.ts", "a.ts", "b.ts"]);
  });

  it("totalTouches sums all per-file commit counts", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "a", filesTouched: ["x.ts", "y.ts"] }),
        commit({ sha: "b", filesTouched: ["x.ts"] }),
      ],
    });
    expect(computeChurn({ mined }).stats.totalTouches).toBe(3);
  });

  it("rename = two paths in one commit's filesTouched: each tracked separately (Q-C C1)", () => {
    const mined = mineCommits({
      commits: [
        commit({
          sha: "a",
          filesTouched: ["src/old.ts", "src/new.ts"],
        }),
      ],
    });
    const r = computeChurn({ mined });
    expect(r.byFile["src/old.ts"]?.commitCount).toBe(1);
    expect(r.byFile["src/new.ts"]?.commitCount).toBe(1);
    // No fold; user does that if they want.
    expect(r.stats.fileCount).toBe(2);
  });
});

describe("computeChurn — JSON cleanness", () => {
  it("output round-trips through JSON.stringify/parse", () => {
    const mined = mineCommits({
      commits: [
        commit({
          sha: "a",
          message: "fix: 1",
          filesTouched: ["a.ts", "b.ts"],
        }),
      ],
    });
    const r = computeChurn({ mined });
    const round = JSON.parse(JSON.stringify(r)) as typeof r;
    expect(round).toEqual(r);
  });

  it("byFile is a plain object, not a Map", () => {
    const mined = mineCommits({
      commits: [commit({ filesTouched: ["a.ts"] })],
    });
    const r = computeChurn({ mined });
    expect(r.byFile).not.toBeInstanceOf(Map);
    expect(Object.getPrototypeOf(r.byFile)).toBe(Object.prototype);
  });
});

describe("computeChurn — determinism", () => {
  it("identical input produces identical output across 10 runs", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", message: "fix: 1", filesTouched: ["a", "b"] }),
        commit({ sha: "2", message: "feat: 2", filesTouched: ["b", "c"] }),
      ],
    });
    const first = JSON.stringify(computeChurn({ mined }));
    for (let i = 0; i < 9; i += 1) {
      expect(JSON.stringify(computeChurn({ mined }))).toBe(first);
    }
  });

  it("does not mutate the input MineResult", () => {
    const mined = mineCommits({
      commits: [commit({ sha: "a", filesTouched: ["x.ts"] })],
    });
    const before = JSON.stringify(mined);
    computeChurn({ mined });
    expect(JSON.stringify(mined)).toBe(before);
  });
});
