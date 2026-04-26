# @prcompass/core

Deterministic engine for PR Compass: commit-mining, churn, cochange, risk-scoring.

**Status**: scaffold (M11.1). Modules land incrementally during M11.2–M11.5b.

## Invariants

This package is published as part of the PR Compass OSS release. To preserve trust and reproducibility, the following invariants are non-negotiable:

- **No network I/O.** No `fetch`, no `octokit`, no `node:http`. Inputs are passed as data; outputs are returned as data.
- **No LLM clients.** No `@anthropic-ai/sdk`, no `openai`, no `@prcompass/llm-client`. Every claim is grounded in real repository data, not generated.
- **No DB clients.** No `@supabase/*`, no `@prcompass/db`. The package does not read or write persistent storage.
- **No environment variables for business logic.** Configuration is passed as function arguments.
- **Deterministic.** Same input produces the same output, bit-for-bit. No `Date.now()`, no `Math.random()`, no unordered iteration in business code.
- **No fabrication.** Numeric claims (e.g. risk scores) point to real commit hashes or are `null`. Never default to `0`, never invent.

These are enforced by:

- ESLint `no-restricted-imports` rules at the workspace root (forbidden list above).
- Determinism test (planned, M11.5b): pipeline runs ten times on identical input; output must hash-match.
- No-fabrication test (planned, M11.5b): given a synthetic repo with zero bug-fix commits, every `RiskReport` numeric field must be `null`.

## Public surface

Empty in M11.1. Final surface will be documented module by module as M11.2–M11.5b land. Consumers import only from the package root; subpath imports are not supported.

## License

Apache-2.0 (effective at OSS publication; see `LICENSE`).
