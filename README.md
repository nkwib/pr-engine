# @prcompass/core

The deterministic engine for PR Compass: turns a list of git commits into per-file risk metrics. No network, no LLM, no database. Same input always produces the same output.

This package backs the OSS release of the PR Compass hosted product. The hosted product is the closed-source layer above; this engine is what computes "which file looks risky" given the repository's commit history.

## Status

Pre-1.0. Public API is **frozen at 1.0.0** per [VERSIONING.md](../../docs/oss/VERSIONING.md) (planned). Until then, breaking changes only happen between minor versions and are listed in `CHANGELOG.md`.

## Install

```bash
npm install @prcompass/core
```

ESM-only. Requires Node 20+.

## Quick start

```typescript
import {
  mineCommits,
  computeChurn,
  computeCochange,
  computeHotspots,
  computeRisk,
} from "@prcompass/core";

// 1. You produce CommitRecord[] yourself (e.g. via git log; see § "Producing CommitRecord[]" below).
const commits = await yourGitDriver.listCommits();

// 2. Mine: classify each commit as bug-fix or not.
const mined = mineCommits({ commits });

// 3. Per-file metrics.
const churn = computeChurn({ mined });
const cochange = computeCochange({ mined });
const hotspots = computeHotspots({ mined });

// 4. Combine into a risk report.
const risk = computeRisk({ mined, hotspots, churn, cochange });

// 5. risk.byFile[path] is your per-file FileRiskReport.
//    Every numeric value is grounded by real commit SHAs or is null.
console.log(JSON.stringify(risk, null, 2));
```

## Invariants

These rules are non-negotiable. ESLint enforces import-side at the workspace root; the `package-invariants.test.ts` enforces package-side; the rest are upheld by code review and the determinism / no-fabrication tests.

1. **No network I/O.** No `fetch`, no `octokit`, no `node:http`. Inputs come in as data; outputs go out as data.
2. **No LLM clients.** No `@anthropic-ai/sdk`, no `openai`, no `@prcompass/llm-client`. Every claim is derived from real commit history, not generated.
3. **No DB clients.** No `@supabase/*`, no `@prcompass/db`. The package neither reads nor writes persistent storage.
4. **No environment variables.** Configuration is passed as function arguments. There is no `process.env.*` in business logic.
5. **No subprocesses.** No `child_process`, no `spawn`. Reading the git history is the caller's job (see "Producing CommitRecord[]" below).
6. **Deterministic.** Same input produces the same output, bit-for-bit. No `Date.now()`, no `Math.random()`, no unordered iteration in business code.
7. **No fabrication.** A numeric claim either points to a real commit SHA in `groundedIn` or is `null`. The engine never defaults to `0` when it has no signal. The opposite is also true: a `0` is a real measurement (e.g. "this file appears in commits but none of them were bug-fix") and is grounded.

## Public surface

| Module          | Function                                                | Purpose                                                                   |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `commit-mining` | `mineCommits(opts)`                                     | Classify each commit as bug-fix vs not, attach a signal.                  |
| `commit-mining` | `parseCommitMetadata(stdout)`                           | Pure parser for `git log --format=...`.                                   |
| `commit-mining` | `parseCommitFiles(stdout)`                              | Pure parser for `git log --name-only --format=...`.                       |
| `commit-mining` | `BUGFIX_REGEX`, `isBugFixCommit`, `filterBugFixCommits` | Default bug-fix heuristic.                                                |
| `churn`         | `computeChurn(opts)`                                    | Per-file commit count, bug-fix count, defect density, first/last touched. |
| `cochange`      | `computeCochange(opts)`                                 | File×file co-modification graph with Jaccard weights.                     |
| `hotspots`      | `computeHotspots(opts)`                                 | Bayesian-smoothed bug-fix score per file.                                 |
| `risk`          | `computeRisk(opts)`                                     | Combine the above into a per-file risk report.                            |

All public types live alongside their function. See JSDoc for full details.

## Producing `CommitRecord[]`

The engine consumes `CommitRecord[]`. To produce that from a git directory, run two `git log` passes and feed their outputs to the parsers:

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  parseCommitMetadata,
  parseCommitFiles,
  type CommitRecord,
} from "@prcompass/core";

const run = promisify(execFile);

async function listCommits(repoDir: string): Promise<CommitRecord[]> {
  const META = "%x1e%H%x1f%P%x1f%aN%x1f%aI%x1f%B";
  const { stdout: metaOut } = await run("git", ["log", `--format=${META}`], {
    cwd: repoDir,
  });
  const { stdout: fileOut } = await run(
    "git",
    ["log", "--name-only", "--format=\x1eCOMMIT %H"],
    { cwd: repoDir },
  );
  const meta = parseCommitMetadata(metaOut);
  const files = parseCommitFiles(fileOut);
  return meta.map((m) => ({ ...m, filesTouched: files.get(m.sha) ?? [] }));
}
```

The `@prcompass/cli` package (M12) ships a `LocalAdapter` that does exactly this. Use it directly if you don't want to write subprocess code.

## License

[Apache-2.0](./LICENSE).
