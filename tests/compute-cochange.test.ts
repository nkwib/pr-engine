import { describe, expect, it } from "vitest";
import { computeCochange } from "../src/cochange/compute-cochange.js";
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

describe("computeCochange — empty input", () => {
  it("empty commits → empty graph", () => {
    const r = computeCochange({ mined: mineCommits({ commits: [] }) });
    expect(r.nodes).toEqual({});
    expect(r.files).toEqual([]);
    expect(r.stats.nodeCount).toBe(0);
    expect(r.stats.edgeCount).toBe(0);
    expect(r.stats.skippedMassRefactorCommits).toBe(0);
  });

  it("commits with no files → empty graph", () => {
    const mined = mineCommits({
      commits: [commit({ filesTouched: [] }), commit({ filesTouched: [] })],
    });
    expect(computeCochange({ mined }).stats.nodeCount).toBe(0);
  });
});

describe("computeCochange — basic edges", () => {
  it("one commit, two files: pair below default minCochangeCount=2 → no edges", () => {
    const mined = mineCommits({
      commits: [commit({ sha: "1", filesTouched: ["a.ts", "b.ts"] })],
    });
    const r = computeCochange({ mined });
    expect(r.nodes["a.ts"]?.neighbors).toEqual([]);
    expect(r.nodes["b.ts"]?.neighbors).toEqual([]);
    expect(r.stats.edgeCount).toBe(0);
  });

  it("two commits same pair: edge present, jaccard=1.0", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", filesTouched: ["a.ts", "b.ts"] }),
        commit({ sha: "2", filesTouched: ["a.ts", "b.ts"] }),
      ],
    });
    const r = computeCochange({ mined });
    expect(r.nodes["a.ts"]?.neighbors).toEqual([
      { file: "b.ts", cochangeCount: 2, jaccard: 1 },
    ]);
    expect(r.nodes["b.ts"]?.neighbors).toEqual([
      { file: "a.ts", cochangeCount: 2, jaccard: 1 },
    ]);
    expect(r.stats.edgeCount).toBe(2); // bidirectional
  });

  it("Jaccard on partial overlap: count / (Ca + Cb - count)", () => {
    // a.ts in 3 commits, b.ts in 2 commits, both in 2 commits.
    // jaccard = 2 / (3 + 2 - 2) = 2/3.
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", filesTouched: ["a.ts", "b.ts"] }),
        commit({ sha: "2", filesTouched: ["a.ts", "b.ts"] }),
        commit({ sha: "3", filesTouched: ["a.ts"] }),
      ],
    });
    const r = computeCochange({ mined });
    expect(r.nodes["a.ts"]?.neighbors[0]?.jaccard).toBeCloseTo(2 / 3, 10);
  });

  it("custom minCochangeCount=1 keeps single-commit pairs", () => {
    const mined = mineCommits({
      commits: [commit({ filesTouched: ["a.ts", "b.ts"] })],
    });
    const r = computeCochange({ mined, minCochangeCount: 1 });
    expect(r.nodes["a.ts"]?.neighbors).toHaveLength(1);
  });
});

describe("computeCochange — multi-file commits", () => {
  it("3-file commit creates all C(3,2)=3 pairs", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", filesTouched: ["a", "b", "c"] }),
        commit({ sha: "2", filesTouched: ["a", "b", "c"] }),
      ],
    });
    const r = computeCochange({ mined, minCochangeCount: 2 });
    expect(r.nodes["a"]?.neighbors).toHaveLength(2);
    expect(r.nodes["b"]?.neighbors).toHaveLength(2);
    expect(r.nodes["c"]?.neighbors).toHaveLength(2);
  });

  it("dedupes within a single commit (path appears twice)", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", filesTouched: ["a.ts", "a.ts", "b.ts"] }),
        commit({ sha: "2", filesTouched: ["a.ts", "b.ts"] }),
      ],
    });
    const r = computeCochange({ mined });
    expect(r.nodes["a.ts"]?.commitCount).toBe(2); // not 3
  });
});

describe("computeCochange — mass-refactor filter", () => {
  it("commits over maxFilesPerCommit are skipped", () => {
    const massFiles = Array.from({ length: 60 }, (_, i) => `file-${i}.ts`);
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", filesTouched: massFiles }),
        commit({ sha: "2", filesTouched: ["a.ts", "b.ts"] }),
        commit({ sha: "3", filesTouched: ["a.ts", "b.ts"] }),
      ],
    });
    const r = computeCochange({ mined });
    expect(r.stats.skippedMassRefactorCommits).toBe(1);
    expect(r.nodes["a.ts"]?.commitCount).toBe(2);
    expect(r.nodes["a.ts"]?.neighbors[0]?.cochangeCount).toBe(2);
    // The 60-file mass refactor should not have created any nodes.
    expect(r.nodes["file-0.ts"]).toBeUndefined();
  });

  it("custom maxFilesPerCommit honoured", () => {
    const mined = mineCommits({
      commits: [commit({ sha: "1", filesTouched: ["a", "b", "c", "d", "e"] })],
    });
    const r = computeCochange({ mined, maxFilesPerCommit: 3 });
    expect(r.stats.skippedMassRefactorCommits).toBe(1);
    expect(r.stats.nodeCount).toBe(0);
  });
});

describe("computeCochange — sort order", () => {
  it("neighbors sorted by cochangeCount desc, ties by file asc", () => {
    const mined = mineCommits({
      commits: [
        // a co-changes with b 3 times, with c 3 times, with d 2 times.
        commit({ sha: "1", filesTouched: ["a", "b"] }),
        commit({ sha: "2", filesTouched: ["a", "b"] }),
        commit({ sha: "3", filesTouched: ["a", "b"] }),
        commit({ sha: "4", filesTouched: ["a", "c"] }),
        commit({ sha: "5", filesTouched: ["a", "c"] }),
        commit({ sha: "6", filesTouched: ["a", "c"] }),
        commit({ sha: "7", filesTouched: ["a", "d"] }),
        commit({ sha: "8", filesTouched: ["a", "d"] }),
      ],
    });
    const r = computeCochange({ mined });
    const aNbs = r.nodes["a"]?.neighbors ?? [];
    expect(aNbs.map((e) => e.file)).toEqual(["b", "c", "d"]);
    expect(aNbs[0]?.cochangeCount).toBe(3);
    expect(aNbs[2]?.cochangeCount).toBe(2);
  });
});

describe("computeCochange — JSON cleanness", () => {
  it("output round-trips through JSON", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", filesTouched: ["a", "b"] }),
        commit({ sha: "2", filesTouched: ["a", "b"] }),
      ],
    });
    const r = computeCochange({ mined });
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  it("nodes is a plain object, not a Map", () => {
    const mined = mineCommits({
      commits: [commit({ filesTouched: ["a"] })],
    });
    const r = computeCochange({ mined });
    expect(r.nodes).not.toBeInstanceOf(Map);
  });
});

describe("computeCochange — determinism", () => {
  it("identical input produces identical output across 10 runs", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", filesTouched: ["a", "b", "c"] }),
        commit({ sha: "2", filesTouched: ["b", "c", "d"] }),
        commit({ sha: "3", filesTouched: ["a", "c"] }),
        commit({ sha: "4", filesTouched: ["a", "b", "c"] }),
      ],
    });
    const first = JSON.stringify(computeCochange({ mined }));
    for (let i = 0; i < 9; i += 1) {
      expect(JSON.stringify(computeCochange({ mined }))).toBe(first);
    }
  });

  it("does not mutate the input MineResult", () => {
    const mined = mineCommits({
      commits: [
        commit({ sha: "1", filesTouched: ["a", "b"] }),
        commit({ sha: "2", filesTouched: ["a", "b"] }),
      ],
    });
    const before = JSON.stringify(mined);
    computeCochange({ mined });
    expect(JSON.stringify(mined)).toBe(before);
  });
});

describe("computeCochange — performance", () => {
  it("handles a 5k-commit synthetic fixture in < 5 s", () => {
    const files = Array.from({ length: 200 }, (_, i) => `f${i}.ts`);
    const commits: CommitRecord[] = [];
    for (let i = 0; i < 5000; i += 1) {
      // Each commit touches ~5 files chosen by index modulo, deterministic.
      const offsets = [0, 1, 2, 5, 7];
      const touched = offsets.map((o) => files[(i + o) % files.length] as string);
      commits.push(
        commit({
          sha: `s${i}`,
          authoredAt: `2026-04-${String((i % 27) + 1).padStart(2, "0")}T00:00:00Z`,
          filesTouched: touched,
        }),
      );
    }
    const mined = mineCommits({ commits });
    const start = performance.now();
    const r = computeCochange({ mined });
    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(5_000);
    expect(r.stats.nodeCount).toBe(200);
  });
});
