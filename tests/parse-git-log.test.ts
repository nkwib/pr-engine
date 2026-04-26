import { describe, expect, it } from "vitest";
import {
  parseCommitFiles,
  parseCommitMetadata,
} from "../src/commit-mining/parse-git-log.js";

const RS = "\x1e";
const US = "\x1f";

function metaRecord(parts: {
  sha: string;
  parents: string;
  author: string;
  authoredAt: string;
  message: string;
}): string {
  return `${RS}${parts.sha}${US}${parts.parents}${US}${parts.author}${US}${parts.authoredAt}${US}${parts.message}`;
}

describe("parseCommitMetadata", () => {
  it("returns empty array for empty input", () => {
    expect(parseCommitMetadata("")).toEqual([]);
  });

  it("parses a single commit with single parent", () => {
    const out = metaRecord({
      sha: "a1b2c3",
      parents: "p1",
      author: "alice",
      authoredAt: "2026-04-01T10:00:00Z",
      message: "fix: off-by-one\n",
    });
    const commits = parseCommitMetadata(out);
    expect(commits).toEqual([
      {
        sha: "a1b2c3",
        parentSha: "p1",
        authorLogin: "alice",
        authoredAt: "2026-04-01T10:00:00Z",
        message: "fix: off-by-one",
      },
    ]);
  });

  it("trims trailing newline from message but preserves internal newlines", () => {
    const out = metaRecord({
      sha: "a",
      parents: "p",
      author: "a",
      authoredAt: "t",
      message: "line1\nline2\n",
    });
    expect(parseCommitMetadata(out)[0]?.message).toBe("line1\nline2");
  });

  it("keeps only the first parent for merge commits", () => {
    const out = metaRecord({
      sha: "merge",
      parents: "p1 p2 p3",
      author: "a",
      authoredAt: "t",
      message: "Merge branch 'topic'",
    });
    expect(parseCommitMetadata(out)[0]?.parentSha).toBe("p1");
  });

  it("returns parentSha=null when there is no parent (root commit)", () => {
    const out = metaRecord({
      sha: "root",
      parents: "",
      author: "a",
      authoredAt: "t",
      message: "initial commit",
    });
    expect(parseCommitMetadata(out)[0]?.parentSha).toBeNull();
  });

  it("returns authorLogin=null when author field is empty", () => {
    const out = metaRecord({
      sha: "a",
      parents: "p",
      author: "",
      authoredAt: "t",
      message: "msg",
    });
    expect(parseCommitMetadata(out)[0]?.authorLogin).toBeNull();
  });

  it("parses multiple commits in order", () => {
    const out =
      metaRecord({
        sha: "a",
        parents: "p",
        author: "alice",
        authoredAt: "t1",
        message: "msg1",
      }) +
      metaRecord({
        sha: "b",
        parents: "a",
        author: "bob",
        authoredAt: "t2",
        message: "msg2",
      });
    const commits = parseCommitMetadata(out);
    expect(commits.map((c) => c.sha)).toEqual(["a", "b"]);
  });

  it("skips records with fewer than 5 fields", () => {
    const broken = `${RS}sha-only`;
    expect(parseCommitMetadata(broken)).toEqual([]);
  });
});

describe("parseCommitFiles", () => {
  const FM = "\x1eCOMMIT ";

  it("returns empty map for empty input", () => {
    expect(parseCommitFiles("").size).toBe(0);
  });

  it("parses a commit with multiple files", () => {
    const out = `${FM}sha1\nsrc/a.ts\nsrc/b.ts\n`;
    const map = parseCommitFiles(out);
    expect(map.get("sha1")).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("parses a commit with no files (file-list empty)", () => {
    const out = `${FM}sha-empty\n`;
    const map = parseCommitFiles(out);
    expect(map.get("sha-empty")).toEqual([]);
  });

  it("handles a sha-only record without a trailing newline", () => {
    const out = `${FM}sha-noend`;
    const map = parseCommitFiles(out);
    expect(map.get("sha-noend")).toEqual([]);
  });

  it("parses multiple commits and preserves the per-commit order", () => {
    const out = `${FM}a\nfile1.ts\n${FM}b\nfile2.ts\nfile3.ts\n`;
    const map = parseCommitFiles(out);
    expect(map.get("a")).toEqual(["file1.ts"]);
    expect(map.get("b")).toEqual(["file2.ts", "file3.ts"]);
  });

  it("trims whitespace from file paths and drops empty lines", () => {
    const out = `${FM}sha\n  spaced.ts  \n\n  other.ts\n`;
    expect(parseCommitFiles(out).get("sha")).toEqual(["spaced.ts", "other.ts"]);
  });

  it("ignores records with empty sha", () => {
    const out = `${FM}\nfoo.ts\n${FM}good\nbar.ts\n`;
    const map = parseCommitFiles(out);
    expect(map.size).toBe(1);
    expect(map.get("good")).toEqual(["bar.ts"]);
  });
});
