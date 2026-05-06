# Changelog

All notable changes to this package will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-1.0 minor bumps may break compatibility; see VERSIONING.md.

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
