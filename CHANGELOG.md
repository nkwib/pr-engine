# Changelog

All notable changes to this package will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-1.0 minor bumps may break compatibility; see VERSIONING.md.

## [Unreleased]

### Fixed

- Docs site now references the published package names. Every `@nkwib/pr-engine` reference is `@prcompass/core` and `@nkwib/pr-analyze` is `@prcompass/cli`; the closed hosted-layer references previously written as `@nkwib/llm-client` / `@nkwib/db` are now neutral descriptions. The previously documented `npm install @nkwib/pr-engine` command was a 404.
- Docs site landing badge corrected from `v0.1 · MIT` to `v0.2.0 · Apache-2.0`, and the footer LICENSE link is relabelled from `MIT` to `Apache-2.0`.
- Benchmarks page no longer claims the numbers "reflect v0.1.0" as if current; it now states they were last recorded on v0.1.0 and have not been re-run.
- Removed the reference to a non-existent "CLI smoke workflow" in `BENCHMARKS.md` (and the docs site benchmarks page).
- `MineStats.bugFixRatio` JSDoc no longer contradicts itself; it accurately documents that the ratio is `0` for an empty commit list.
- Reworded a garbled non-English comment leak in `tests/package-invariants.test.ts`.

### Added

- GitHub Actions CI (`.github/workflows/ci.yml`): typecheck, test, build, and a dist smoke step on Node 20, plus a docs-site build job (pnpm). Uses `npm install` because `package-lock.json` is intentionally gitignored.
- `npm run smoke` script that asserts the built `dist/index.js` exposes the core public exports (`analyze`, `mineCommits`, `computeRisk`).

### Other

- `package.json` `repository.url` now uses the canonical `git+https://…` form.

## [0.2.0] — 2026-05-06

### Changed (BREAKING, pre-1.0)

- `CommitRecord.authorLogin` renamed to `CommitRecord.authorName`. The field has always carried the git author **name** (`%aN`), not a GitHub login, so the old name was misleading. Update any caller-built `CommitRecord` literals.
- `ParsedCommitMetadata.authorLogin` renamed to `ParsedCommitMetadata.authorName` for the same reason. The interface is now exported from the package entry point.

### Fixed

- `computeRisk`: `couplingDegree.groundedIn` is now populated with the strongly-coupled neighbour file paths whenever `couplingDegree.value > 0`. Previously it was always `[]`, violating the no-fabrication invariant.
- `computeRisk`: the combined score is now clamped to `[0, 1]` when `opts.now` precedes the file's latest authoring timestamp (previously `Math.exp(-negativeDays/halfLife)` could push the score above 1). The raw `recencyDays.value` still reflects the real (possibly negative) delta.
- `mineCommits`: a custom `bugFixDetector` regex carrying the `g` or `y` flag no longer skips matches on subsequent commits (the stateful `lastIndex` is reset before each `.test()`).
- Standalone build: `tsconfig.json` no longer extends a missing monorepo base file. Strict TypeScript compiler options are now declared inline.

### Removed

- `package.json` `private: true` (was blocking `npm publish`).
- Broken `lint` script (no eslint config or dependency was checked in).

### Other

- `package.json` repository URL now points to `github.com/nkwib/pr-engine`.
- `BENCHMARKS.md` is now included in the published tarball.
- README claim about `pnpm typedoc` removed (typedoc is not a declared dependency).

## [0.1.0] — 2026-04-27

Initial public-release-ready version. Engine + CLI surface frozen for v0.1.x. See `docs/oss/API.md` for the full surface.
