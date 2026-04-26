import type {
  CochangeEdge,
  CochangeNode,
  CochangeOpts,
  CochangeReport,
} from "./types.js";

const DEFAULT_MAX_FILES_PER_COMMIT = 50;
const DEFAULT_MIN_COCHANGE_COUNT = 2;

/**
 * Compute the file×file cochange graph from a `MineResult`.
 *
 * Pure function, deterministic, no I/O. Performance scales with
 * O(C × F²) where C is commits and F is files-per-commit
 * (post-mass-refactor-filter). With F capped at 50 (default), 5k
 * commits run well under 30s on commodity CI hardware.
 *
 * @public
 */
export function computeCochange(opts: CochangeOpts): CochangeReport {
  const maxFiles = opts.maxFilesPerCommit ?? DEFAULT_MAX_FILES_PER_COMMIT;
  const minCount = opts.minCochangeCount ?? DEFAULT_MIN_COCHANGE_COUNT;

  // Per-file commit count (post-filter), used for Jaccard denominators.
  const fileCounts = new Map<string, number>();
  // Canonical edge map: outer key < inner key (lexicographically).
  const edgeMap = new Map<string, Map<string, number>>();
  const fileOrder: string[] = [];
  let skipped = 0;

  for (const commit of opts.mined.commits) {
    if (commit.filesTouched.length > maxFiles) {
      skipped += 1;
      continue;
    }
    // Dedupe within commit (some git emits the same path twice on
    // type-change). Set preserves first-seen order.
    const unique = new Set<string>();
    for (const file of commit.filesTouched) unique.add(file);
    const files = [...unique];

    for (const file of files) {
      const prev = fileCounts.get(file);
      if (prev === undefined) {
        fileCounts.set(file, 1);
        fileOrder.push(file);
      } else {
        fileCounts.set(file, prev + 1);
      }
    }

    for (let i = 0; i < files.length; i += 1) {
      for (let j = i + 1; j < files.length; j += 1) {
        const fi = files[i];
        const fj = files[j];
        if (fi === undefined || fj === undefined) continue;
        const k1 = fi < fj ? fi : fj;
        const k2 = fi < fj ? fj : fi;
        let inner = edgeMap.get(k1);
        if (inner === undefined) {
          inner = new Map();
          edgeMap.set(k1, inner);
        }
        inner.set(k2, (inner.get(k2) ?? 0) + 1);
      }
    }
  }

  // Build per-file neighbor lists (bidirectional output).
  const neighbors = new Map<string, CochangeEdge[]>();
  for (const file of fileOrder) neighbors.set(file, []);

  for (const [a, inner] of edgeMap) {
    for (const [b, count] of inner) {
      if (count < minCount) continue;
      const aCount = fileCounts.get(a) ?? 0;
      const bCount = fileCounts.get(b) ?? 0;
      const union = aCount + bCount - count;
      const jaccard = union <= 0 ? 0 : count / union;
      const aList = neighbors.get(a);
      const bList = neighbors.get(b);
      if (aList === undefined || bList === undefined) continue;
      aList.push({ file: b, cochangeCount: count, jaccard });
      bList.push({ file: a, cochangeCount: count, jaccard });
    }
  }

  // Sort each list deterministically.
  const compareEdges = (x: CochangeEdge, y: CochangeEdge): number => {
    if (y.cochangeCount !== x.cochangeCount) {
      return y.cochangeCount - x.cochangeCount;
    }
    if (y.jaccard !== x.jaccard) return y.jaccard - x.jaccard;
    return x.file < y.file ? -1 : x.file > y.file ? 1 : 0;
  };
  for (const list of neighbors.values()) list.sort(compareEdges);

  const nodes: Record<string, CochangeNode> = {};
  let edgeCount = 0;
  for (const file of fileOrder) {
    const list = neighbors.get(file);
    const count = fileCounts.get(file);
    if (list === undefined || count === undefined) continue;
    nodes[file] = {
      file,
      commitCount: count,
      neighbors: list,
    };
    edgeCount += list.length;
  }

  return {
    nodes,
    files: fileOrder,
    stats: {
      nodeCount: fileOrder.length,
      edgeCount,
      skippedMassRefactorCommits: skipped,
      maxFilesPerCommit: maxFiles,
      minCochangeCount: minCount,
    },
  };
}
