import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/analyze.js";
import { generateSyntheticRepo } from "../bench/synthetic.js";

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * Cross-cutting determinism test. Each engine has its own 10-run
 * bit-equality test next to its implementation; this one exercises
 * `analyze()` end-to-end on a realistic-sized synthetic repo, and
 * additionally hashes the output to catch any non-determinism that
 * round-trips through JSON.stringify (e.g. NaN, undefined).
 */
describe("@prcompass/core — cross-cutting determinism", () => {
  it("analyze() over a 10k-commit synthetic repo: 10 runs hash-identical", () => {
    const commits = generateSyntheticRepo({ commitCount: 10_000 });
    const ctx = {
      commits,
      diff: { baseSha: "B", headSha: "H", files: [] },
      pr: null,
    } as const;

    const first = digest(analyze(ctx));
    for (let i = 0; i < 9; i += 1) {
      const next = digest(analyze(ctx));
      expect(next).toBe(first);
    }
  });

  it("analyze() over a 1k-commit repo is hash-stable when commits are reordered (sanity: NOT this one — order matters)", () => {
    // Negative confirmation: changing input must change output.
    // Otherwise the first test could trivially pass by always returning
    // the same hash regardless of input.
    const commits = generateSyntheticRepo({ commitCount: 1_000 });
    const reversed = [...commits].reverse();
    const original = digest(
      analyze({
        commits,
        diff: { baseSha: "B", headSha: "H", files: [] },
        pr: null,
      }),
    );
    const reorder = digest(
      analyze({
        commits: reversed,
        diff: { baseSha: "B", headSha: "H", files: [] },
        pr: null,
      }),
    );
    expect(reorder).not.toBe(original);
  });
});
