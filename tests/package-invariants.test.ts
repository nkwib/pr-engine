import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf-8"),
) as Record<string, unknown>;

describe("@prcompass/core package invariants", () => {
  it("declares zero runtime dependencies", () => {
    // Core ships as part of the OSS surface and must remain dependency-free
    // at runtime. Adding a runtime dependency here is a violation of the
    // ROADMAP § M11 invariants; do not bypass.
    expect(pkg.dependencies).toEqual({});
  });

  it("is ESM-only", () => {
    expect(pkg.type).toBe("module");
  });

  it("uses Apache-2.0 license", () => {
    expect(pkg.license).toBe("Apache-2.0");
  });

  it("exposes a single public entry (no subpath imports)", () => {
    const exports = pkg.exports as Record<string, unknown>;
    expect(Object.keys(exports)).toEqual(["."]);
  });

  it("ships dist + README + CHANGELOG + LICENSE in tarball", () => {
    expect(pkg.files).toEqual(
      expect.arrayContaining(["dist", "README.md", "CHANGELOG.md", "LICENSE"]),
    );
  });

  it("declares sideEffects: false for tree-shaking", () => {
    expect(pkg.sideEffects).toBe(false);
  });
});
