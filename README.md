# Token Radar v4

Best crypto airdrop aggregator: a web dashboard that tracks pre-token protocols to farm, sorted by implied value, with a costed farm plan for each.

`main.ts` (Node 22, standard library only) reads a sealed snapshot of the protocol universe, writes a ranked board (`board.json`), the dashboard data (`data.js`), copies `dashboard/` and `screenshots/` to the output, and writes `dossier.json` via `buildDossier` from `vendor/makefun-board.ts`.

The value model ("radar-4" / clean2) is a power-law curve fitted to traded tokens in the same snapshot (OLS log-log, R² = 0.143), times a maturity multiplier and a LOW-category multiplier only — no growth, chain, or HIGH multipliers. Each row also carries Value/Cost (implied value divided by estimated farm cost), a FARM / THIN / SKIP verdict from netted low-end economics (SO-TRV4-042: net P10 ≥ 3× biaya, bukan lagi median split), and a Rising flag for fast-growing young protocols below the watchlist floor. The dashboard opens with `dashboard/00-proof.md`: the model, its blind test (20/20 splits, computed at build time in `lib/validation.ts`), and the checks a skeptic can rerun. The build also writes `validation.json`: every validation number (blind test, LOO, walk-forward, in-band slope, zero-mcap table, multivariate coefficients, LOW ablation, gas/capital tables), computed from the snapshot. Claim-by-claim audit trail: `REPRODUCIBILITY_REPORT.md` (SO-TRV4-045) in the workspace.

The program is deterministic: repeated runs write identical bytes.

## Status (SO-TRV4-054, 2026-11-17)

- Board: **182 rows, watchlist coverage 40/40**, verdicts **FARM 11 / THIN 13 / SKIP 158**
- Model: radar-4 / clean2 (K1), R² = 0.143; blind test 20/20, typical error 3.38× vs 5.04× naive; walk-forward 2 (60/40): 2.20× vs 4.84×
- Hero: Nucleus, **+$40.57/hour (P10)**; farm book 11 FARM, cost $581.50, implied $44,709,687
- Blind Judge #5 (fresh): **88/100 NOT READY** — honest ceiling 90–91, below the bar 93 (DEC-0040)
- Devil's Advocate gate (DEC-0021): **VETO (HOLD)** — binding. **NOT submitted.** Quota stays 18/20.
- Full round report: `CEO_ROUND_054_FINAL.md` in the workspace (`~/workspace/makefun/token-radar-v4/`).
