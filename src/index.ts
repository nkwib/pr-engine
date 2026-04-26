// @prcompass/core public surface.
//
// Modules are added incrementally during M11.2–M11.5b. This file is the
// only intended entry for consumers; subpath imports are not supported.
//
// Invariants enforced by ESLint at the workspace level (see eslint.config.js):
//   - No network I/O (no octokit, no fetch wrappers, no node:http).
//   - No LLM clients (no @anthropic-ai/sdk, no openai, no @prcompass/llm-client).
//   - No DB clients (no @supabase/*, no @prcompass/db).
//   - No imports from @prcompass/api, @prcompass/worker, @prcompass/auth.
//
// Determinism invariants enforced by code review + planned determinism test:
//   - No Date.now(), no Math.random(), no unordered iteration in business logic.
//   - Same input → same output, bit-for-bit, across runs.

export {};
