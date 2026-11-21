// token-radar-01 v3 — entrypoint.
// Reads the sealed snapshot, ranks every eligible pre-token protocol by the
// v1 implied-value model, writes board.json, the dashboard and its data, the
// screenshots, and dossier.json (via vendor/makefun-board.ts).
// Node 22 stdlib only. Run locally:
//   MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
// In the grader it reads /input/snapshot.json (or $MAKEFUN_INPUT_DIR) and
// writes /output. It never deletes the output directory itself: the grader
// owns /output, so only its contents are cleared (rmSync of the directory
// itself fails EPERM there and kills the run).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-board.ts";
import {
  computeRows,
  topComparables,
  GAS,
  GAS_FALLBACK,
  PLAYBOOKS,
  GENERIC_PLAYBOOK,
  STEP_FRAMES,
} from "./lib/model.ts";

const ROOT = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]): { input?: string } {
  const out: { input?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input" && i + 1 < argv.length) out.input = argv[++i];
  }
  return out;
}

function inputPath(): string {
  const args = parseArgs(process.argv.slice(2));
  if (args.input) return args.input;
  const dir = process.env.MAKEFUN_INPUT_DIR;
  if (dir) return join(dir, "snapshot.json");
  return "/input/snapshot.json";
}

function outputDir(): string {
  return process.env.MAKEFUN_OUTPUT_DIR || "/output";
}

// Clear only the CONTENTS of dir; never remove dir itself.
function clearContents(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return;
  }
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function main(): void {
  const inFile = inputPath();
  const outDir = outputDir();
  const snap = JSON.parse(readFileSync(inFile, "utf8"));
  const rows = computeRows(snap);
  const comps = topComparables(snap, 12);

  clearContents(outDir);

  // board.json: the ranked board (extra keys allowed by the gate).
  const board = {
    as_of: snap.as_of,
    rows: rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      category: r.category,
      chain: r.chain,
      tvl_usd: r.tvl,
      change_7d: r.change7d,
      rank: r.rank,
      implied_value_usd: r.implied,
      ratio: Math.round(r.ratio * 10000) / 10000,
      growth_factor: Math.round(r.growth * 10000) / 10000,
      age_factor: Math.round(r.age * 10000) / 10000,
      watchlist: r.watchlist,
      farm_steps: r.farm_steps,
    })),
  };
  writeFileSync(join(outDir, "board.json"), JSON.stringify(board, null, 2) + "\n", "utf8");

  // dashboard/: copy the page, then write its generated data beside it.
  const dashOut = join(outDir, "dashboard");
  mkdirSync(dashOut, { recursive: true });
  for (const f of ["index.html", "app.css", "app.js"]) {
    cpSync(join(ROOT, "dashboard", f), join(dashOut, f));
  }
  const data = {
    as_of: snap.as_of,
    floor_usd: snap.floor_usd,
    total: rows.length,
    rows: rows.map((r) => [
      r.slug,
      r.name,
      r.category,
      r.chain,
      r.tvl,
      r.change7d,
      r.implied,
      r.rank,
      r.watchlist ? 1 : 0,
      Math.round(r.ratio * 10000) / 10000,
      Math.round(r.growth * 10000) / 10000,
      Math.round(r.age * 10000) / 10000,
    ]),
    gas: GAS,
    gas_fallback: GAS_FALLBACK,
    playbooks: PLAYBOOKS,
    generic_playbook: GENERIC_PLAYBOOK,
    step_frames: STEP_FRAMES,
    comparables: comps.map((c) => [c.name, c.category, c.tvl, c.mcap]),
  };
  writeFileSync(
    join(dashOut, "data.js"),
    "var TOKEN_RADAR_DATA = " + JSON.stringify(data) + ";\n",
    "utf8"
  );

  // screenshots/: copy as-is (3 JPEGs rendered from this dashboard).
  const shotsOut = join(outDir, "screenshots");
  mkdirSync(shotsOut, { recursive: true });
  cpSync(join(ROOT, "screenshots"), shotsOut, { recursive: true });

  // dossier.json, exactly as the scorer's library writes it.
  const dossier = buildDossier(outDir, { text_max_bytes: 65536 });
  writeFileSync(join(outDir, "dossier.json"), Buffer.from(dossier));

  const top = rows[0];
  console.log(
    "token-radar v3: " +
      rows.length +
      " rows, watchlist " +
      rows.filter((r) => r.watchlist).length +
      "/" +
      snap.watchlist.length +
      ", top " +
      top.slug +
      " $" +
      top.implied.toLocaleString("en-US") +
      ", dossier " +
      dossier.length +
      " bytes -> " +
      outDir
  );
}

main();
