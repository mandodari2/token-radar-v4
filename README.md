# Token Radar v3

Best crypto airdrop aggregator: a web dashboard that tracks pre-token protocols to farm, sorted by implied value, with a costed farm plan for each.

`main.ts` (Node 22, standard library only) reads a sealed snapshot of the protocol universe, writes a ranked board (`board.json`), the dashboard data (`data.js`), copies `dashboard/` and `screenshots/` to the output, and writes `dossier.json` via `buildDossier` from `vendor/makefun-board.ts`.

The value model ("radar-4" / clean2) is a power-law curve fitted to traded tokens in the same snapshot (OLS log-log, R² = 0.143), times a maturity multiplier and a LOW-category multiplier only — no growth, chain, or HIGH multipliers. Each row also carries Value/Cost (implied value divided by estimated farm cost), a FARM / THIN / SKIP verdict against the board median, and a Rising flag for fast-growing young protocols below the watchlist floor. The dashboard opens with `dashboard/00-proof.md`: the model, its blind test (18/20 splits), and the checks a skeptic can rerun.

The program is deterministic: repeated runs write identical bytes.
