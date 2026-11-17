// A working token-radar-01 entry (Node 22, standard library only).
//
// The program reads the sealed snapshot from /input/snapshot.json (or --input <file|dir>), scores every
// pre-token protocol with the model in lib/model.ts, writes the ranked board to /output/board.json
// and copies this repository's dashboard/ and screenshots/ to /output. Last, it writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
// SO-TRV4-041 tambahan (audit Chairman 17 Nov 2026): raw_board.json DIHAPUS dari
// pipeline — duplikat byte-identik board.json (dulu handoff Agen 1→2, tidak ada
// yang membacanya di build/dashboard). Pipeline hanya menulis board.json + data.js.
//
// The dashboard is a static page, no framework and no network: dashboard/index.html, dashboard/app.css
// and dashboard/app.js read /output/data.js, which this program writes from the same board. A starting
// point, not a winner: it covers the watchlist, states the model and gives every protocol a farm plan.
// Change the model, the page or the plan; keep the gate's shape.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRadar, dataScript, farmStepsIssue, MODEL, parseSnapshot, structuralIssue } from './lib/model.ts';
import { fmtId, validateSnapshot, type ValidationReport } from './lib/validation.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** The scorer's own caps (reference/gate.json): the text cap shapes the bytes, the rest refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** --name <value> out of the arguments, or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  process.stderr.write(`token radar: no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input\n`);
  process.exit(2);
}
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
// SO-TRV4-042/050 — pipa dua-pass (verdict netted butuh bands P10, bands
// dihitung dari board): pass 1 (--pass1) menulis board sementara ke direktori
// scratch untuk rnd/bootstrap_bands.py saja; pass 2 (--bands <file>) menulis
// board final. Tanpa --bands DAN tanpa --pass1, build GAGAL KERAS (exit 2) —
// tidak ada fallback diam-diam ke aturan median.
const pass1 = process.argv.includes('--pass1');
const bandsArg = arg('bands', '');
let impliedP10: ReadonlyMap<string, number> | null = null;
if (!pass1) {
  if (!bandsArg) {
    process.stderr.write('token radar: verdict netted (SO-TRV4-042) butuh --bands <bands_p10_p90.json>; jalankan dulu --pass1 lalu rnd/bootstrap_bands.py — tidak ada fallback ke median\n');
    process.exit(2);
  }
  if (!existsSync(bandsArg)) {
    process.stderr.write(`token radar: bands file tidak ada: ${bandsArg}\n`);
    process.exit(2);
  }
  // SO-TRV4-053 (audit back end): dulu JSON rusak crash SyntaxError mentah.
  let bandsDoc: { rows: { slug: string; implied_p10: number }[] };
  try {
    bandsDoc = JSON.parse(readFileSync(bandsArg, 'utf8')) as { rows: { slug: string; implied_p10: number }[] };
  } catch {
    process.stderr.write(`token radar: bands file bukan JSON valid: ${bandsArg}\n`);
    process.exit(2);
  }
  if (!Array.isArray(bandsDoc.rows)) {
    process.stderr.write(`token radar: bands file tidak punya array rows: ${bandsArg}\n`);
    process.exit(2);
  }
  impliedP10 = new Map(bandsDoc.rows.map((r) => [r.slug, r.implied_p10] as const));
}

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const { board, radar } = buildRadar(snapshot, MODEL, impliedP10);
// Pass-1: board sementara masih memakai verdict median lama — periksa
// kelengkapan bands di sini (slug board yang tidak ada di peta = gagal keras),
// lalu tulis board.json + data.js + validation.json saja dan berhenti
// (tanpa dossier/screenshot — board ini scratch, bukan final).
if (pass1) {
  const validationPass1: ValidationReport = validateSnapshot(snapshot, board);
  // SO-TRV4-053 (audit back end): pass-1 dulu melewatkan gate struktural —
  // board yang kehilangan watchlist / berisi implied tak valid baru ketahuan
  // di final, sesudah bootstrap. Gagal cepat di sini (verdict tidak dicek:
  // board pass-1 memang masih verdict median lama).
  const structuralPass1 = structuralIssue(board, snapshot);
  if (structuralPass1 !== null) {
    process.stderr.write(`token radar: PASS-1 board ditolak gate: ${structuralPass1}\n`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
  writeFileSync(join(out, 'data.js'), dataScript(radar, board, validationPass1));
  writeFileSync(join(out, 'validation.json'), `${JSON.stringify(validationPass1, null, 2)}\n`);
  process.stdout.write(`token radar: PASS-1 (scratch, verdict median lama — BUKAN final): ${board.length} rows -> ${join(out, 'board.json')}; jalankan rnd/bootstrap_bands.py pada board ini, lalu build ulang dengan --bands\n`);
  process.exit(0);
}
// SO-TRV4-045: validation suite, computed at build time from the same snapshot
// (lib/validation.ts). The dashboard renders its validation numbers from
// window.VALIDATION in data.js; the dossier's 00-proof.md §3 quotes the same
// computed numbers — the guard below fails the build if the prose drifts.
const validation: ValidationReport = validateSnapshot(snapshot, board);
// SO-TRV4-045 honesty guard FIRST (before writing anything): dashboard/
// 00-proof.md §3 must quote the computed validation numbers, not stale
// hand-typed ones. A drift fails the build loudly instead of silently
// shipping numbers the build no longer produces.
proofGuard(validation);
// Verdict log (SO-TRV4-042, netted): distribusi verdict dicetak dari hasil
// hitungan board ini — bukan syarat yang harus dipenuhi (audit Chairman 17 Nov 2026).
const verdictCounts = { FARM: 0, THIN: 0, SKIP: 0 };
for (const r of board) verdictCounts[r.verdict]++;
// Structural gate is fatal: coverage, ranks 1..N, monotonic implied values, distinct values.
// Farm steps are a warning for now, not a failure: Agen 1 ships farm_steps: [] by design (SPEC
// section 11.3) and Agen 2 implements them as deterministic code in lib/model.ts. The farm_steps
// gate itself is enforced by `makefun check` at packaging, once Agen 2 has filled them.
const structural = structuralIssue(board, snapshot);
if (structural !== null) {
  process.stderr.write(`token radar: the model wrote a board the gate refuses: ${structural}\n`);
  process.exit(1);
}
const farm = farmStepsIssue(board);
if (farm !== null) {
  process.stderr.write(`token radar: WARNING (Agen 1 interim): ${farm} — farm_steps is Agen 2's deliverable, see lib/model.ts\n`);
}

mkdirSync(out, { recursive: true });
const boardJson = `${JSON.stringify({ rows: board })}\n`;
writeFileSync(join(out, 'board.json'), boardJson);
writeFileSync(join(out, 'data.js'), dataScript(radar, board, validation));
writeFileSync(join(out, 'validation.json'), `${JSON.stringify(validation, null, 2)}\n`);

/** SO-TRV4-045 honesty guard: dashboard/00-proof.md §3 must quote the computed
 * validation numbers, not stale hand-typed ones. A drift fails the build loudly
 * instead of silently shipping numbers the build no longer produces. */
function proofGuard(v: ValidationReport): void {
  const proofPath = join(here, 'dashboard', '00-proof.md');
  const proof = readFileSync(proofPath, 'utf8');
  const inBand = v.bands.find((b) => b.label === '$100 jt–$1 M')!;
  const zero100k = v.zeroMcap.find((z) => z.floorUsd === 100_000)!;
  const expected = [
    `blind-tested ${v.blind.wins}/20`,
    `error tipikal ${fmtId(v.blind.curveMedianMiss)}x vs ${fmtId(v.blind.flatMedianMiss)}x`,
    `LOO **${fmtId(v.loo.modelMiss)}x vs ${fmtId(v.loo.flatMiss)}x**`,
    `**${fmtId(v.walkForward.modelMiss)}x vs ${fmtId(v.walkForward.flatMiss)}x**`,
    // SO-TRV4-056 (Blind Judge K2 +1b): walk-forward kedua, split 60/40.
    `walk-forward kedua (60/40) **${fmtId(v.walkForward2.modelMiss)}x vs ${fmtId(v.walkForward2.flatMiss)}x**`,
    `in-band slope ${fmtId(inBand.slope)}`,
    `Floor $100.000 → ${fmtId(zero100k.slope, 3)}`,
    `menghapus LOW memperburuk error old-vs-young sebesar +${fmtId(v.lowAblation.pooledDeltaDex)} dex`,
  ];
  for (const s of expected) {
    if (!proof.includes(s)) {
      process.stderr.write(`token radar: 00-proof.md §3 does not quote the computed validation (${JSON.stringify(s)} missing) — update the prose to the build's numbers, do not edit this guard\n`);
      process.exit(1);
    }
  }
}

/** Copy one directory's regular files into `to`, skipping names that start with a dot. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

const dash = copyFiles(join(here, 'dashboard'), join(out, 'dashboard'));
const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  process.stderr.write(`token radar: screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`);
  process.exit(1);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    process.stderr.write(`token radar: screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters\n`);
    process.exit(1);
  }
}

// The dossier is written last: the scorer rebuilds it from this /output and compares bytes.
writeFileSync(join(out, 'dossier.json'), buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SCREENSHOT_CAPS, dashboard: { max_files: 400, max_bytes: 4_194_304 } }));

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
    `token radar: median Value/Cost ${radar.median_value_cost.toFixed(1)}x, verdicts FARM ${verdictCounts.FARM} / THIN ${verdictCounts.THIN} / SKIP ${verdictCounts.SKIP}\n` +
    `token radar: validation (computed, lib/validation.ts): OLS R² ${validation.fit.r2.toFixed(3)} slope ${validation.fit.slope.toFixed(3)} CI [${validation.fit.ciSlope95[0].toFixed(2)}, ${validation.fit.ciSlope95[1].toFixed(2)}]; blind ${validation.blind.wins}/20, ${validation.blind.curveMedianMiss.toFixed(2)}x vs ${validation.blind.flatMedianMiss.toFixed(2)}x; LOO ${validation.loo.modelMiss.toFixed(2)}x vs ${validation.loo.flatMiss.toFixed(2)}x; WF ${validation.walkForward.modelMiss.toFixed(2)}x vs ${validation.walkForward.flatMiss.toFixed(2)}x\n` +
    `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${join(out, 'validation.json')}, ${join(out, 'dashboard')} (${dash.length} files), ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
);
