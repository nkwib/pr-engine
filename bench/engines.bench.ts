import { bench, describe } from "vitest";

import { generateSyntheticRepo } from "./synthetic.js";
import { mineCommits } from "../src/commit-mining/mine-commits.js";
import { computeChurn } from "../src/churn/compute-churn.js";
import { computeCochange } from "../src/cochange/compute-cochange.js";
import { computeHotspots } from "../src/hotspots/compute-hotspots.js";
import { computeRisk } from "../src/risk/compute-risk.js";
import { analyze } from "../src/analyze.js";

const COMMITS_10K = generateSyntheticRepo({ commitCount: 10_000 });
const MINED_10K = mineCommits({ commits: COMMITS_10K });

describe("@prcompass/core engines @ 10k commits / 500 files / 5 files-per-commit", () => {
  bench("mineCommits", () => {
    mineCommits({ commits: COMMITS_10K });
  });

  bench("computeChurn", () => {
    computeChurn({ mined: MINED_10K });
  });

  bench("computeCochange", () => {
    computeCochange({ mined: MINED_10K });
  });

  bench("computeHotspots", () => {
    computeHotspots({ mined: MINED_10K });
  });

  bench("computeRisk (full pipeline assembled)", () => {
    const churn = computeChurn({ mined: MINED_10K });
    const cochange = computeCochange({ mined: MINED_10K });
    const hotspots = computeHotspots({ mined: MINED_10K });
    computeRisk({ mined: MINED_10K, churn, cochange, hotspots });
  });

  bench("analyze (mining + all engines, fresh)", () => {
    analyze({
      commits: COMMITS_10K,
      diff: { baseSha: "B", headSha: "H", files: [] },
      pr: null,
    });
  });
});
