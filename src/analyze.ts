import type { AnalyzeContext, DiffFile } from "./adapters/types.js";
import type { ChurnReport } from "./churn/types.js";
import type { CochangeReport } from "./cochange/types.js";
import { computeChurn } from "./churn/compute-churn.js";
import { computeCochange } from "./cochange/compute-cochange.js";
import { computeHotspots } from "./hotspots/compute-hotspots.js";
import { computeRisk } from "./risk/compute-risk.js";
import { mineCommits } from "./commit-mining/mine-commits.js";
import type { HotspotsReport } from "./hotspots/types.js";
import type { MineStats } from "./commit-mining/types.js";
import type { RiskReport } from "./risk/types.js";

/**
 * Output schema for the OSS analysis pipeline.
 *
 * `version` corresponds to the `@prcompass/core` package version that
 * produced the output. Consumers (CLI users, downstream tools) can pin
 * to a major version when integrating.
 *
 * @public
 */
export interface AnalysisOutput {
  readonly version: string;
  readonly head: { readonly sha: string; readonly baseSha: string };
  readonly pr: AnalyzeContext["pr"];
  readonly diff: {
    readonly fileCount: number;
    readonly files: readonly DiffFile[];
  };
  readonly mining: MineStats;
  readonly hotspots: HotspotsReport;
  readonly churn: ChurnReport;
  readonly cochange: CochangeReport;
  readonly risk: RiskReport;
}

/**
 * Schema version emitted as `AnalysisOutput.version`. Bumped when the
 * output shape breaks compat. Independent of the package's npm version
 * so consumers can rely on it for parsing without pinning the package.
 *
 * @public
 */
export const ANALYSIS_SCHEMA_VERSION = "0.1.0";

/**
 * Run the deterministic analysis pipeline over an {@link AnalyzeContext}.
 *
 * Pure: no I/O, no `Date.now()`, no `Math.random()`. Same input → same
 * output, bit-for-bit. The adapter that produced `ctx` is responsible
 * for any side effects.
 *
 * @public
 */
export function analyze(ctx: AnalyzeContext): AnalysisOutput {
  const mined = mineCommits({ commits: ctx.commits });
  const churn = computeChurn({ mined });
  const cochange = computeCochange({ mined });
  const hotspots = computeHotspots({ mined });
  const risk = computeRisk({ mined, hotspots, churn, cochange });
  return {
    version: ANALYSIS_SCHEMA_VERSION,
    head: { sha: ctx.diff.headSha, baseSha: ctx.diff.baseSha },
    pr: ctx.pr,
    diff: { fileCount: ctx.diff.files.length, files: ctx.diff.files },
    mining: mined.stats,
    hotspots,
    churn,
    cochange,
    risk,
  };
}
