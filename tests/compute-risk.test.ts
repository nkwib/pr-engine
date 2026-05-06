import { describe, expect, it } from "vitest";
import { computeRisk } from "../src/risk/compute-risk.js";
import { computeChurn } from "../src/churn/compute-churn.js";
import { computeCochange } from "../src/cochange/compute-cochange.js";
import { computeHotspots } from "../src/hotspots/compute-hotspots.js";
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

function pipeline(commits: readonly CommitRecord[]) {
  const mined = mineCommits({ commits });
  const hotspots = computeHotspots({ mined });
  const churn = computeChurn({ mined });
  const cochange = computeCochange({ mined });
  return { mined, hotspots, churn, cochange };
}

describe("computeRisk — no-fabrication invariant", () => {
  it("zero bug-fix commits in repo → every file's score is null AND every metric is null", () => {
    const commits = [
      commit({ sha: "1", message: "feat: a", filesTouched: ["src/a.ts"] }),
      commit({
        sha: "2",
        message: "chore: b",
        filesTouched: ["src/b.ts", "src/a.ts"],
      }),
      commit({ sha: "3", message: "docs: c", filesTouched: ["src/c.ts"] }),
      commit({ sha: "4", message: "refactor: d", filesTouched: ["src/a.ts"] }),
      commit({ sha: "5", message: "test: e", filesTouched: ["src/b.ts"] }),
    ];
    const p = pipeline(commits);
    expect(p.mined.stats.bugFixCommits).toBe(0);

    const r = computeRisk(p);

    for (const file of r.files) {
      const fr = r.byFile[file];
      expect(fr).toBeDefined();
      expect(fr?.score).toBeNull();
      expect(fr?.hotspot.value).toBeNull();
      expect(fr?.defectDensity.value).toBeNull();
      expect(fr?.couplingDegree.value).toBeNull();
      expect(fr?.recencyDays.value).toBeNull();
      expect(fr?.hotspot.groundedIn).toEqual([]);
      expect(fr?.defectDensity.groundedIn).toEqual([]);
      expect(fr?.recencyDays.groundedIn).toEqual([]);
      expect(fr?.caveats).toContain("no-bugfix-history-in-repo");
    }

    expect(r.stats.filesWithScore).toBe(0);
    expect(r.stats.meanScore).toBeNull();
  });

  it("empty input → empty report", () => {
    const p = pipeline([]);
    const r = computeRisk(p);
    expect(r.files).toEqual([]);
    expect(r.byFile).toEqual({});
    expect(r.stats.fileCount).toBe(0);
    expect(r.stats.meanScore).toBeNull();
  });

  it("file with zero bug-fix touches in a repo that has bug-fix history → metrics are 0 (real measurement, not null)", () => {
    const commits = [
      // global bug-fix on 'other.ts'
      commit({
        sha: "1",
        message: "fix: x",
        filesTouched: ["other.ts"],
      }),
      // 'clean.ts' has only a feat touch — no bug-fix touches.
      commit({
        sha: "2",
        message: "feat: y",
        filesTouched: ["clean.ts"],
      }),
    ];
    const p = pipeline(commits);
    const r = computeRisk(p);

    const cleanReport = r.byFile["clean.ts"];
    expect(cleanReport).toBeDefined();
    // Real observations, not nulls. Value is 0 because bugFixCount/totalCommits = 0/1 = 0.
    expect(cleanReport?.hotspot.value).toBe(0);
    expect(cleanReport?.defectDensity.value).toBe(0);
    expect(cleanReport?.score).not.toBeNull();
    // groundedIn for clean.ts is empty (no bug-fix commits touched it),
    // but the metric values are still 0 = real observation.
    expect(cleanReport?.hotspot.groundedIn).toEqual([]);
  });
});

describe("computeRisk — grounding", () => {
  it("hotspot.groundedIn lists every bug-fix commit SHA touching the file", () => {
    const commits = [
      commit({ sha: "fix1", message: "fix: a", filesTouched: ["risky.ts"] }),
      commit({
        sha: "feat",
        message: "feat: b",
        filesTouched: ["risky.ts"],
      }),
      commit({ sha: "fix2", message: "fix: c", filesTouched: ["risky.ts"] }),
    ];
    const p = pipeline(commits);
    const r = computeRisk(p);
    expect(r.byFile["risky.ts"]?.hotspot.groundedIn).toEqual(["fix1", "fix2"]);
    expect(r.byFile["risky.ts"]?.defectDensity.groundedIn).toEqual(["fix1", "fix2"]);
  });

  it("recencyDays.groundedIn points to the latest-touch SHA", () => {
    const commits = [
      commit({
        sha: "old",
        message: "fix: x",
        authoredAt: "2026-01-01T00:00:00Z",
        filesTouched: ["f.ts"],
      }),
      commit({
        sha: "newer",
        message: "feat: y",
        authoredAt: "2026-04-01T00:00:00Z",
        filesTouched: ["f.ts"],
      }),
      commit({
        sha: "newest",
        message: "chore: z",
        authoredAt: "2026-06-01T00:00:00Z",
        filesTouched: ["f.ts"],
      }),
    ];
    const p = pipeline(commits);
    const r = computeRisk(p);
    expect(r.byFile["f.ts"]?.recencyDays.groundedIn).toEqual(["newest"]);
  });
});

describe("computeRisk — score combination", () => {
  it("score is in [0, 1]", () => {
    const commits: CommitRecord[] = [];
    for (let i = 0; i < 10; i += 1) {
      commits.push(
        commit({
          sha: `s${i}`,
          message: i % 3 === 0 ? "fix: x" : "feat: y",
          authoredAt: `2026-04-${String((i % 27) + 1).padStart(2, "0")}T00:00:00Z`,
          filesTouched: ["a.ts"],
        }),
      );
    }
    const p = pipeline(commits);
    const r = computeRisk(p);
    const score = r.byFile["a.ts"]?.score;
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("custom weights honoured and echoed in stats", () => {
    const commits = [
      commit({ sha: "a", message: "fix: x", filesTouched: ["a.ts"] }),
      commit({ sha: "b", message: "feat: y", filesTouched: ["a.ts"] }),
    ];
    const p = pipeline(commits);
    const r = computeRisk({
      ...p,
      weights: { hotspot: 1, defectDensity: 0, couplingDegree: 0, recencyDays: 0 },
    });
    expect(r.stats.weightsUsed).toEqual({
      hotspot: 1,
      defectDensity: 0,
      couplingDegree: 0,
      recencyDays: 0,
    });
    // With only hotspot active, score equals the hotspot score.
    expect(r.byFile["a.ts"]?.score).toBe(r.byFile["a.ts"]?.hotspot.value);
  });

  it("partial weights override merges with defaults", () => {
    const p = pipeline([
      commit({ sha: "a", message: "fix: x", filesTouched: ["a.ts"] }),
    ]);
    const r = computeRisk({ ...p, weights: { hotspot: 0.9 } });
    expect(r.stats.weightsUsed.hotspot).toBe(0.9);
    expect(r.stats.weightsUsed.defectDensity).toBe(0.3); // default preserved
  });
});

describe("computeRisk — caveats", () => {
  it("low-commit-history when commitCount < 5", () => {
    const p = pipeline([
      commit({ sha: "a", message: "fix: x", filesTouched: ["new.ts"] }),
    ]);
    const r = computeRisk(p);
    expect(r.byFile["new.ts"]?.caveats).toContain("low-commit-history");
  });

  it("single-bugfix-event when bugFixCount === 1", () => {
    const p = pipeline([
      commit({ sha: "a", message: "fix: x", filesTouched: ["only.ts"] }),
      commit({ sha: "b", message: "feat: y", filesTouched: ["only.ts"] }),
      commit({ sha: "c", message: "feat: z", filesTouched: ["only.ts"] }),
    ]);
    const r = computeRisk(p);
    expect(r.byFile["only.ts"]?.caveats).toContain("single-bugfix-event");
  });
});

describe("computeRisk — JSON cleanness + determinism", () => {
  it("output round-trips through JSON", () => {
    const p = pipeline([
      commit({ sha: "1", message: "fix: x", filesTouched: ["a.ts", "b.ts"] }),
      commit({ sha: "2", message: "feat: y", filesTouched: ["a.ts"] }),
    ]);
    const r = computeRisk(p);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  it("identical input produces identical output across 10 runs", () => {
    const p = pipeline([
      commit({
        sha: "1",
        message: "fix: 1",
        authoredAt: "2026-03-01T00:00:00Z",
        filesTouched: ["a", "b"],
      }),
      commit({
        sha: "2",
        message: "feat: 2",
        authoredAt: "2026-04-01T00:00:00Z",
        filesTouched: ["b", "c"],
      }),
      commit({
        sha: "3",
        message: "fix: 3",
        authoredAt: "2026-05-01T00:00:00Z",
        filesTouched: ["a", "c"],
      }),
    ]);
    const first = JSON.stringify(computeRisk(p));
    for (let i = 0; i < 9; i += 1) {
      expect(JSON.stringify(computeRisk(p))).toBe(first);
    }
  });

  it("does not mutate inputs", () => {
    const p = pipeline([
      commit({ sha: "1", message: "fix: x", filesTouched: ["a.ts"] }),
    ]);
    const before = JSON.stringify(p);
    computeRisk(p);
    expect(JSON.stringify(p)).toBe(before);
  });
});

describe("computeRisk — couplingDegree grounding (regression)", () => {
  it("couplingDegree.groundedIn is non-empty when value > 0 (no fabrication)", () => {
    // Build commits so that 'a.ts' co-changes with 'b.ts' and 'c.ts'
    // strongly enough to clear the default Jaccard threshold (0.3).
    const commits: CommitRecord[] = [];
    for (let i = 0; i < 6; i += 1) {
      commits.push(
        commit({
          sha: `pair${i}`,
          message: i === 0 ? "fix: x" : "feat: y",
          authoredAt: `2026-04-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
          filesTouched: ["a.ts", "b.ts", "c.ts"],
        }),
      );
    }
    const p = pipeline(commits);
    const r = computeRisk(p);
    const fr = r.byFile["a.ts"];
    expect(fr).toBeDefined();
    expect(fr?.couplingDegree.value).toBeGreaterThan(0);
    // groundedIn must list the strongly-coupled neighbour files that drove
    // the count — not be empty.
    expect(fr?.couplingDegree.groundedIn.length).toBe(fr?.couplingDegree.value);
    expect(new Set(fr?.couplingDegree.groundedIn)).toEqual(
      new Set(["b.ts", "c.ts"]),
    );
  });

  it("couplingDegree.groundedIn is empty when value is 0", () => {
    // Two files never co-change: each appears in its own commit.
    const commits = [
      commit({ sha: "1", message: "fix: x", filesTouched: ["a.ts"] }),
      commit({ sha: "2", message: "feat: y", filesTouched: ["b.ts"] }),
    ];
    const p = pipeline(commits);
    const r = computeRisk(p);
    expect(r.byFile["a.ts"]?.couplingDegree.value).toBe(0);
    expect(r.byFile["a.ts"]?.couplingDegree.groundedIn).toEqual([]);
  });
});

describe("computeRisk — recency clamping (regression)", () => {
  it("score stays in [0, 1] when opts.now precedes the file's last commit", () => {
    const commits = [
      commit({
        sha: "1",
        message: "fix: x",
        authoredAt: "2026-04-01T00:00:00Z",
        filesTouched: ["a.ts"],
      }),
      commit({
        sha: "2",
        message: "feat: y",
        authoredAt: "2026-06-01T00:00:00Z",
        filesTouched: ["a.ts"],
      }),
    ];
    const p = pipeline(commits);
    // `now` is BEFORE the latest commit — caller passed clock-skewed or
    // a window-start instead of an instant. Score must still be in [0, 1].
    const r = computeRisk({ ...p, now: "2026-01-01T00:00:00Z" });
    const score = r.byFile["a.ts"]?.score;
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("recencyDays.value remains the (possibly negative) raw difference; only the score component is clamped", () => {
    // The raw recencyDays metric is informational and reflects the
    // wall-clock delta. Clamping happens inside the score combination.
    const p = pipeline([
      commit({
        sha: "1",
        message: "fix: x",
        authoredAt: "2026-06-01T00:00:00Z",
        filesTouched: ["a.ts"],
      }),
    ]);
    const r = computeRisk({ ...p, now: "2026-01-01T00:00:00Z" });
    const days = r.byFile["a.ts"]?.recencyDays.value;
    expect(days).not.toBeNull();
    // The metric reports the real (negative) difference for transparency.
    expect(days).toBeLessThan(0);
  });
});
