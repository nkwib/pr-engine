import { describe, expect, it } from "vitest";
import {
  analyze,
  ANALYSIS_SCHEMA_VERSION,
  type AnalyzeContext,
  type CommitRecord,
  type ProviderAdapter,
} from "../src/index.js";

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

function ctx(overrides: Partial<AnalyzeContext> = {}): AnalyzeContext {
  return {
    commits: [],
    diff: { baseSha: "base", headSha: "head", files: [] },
    pr: null,
    ...overrides,
  };
}

describe("analyze", () => {
  it("emits the schema version", () => {
    const out = analyze(ctx());
    expect(out.version).toBe(ANALYSIS_SCHEMA_VERSION);
  });

  it("propagates head/base SHAs from the context", () => {
    const out = analyze(ctx({ diff: { baseSha: "B", headSha: "H", files: [] } }));
    expect(out.head).toEqual({ sha: "H", baseSha: "B" });
  });

  it("runs all engines and includes their outputs", () => {
    const out = analyze(
      ctx({
        commits: [
          commit({
            sha: "1",
            message: "fix: a",
            filesTouched: ["src/a.ts", "src/b.ts"],
          }),
          commit({
            sha: "2",
            message: "feat: b",
            filesTouched: ["src/a.ts"],
          }),
        ],
      }),
    );
    expect(out.mining.totalCommits).toBe(2);
    expect(out.mining.bugFixCommits).toBe(1);
    expect(out.churn.byFile["src/a.ts"]?.commitCount).toBe(2);
    expect(out.hotspots.byFile["src/a.ts"]).toBeDefined();
    expect(out.risk.byFile["src/a.ts"]).toBeDefined();
  });

  it("respects no-fabrication: zero bug-fix history → null risk scores", () => {
    const out = analyze(
      ctx({
        commits: [commit({ sha: "1", message: "feat: a", filesTouched: ["a.ts"] })],
      }),
    );
    expect(out.risk.byFile["a.ts"]?.score).toBeNull();
  });

  it("output round-trips through JSON.stringify/parse", () => {
    const out = analyze(
      ctx({
        commits: [
          commit({
            sha: "1",
            message: "fix: a",
            filesTouched: ["a.ts"],
          }),
        ],
      }),
    );
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });

  it("identical input produces identical output across 10 runs", () => {
    const c = ctx({
      commits: [
        commit({ sha: "1", message: "fix: a", filesTouched: ["a", "b"] }),
        commit({ sha: "2", message: "feat: b", filesTouched: ["b"] }),
      ],
    });
    const first = JSON.stringify(analyze(c));
    for (let i = 0; i < 9; i += 1) {
      expect(JSON.stringify(analyze(c))).toBe(first);
    }
  });
});

describe("ProviderAdapter — interface contract", () => {
  it("a synthetic adapter satisfies the ProviderAdapter shape", async () => {
    class FakeAdapter implements ProviderAdapter {
      readonly name = "fake";
      async collect(): Promise<AnalyzeContext> {
        return ctx();
      }
    }
    const adapter = new FakeAdapter();
    const collected = await adapter.collect();
    expect(adapter.name).toBe("fake");
    expect(analyze(collected).risk.stats.fileCount).toBe(0);
  });
});
