import type { CommitRecord } from "../src/commit-mining/types.js";

export interface SyntheticRepoOpts {
  readonly commitCount: number;
  readonly fileCount: number;
  readonly filesPerCommit: number;
  /** Fraction of commits classified as bug-fix (in `[0, 1]`). */
  readonly bugFixRatio: number;
}

const DEFAULT_OPTS: SyntheticRepoOpts = {
  commitCount: 10_000,
  fileCount: 500,
  filesPerCommit: 5,
  bugFixRatio: 0.18,
};

/**
 * Build a deterministic synthetic commit history. Same `opts` always
 * produces the same list — used by benchmarks and by the cross-cutting
 * determinism test so reruns are comparable.
 */
export function generateSyntheticRepo(
  opts: Partial<SyntheticRepoOpts> = {},
): readonly CommitRecord[] {
  const o = { ...DEFAULT_OPTS, ...opts };
  const files = Array.from({ length: o.fileCount }, (_, i) => `src/f${i}.ts`);
  const commits: CommitRecord[] = [];
  const bugFixGap = Math.max(1, Math.round(1 / Math.max(o.bugFixRatio, 0.0001)));

  for (let i = 0; i < o.commitCount; i += 1) {
    const isBugFix = i % bugFixGap === 0;
    const message = isBugFix ? `fix: synthetic bug ${i}` : `feat: synthetic ${i}`;
    const filesTouched: string[] = [];
    for (let k = 0; k < o.filesPerCommit; k += 1) {
      // Round-robin file selection. Deterministic, no PRNG.
      const idx = (i * o.filesPerCommit + k) % files.length;
      const file = files[idx];
      if (file !== undefined) filesTouched.push(file);
    }
    commits.push({
      sha: `s${i.toString(16).padStart(8, "0")}`,
      parentSha: i === 0 ? null : `s${(i - 1).toString(16).padStart(8, "0")}`,
      message,
      authorName: i % 7 === 0 ? "alice" : "bob",
      authoredAt: isoForIndex(i, o.commitCount),
      filesTouched,
    });
  }
  return commits;
}

function isoForIndex(i: number, total: number): string {
  // Spread `total` commits across two years ending at 2026-04-26.
  const epochEnd = Date.UTC(2026, 3, 26, 0, 0, 0);
  const span = 2 * 365 * 86_400_000;
  const t = epochEnd - span + (span * i) / total;
  return new Date(Math.floor(t)).toISOString();
}
