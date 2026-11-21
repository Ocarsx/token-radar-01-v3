# token-radar-01-v3

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Ocarsx/token-radar-01-v3/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Ocarsx/token-radar-01-v3/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar — Pre-Token Protocol Board III. A program (Node 22, standard library only) that reads a frozen DefiLlama snapshot of 758 protocols, ranks the 198 eligible pre-token protocols by implied token value — TVL × category median mcap/TVL × growth factor × age factor — and writes a dashboard with a six-step farm plan for each one. v3 restores the v1 valuation model exactly and keeps the v2 dashboard: implied-value distribution chart, sortable and searchable board, per-protocol detail with the factor breakdown, copyable farm plans, and a separate table of the twelve largest tokenized comparables with their real market caps.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input path/to/snapshot.json
```

This writes `out/board.json`, `out/dashboard/` (the page and its data), `out/screenshots/` and `out/dossier.json`. Run it twice into two directories to check determinism: the outputs are byte-identical.

---

<sub>Entered on [make.fun](https://make.fun/?ref=s1m1n3px&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
