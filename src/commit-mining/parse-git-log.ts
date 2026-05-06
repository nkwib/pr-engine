/**
 * Pure parsers for `git log` stdout. No I/O, no subprocess.
 *
 * Producing the input strings (running git itself) is the caller's job.
 * The reference adapter in `apps/worker` and `@prcompass/cli`'s
 * LocalAdapter both use these parsers.
 *
 * @packageDocumentation
 */

/**
 * Output shape of {@link parseCommitMetadata}: one record per commit,
 * minus the file list (filled in via {@link parseCommitFiles} and joined
 * by the caller into a {@link CommitRecord}).
 *
 * @public
 */
export interface ParsedCommitMetadata {
  readonly sha: string;
  readonly parentSha: string | null;
  /**
   * The git author **name** (`%aN`), not a GitHub login. This comes
   * from the local commit's author identity and may be a display name,
   * full name, or anything the author configured.
   */
  readonly authorName: string | null;
  readonly authoredAt: string;
  readonly message: string;
}

/**
 * Parse the metadata pass of `git log --format=%x1e%H%x1f%P%x1f%aN%x1f%aI%x1f%B`.
 *
 * Records are separated by RS (`\x1e`); fields by US (`\x1f`).
 *
 * @public
 */
export function parseCommitMetadata(output: string): ParsedCommitMetadata[] {
  const commits: ParsedCommitMetadata[] = [];
  const records = output.split("\x1e").filter((r) => r.length > 0);
  for (const rec of records) {
    const fields = rec.split("\x1f");
    if (fields.length < 5) continue;
    const [sha, parentsRaw, author, authoredAt, messageRaw] = fields as [
      string,
      string,
      string,
      string,
      string,
    ];
    // `%P` yields space-separated parent SHAs for merges; we keep the first.
    const firstParent = parentsRaw.split(/\s+/)[0] ?? "";
    const message = messageRaw.endsWith("\n") ? messageRaw.slice(0, -1) : messageRaw;
    commits.push({
      sha,
      parentSha: firstParent.length > 0 ? firstParent : null,
      authorName: author.length > 0 ? author : null,
      authoredAt,
      message,
    });
  }
  return commits;
}

/**
 * Parse the file-list pass of `git log --name-only --format=\x1eCOMMIT %H`.
 *
 * Returns a map of sha → list of file paths touched by that commit.
 *
 * @public
 */
export function parseCommitFiles(output: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const FILE_MARKER = "\x1eCOMMIT ";
  const records = output.split(FILE_MARKER).filter((r) => r.length > 0);
  for (const rec of records) {
    const newlineIdx = rec.indexOf("\n");
    if (newlineIdx < 0) {
      const sha = rec.trim();
      if (sha.length > 0) map.set(sha, []);
      continue;
    }
    const sha = rec.slice(0, newlineIdx).trim();
    if (sha.length === 0) continue;
    const rest = rec.slice(newlineIdx + 1);
    const files = rest
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    map.set(sha, files);
  }
  return map;
}
