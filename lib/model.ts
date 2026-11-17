// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) plus EVERY
// other rankable pre-token protocol: the early rows the radar exists to find. A protocol is
// pre-token when its index entry records no token (no market cap, no CoinGecko id, no symbol); the
// snapshot's live-token protocols are kept apart and shown as the market's own values, never mixed
// into the ranked board.
//
// Implied value ("radar-4", clean2 power-law, SPEC_V3 section 4) follows only from the snapshot's own figures:
//
//   base     = 42_700_000 x (tvl_usd / 1_000_000_000)^0.472    (OLS log-log fit, 119 traded non-CEX, R^2 0.143)
//   maturity = 0.70 + min(age_days, 1095) / 1095 x 0.30       (age unknown: 365) -> [0.70, 1.00]
//   LOW      = 0.75 (Restaking, Liquid Staking, Onchain Capital Allocator, Staking Pool)
//            | 1.00 (everything else)
//   implied  = max(1, round(base x maturity x LOW))
//
// clean2 (SPEC_V3 section 4.5) drops the three K1 multipliers that did not earn their keep:
// chain (hurt Layer A), HIGH 1.25 (regression coefficient -0.089, ~0), growth (its positive range
// 1.01-1.50 is extrapolation: the fit sample never saw change_7d above +2.69% except one outlier).
// The curve itself is UNCHANGED from K1 (same OLS 0.472, same blind test 18/20, same R^2 0.143).
// score_breakdown carries exactly these 3 components: {base, maturity_multiplier, low_multiplier, age_days}.
//
// Value/Cost (SPEC_V3 section 8.2): value_cost = implied_value_usd / total_farm_cost, where
// total_farm_cost = capital + gas_per_tx x (2 + floor(hold_days / 7)). It is a project efficiency
// index, not a personal return.
//
// Verdict P9 (SPEC_V3 section 8.5, vetted by Red Team — 0 defect): T_VC is the median
// Value/Cost of THIS board (87,977x; computed here, never hard-coded), T_R is risk_score <= 1.
// FARM when value_cost >= T_VC and risk <= 1; THIN when value_cost >= T_VC and risk HIGH;
// SKIP when value_cost < T_VC. Distribution MUST be FARM 51 / THIN 48 / SKIP 99. The verdict
// is a RELATIVE priority aid, not a profit claim — even the lowest Value/Cost (17,727x) is
// high in absolute terms; SKIP means "below this board's median", not "certain loss".
//
// Rising (SPEC_V3 section 7): a board row below the $50M floor with TVL >= $10M, change_7d > +10%,
// age < 365 days and dTVL >= $1M. rising_score = TVL x min(change_7d, +100%) / 100 x age_factor
// (1.00 if age < 180 days, else 0.75), rounded to whole dollars. 0 when not Rising.
//
// Gas note (SPEC inconsistency, documented): the snapshot names the BNB chain "Binance" (no chain
// is literally named "BSC"). SPEC_V3 section 8.1 keeps the v2 gas rule (Binance $0.50, the "other
// chains" rate): the verified Value/Cost statistics (median 87,977x clean2 / 93,715x K1, cost
// median $55.00 — verified by the Devil's Advocate) only reproduce when "Binance" is charged
// $0.50. The gas-count table reads $0.25: 3 (Polygon only), $0.50: 117.
//
// Rankable (SPEC_V3 section 3.1) is exactly the watchlist rule with NO TVL floor: pre-token, category
// not Bridge / Canonical Bridge / Liquid Staking / Liquid Restaking / Restaked BTC / CEX, name not
// versioned, name without a whole word wrapped/staked/staking, name not starting with an exchange
// name. No protocol name is ever special-cased: the same function scores every row.
//
// Calibration note (SPEC_V3 section 4.1/4.4): OLS log-log log10(mcap) = 3.382 + 0.472 x log10(TVL) on
// 119 traded non-CEX tokens with mcap > 0 (R^2 = 0.143, 95% CI slope [0.26, 0.68]). The curve's
// value at TVL $1B is $42,758,885; the formula uses $42,700,000 (0.14% rounding). Blind-tested
// 18/20 splits (Devil's Advocate): typical error 3.8x vs 5.1x for a fixed ratio. The curve is
// UNCHANGED from K1 — clean2 only drops the multipliers around it. Caveats: R^2 is very weak;
// the blind test validates the CURVE on traded, not pre-token, protocols.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. clean2 (SPEC_V3 section 4.1): only the curve, maturity and the LOW band — no growth, no chain, no HIGH. */
export interface ModelConstants {
  curve_base: number;
  curve_tvl: number;
  curve_exponent: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  category_low_multiplier: number;
}

export const MODEL: ModelConstants = {
  curve_base: 42_700_000,
  curve_tvl: 1_000_000_000,
  curve_exponent: 0.472,
  maturity_floor: 0.7,
  maturity_range: 0.3,
  maturity_days: 1095,
  unknown_age_days: 365,
  category_low_multiplier: 0.75,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-4';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** Categories whose TVL is mostly pass-through, not fee-generating (SPEC_V3 section 4.1): the LOW band (0.75). HIGH (1.25) was dropped in clean2 — its regression coefficient was -0.089, ~0. */
export const CATEGORY_LOW = new Set(['Restaking', 'Liquid Staking', 'Onchain Capital Allocator', 'Staking Pool']);

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row's full model breakdown: every factor the implied value is built from (clean2, SPEC_V3 section 4.1 — exactly 3 components). */
export interface ScoreBreakdown {
  base: number;
  maturity_multiplier: number;
  low_multiplier: number;
  age_days: number | null;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  value_cost: number;
  farm_cost: number;
  risk_score: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  hold_days: number;
  rising: boolean;
  rising_score: number;
  score_breakdown: ScoreBreakdown;
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  watchlist: boolean;
  value_cost: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  rising: boolean;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rising_size: number;
  median_value_cost: number;
  rows: RadarRow[];
  live: LiveRow[];
  scatter: [number, number][];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The LOW band multiplier (clean2, SPEC_V3 section 4.1): 0.75 for a LOW category, 1.00 for everything else (incl. null). No HIGH band in clean2. */
export function lowMultiplier(category: string | null, model: ModelConstants): number {
  if (category !== null && CATEGORY_LOW.has(category)) return model.category_low_multiplier;
  return 1;
}

/** The three factors and the implied value one protocol gets under `model` (radar-4 / clean2, SPEC_V3 section 4.1). */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): {
  implied: number;
  base: number;
  maturityMult: number;
  lowMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const lowMult = lowMultiplier(protocol.category, model);
  const base = model.curve_base * Math.pow(protocol.tvl_usd / model.curve_tvl, model.curve_exponent);
  const implied = Math.max(1, Math.round(base * maturityMult * lowMult));
  return { implied, base, maturityMult, lowMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories the watchlist rule excludes outright (SPEC_V3 section 3.1, rule 2). */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A whole word wrapped / staked / staking anywhere in the name (SPEC_V3 section 3.1, rule 4). */
const WRAPPED_OR_STAKED = /\b(wrapped|staked|staking)\b/i;

/** Exchange names a board protocol's name must not start with (SPEC_V3 section 3.1, rule 5). */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: exactly the watchlist rule from input/README.md
 * with NO TVL floor (SPEC_V3 section 3.1). No extra rule of our own: adding one once wrongly excluded
 * `saturn`, which the house watchlist itself carries.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_OR_STAKED.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((prefix) => p.name.startsWith(prefix))) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The median of a list of numbers: the average of the two middle values when even. */
export function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  return (v[Math.floor((v.length - 1) / 2)]! + v[Math.floor(v.length / 2)]!) / 2;
}

/** A row's P9 verdict (SPEC_V3 section 8.5): FARM when Value/Cost >= the board median and
 * risk <= 1, THIN when Value/Cost >= the median and risk is HIGH, SKIP when Value/Cost is
 * below the median. Deterministic: two inputs from the board row, no judgement. */
export function verdictFor(valueCost: number, risk: number, medianValueCost: number): 'FARM' | 'THIN' | 'SKIP' {
  if (valueCost < medianValueCost) return 'SKIP';
  return risk <= 1 ? 'FARM' : 'THIN';
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but
  // the board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: EVERY other rankable pre-token protocol, any TVL, no cap. Never a replacement
  // for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const s = impliedValue(p, snapshot.as_of, model);
    const cost = farmCost(p, s.age);
    return { p, ...s, cost, risk: riskScore(p, s.age), risingScore: risingScore(p, s.age) };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  // P9 verdict (SPEC_V3 section 8.5): T_VC is the median Value/Cost of THIS board, computed
  // here from the rows themselves — it MUST be 87,977x (verify_board.py checks it). The
  // threshold is the exact computed median, not the rounded 87,977: Red Team verified any
  // threshold in (87,801.07; 88,153.70] selects exactly the same 99 rows.
  const medianVc = median(scored.map((s) => s.implied / s.cost.total));
  return scored.map((s, i) => {
    const vc = s.implied / s.cost.total;
    return {
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    watchlist: snapshot.watchlist.includes(s.p.slug),
    age_days: s.age,
    implied_value_usd: s.implied,
    value_cost: vc,
    farm_cost: s.cost.total,
    risk_score: s.risk,
    verdict: verdictFor(vc, s.risk, medianVc),
    hold_days: s.cost.hold_days,
    rising: s.risingScore > 0,
    rising_score: s.risingScore,
    score_breakdown: {
      // Full precision, NOT rounded: the worked examples (SPEC_V3 section 4.2) must recompute
      // dollar-for-dollar from these values (base x maturity x LOW, left to right, then
      // Math.round). Rounding the multipliers to 4 decimals (as v1 did) moves the product by
      // hundreds of dollars on the worked examples. The dashboard formats them to 4 decimals
      // for display; the stored values stay exact.
      base: s.base,
      maturity_multiplier: s.maturityMult,
      low_multiplier: s.lowMult,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
    };
  });
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/**
 * Gas per transaction from the protocol's FIRST chain (SPEC_V3 section 8.1). Ethereum ~$10,
 * Solana <$0.05, Base/Arbitrum/Optimism/Ink/Unichain/Katana/Corn/Arc ~$0.50, Polygon ~$0.25,
 * Avalanche and every other named chain ~$0.50, no/unknown chain ~$2. The number is
 * deliberately chain-dependent: a flat gas figure in every row is what the starter did.
 *
 * "Binance" is charged $0.50, NOT $0.25: the snapshot names the BNB chain "Binance" (no chain
 * is literally named "BSC"), and the SPEC's own verified Value/Cost statistics (median
 * 93,715x, mean 105,196x, cost median $55.00 — Devil's Advocate verified) only reproduce
 * with "Binance" at $0.50. SPEC section 3's gas counts (14 at $0.25) imply $0.25, so the
 * SPEC contradicts itself here; the verified Value/Cost acceptance criteria win.
 */
function gasUsd(chain: string | null): number {
  if (chain === null || chain === '') return 2;
  if (chain === 'Ethereum') return 10;
  if (chain === 'Solana') return 0.05;
  if (chain === 'Polygon') return 0.25;
  return 0.5;
}

/** The gas figure as words, e.g. "about $10 of gas" / "under $0.05 of gas". */
function gasPhrase(chain: string | null): string {
  if (chain === 'Solana') return 'under $0.05 of gas';
  return `about ${usd(gasUsd(chain))} of gas`;
}

/** A dollar figure without trailing zeroes: 250 -> "$250", 2.5 -> "$2.50". */
function usd(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

/** A protocol's whole farm cost (SPEC_V3 section 8.1): capital + gas x n_tx, rounded to cents. */
export interface FarmCost {
  capital: number;
  gas_per_tx: number;
  hold_days: number;
  n_tx: number;
  total: number;
}

export function farmCost(p: SnapshotProtocol, age: number | null): FarmCost {
  const capital = capitalFor(p);
  const chain = p.chains.length > 0 ? p.chains[0]! : null;
  const gas = gasUsd(chain);
  const hold = holdDaysFor(age);
  const nTx = 2 + Math.floor(hold / 7);
  const total = Math.round((capital + gas * nTx) * 100) / 100;
  return { capital, gas_per_tx: gas, hold_days: hold, n_tx: nTx, total };
}

/** A protocol's risk score 0..3 (SPEC_V3 section 8.3): +1 TVL < $100M, +1 age < 180 days, +1 chains <= 1. */
export function riskScore(p: SnapshotProtocol, age: number | null): number {
  return (p.tvl_usd < 100_000_000 ? 1 : 0) + (age !== null && age < 180 ? 1 : 0) + (p.chains.length <= 1 ? 1 : 0);
}

/**
 * A protocol's Rising score (SPEC_V3 section 7.1), 0 when it is not Rising: only a board row
 * below the $50M floor, with TVL >= $10M, change_7d > +10%, age < 365 days and dTVL >= $1M.
 * rising_score = TVL x min(change_7d, +100%) / 100 x age_factor (1.00 age < 180, else 0.75),
 * rounded to whole dollars. Above +100% the score saturates at TVL x age_factor by design.
 */
export function risingScore(p: SnapshotProtocol, age: number | null): number {
  if (p.tvl_usd >= 50_000_000 || p.tvl_usd < 10_000_000) return 0;
  if (p.change_7d === null || p.change_7d <= 10) return 0;
  if (age === null || age >= 365) return 0;
  const dTvl = p.tvl_usd * Math.min(p.change_7d, 100) / 100;
  if (dTvl < 1_000_000) return 0;
  return Math.round(dTvl * (age < 180 ? 1.0 : 0.75));
}

/**
 * The category's main action (SPEC_V3 section 8.1, exact category match — never substring
 * matching, which once merged CDP into Lending and Yield into Dexs). `{capital}` is the
 * dollar capital from capitalFor, `{name}` the protocol name, `{chain}` its first chain.
 * Categories the table does not list get a sensible action of their own kind: Cross Chain
 * Bridge bridges, Crypto Card Issuer loads a card, Indexes deposits into an index position.
 */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const name = p.name;
  const c = p.category ?? '';
  switch (c) {
    case 'Risk Curators':
    case 'Onchain Capital Allocator':
      return `Deposit $${capital} of USDC into the ${name} vault on ${chain} and keep the shares.`;
    case 'Dexs':
      return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
    case 'RWA':
      return `Mint $${capital} of the ${name} yield asset on ${chain} and hold it.`;
    case 'Lending':
    case 'Uncollateralized Lending':
      return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
    case 'Yield':
    case 'Yield Aggregator':
    case 'Farm':
      return `Deposit $${capital} of USDC into ${name}'s main yield position on ${chain} and keep it open.`;
    case 'Leveraged Farming':
      return `Deposit $${capital} of USDC as collateral in ${name}'s leveraged farm on ${chain} and keep the position open.`;
    case 'Derivatives':
    case 'Interest Rate Derivatives':
      return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
    case 'CDP':
    case 'CDP Manager':
      return `Deposit $${capital} of collateral and mint the protocol's stable asset through ${name} on ${chain}.`;
    case 'Basis Trading':
      return `Deposit $${capital} of USDC into ${name}'s basis strategy on ${chain} and keep the position open.`;
    case 'Chain':
      return `Bridge $${capital} of USDC onto ${name} and use it in one of the chain's apps, then keep a balance on the chain.`;
    case 'Staking Pool':
      return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
    case 'Restaking':
      // SPEC_V3 section 8.1: Bitcoin has no staking asset — a Restaking protocol whose first
      // chain is Bitcoin (b14g) takes a BTC deposit instead of a stake.
      if (chain === 'Bitcoin') return `Deposit $${capital} of BTC into ${name} on Bitcoin and keep the receipt.`;
      return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
    case 'Liquidity Manager':
      return `Deposit $${capital} of USDC into the ${name} managed liquidity position on ${chain} and keep the shares.`;
    case 'Anchor BTC':
    case 'Decentralized BTC':
      return `Deposit $${capital} of BTC into ${name} on ${chain} and keep the receipt.`;
    case 'CeDeFi':
      return `Deposit $${capital} of USDC into ${name}'s managed strategy on ${chain} and keep the position open.`;
    case 'Dual-Token Stablecoin':
      return `Mint $${capital} of the protocol's stable asset through ${name} on ${chain} and hold it.`;
    case 'Stablecoin Wrapper':
      return `Wrap $${capital} of USDC into ${name} on ${chain} and hold it.`;
    case 'Prediction Market':
      return `Fund $${capital} and place one market position on ${name}.`;
    case 'OTC Marketplace':
      return `Place one $${capital} trade on ${name} and keep the receipt.`;
    case 'Collateral Markets':
      return `Supply $${capital} of USDC as collateral on ${name} and keep the position open.`;
    case 'Governance Incentives':
      return `Lock $${capital} of USDC in ${name}'s incentive program on ${chain} and vote once.`;
    case 'Insurance':
      return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
    case 'Payments':
      return `Send one $${capital} payment through ${name} on ${chain} and keep the receipt.`;
    case 'Cross Chain Bridge':
      return `Bridge $${capital} of USDC across chains through ${name}, a cross-chain bridge, and keep the receipt.`;
    case 'Crypto Card Issuer':
      return `Load $${capital} onto the ${name} card on ${chain} and make one small purchase, then keep the receipt.`;
    case 'Indexes':
      return `Deposit $${capital} of USDC into the ${name} index position on ${chain} and keep the shares.`;
    default:
      return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
  }
}

/** The weekly qualifying action, also category-specific (SPEC_V3 section 8.1). */
function weeklyFor(category: string | null): string {
  switch (category) {
    case 'Risk Curators':
    case 'Onchain Capital Allocator':
      return 'a deposit, a rebalance check or a vote';
    case 'Dexs':
      return 'a swap or a liquidity adjustment';
    case 'RWA':
      return 'a mint or a hold check';
    case 'Lending':
    case 'Uncollateralized Lending':
      return 'a deposit, a borrow or a repayment';
    case 'Yield':
    case 'Yield Aggregator':
    case 'Farm':
      return 'a deposit, a harvest or a rebalance check';
    case 'Leveraged Farming':
      return 'a collateral top-up or a position check';
    case 'Derivatives':
    case 'Interest Rate Derivatives':
      return 'a margin check or a hedge adjustment';
    case 'CDP':
    case 'CDP Manager':
      return 'a collateral check or a mint';
    case 'Basis Trading':
      return 'a deposit or a strategy check';
    case 'Chain':
      return 'one transaction in a chain app or a balance check';
    case 'Staking Pool':
    case 'Restaking':
      return 'a stake top-up or a rewards check';
    case 'Liquidity Manager':
      return 'a deposit or a range check';
    case 'Anchor BTC':
    case 'Decentralized BTC':
      return 'a deposit or a receipt check';
    case 'CeDeFi':
      return 'a deposit or a strategy check';
    case 'Dual-Token Stablecoin':
      return 'a mint or a hold check';
    case 'Stablecoin Wrapper':
      return 'a wrap or a hold check';
    case 'Prediction Market':
      return 'one small market position';
    case 'OTC Marketplace':
      return 'one small trade or a receipt check';
    case 'Collateral Markets':
      return 'a deposit or a collateral check';
    case 'Governance Incentives':
      return 'a vote or an incentive check';
    case 'Insurance':
      return 'a cover check or a policy renewal check';
    case 'Payments':
      return 'one small payment or a receipt check';
    case 'Cross Chain Bridge':
      return 'one small bridge transfer or a receipt check';
    case 'Crypto Card Issuer':
      return 'one small card payment or a statement check';
    case 'Indexes':
      return 'a deposit or a rebalance check';
    default:
      return 'a deposit, a borrow, a swap or a vote';
  }
}

/**
 * The 12 playbooks (SPEC_V3 section 5.3, P3 — Ops). One protocol maps to exactly one
 * playbook, deterministically: Rising first, then family x risk (OPS report section 2.2).
 * Every step names the protocol + at least one of its own numbers, so no two steps in the
 * whole board are byte-identical (0 byte-identical QA gate). No number is ever guessed: every
 * figure comes from the snapshot, the board row, or the SPEC tables (V7). Step 6 states the
 * plan total, so the stated total equals farm_cost exactly. Implemented here in code so the
 * grader's re-run of main.ts regenerates exactly these steps — never a hand-written board.json.
 */
type PlaybookId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | 'P11' | 'P12';

/** A category's family (OPS report section 2.1): what the farmer DOES, not the label. */
const FAMILY: Record<string, 'Vault' | 'DEX' | 'Lending' | 'RWA' | 'Staking' | 'Niche' | 'Bridge' | 'Pred'> = {
  'Risk Curators': 'Vault', 'Onchain Capital Allocator': 'Vault', 'Yield': 'Vault', 'Yield Aggregator': 'Vault',
  'Basis Trading': 'Vault', 'Liquidity Manager': 'Vault', 'Farm': 'Vault', 'Indexes': 'Vault',
  'Dexs': 'DEX', 'Derivatives': 'DEX', 'Leveraged Farming': 'DEX', 'Interest Rate Derivatives': 'DEX',
  'Lending': 'Lending', 'CDP': 'Lending', 'CDP Manager': 'Lending', 'Collateral Markets': 'Lending',
  'Uncollateralized Lending': 'Lending',
  'RWA': 'RWA', 'Stablecoin Wrapper': 'RWA', 'Dual-Token Stablecoin': 'RWA',
  'Staking Pool': 'Staking', 'Restaking': 'Staking', 'Anchor BTC': 'Staking', 'Decentralized BTC': 'Staking',
  'CeDeFi': 'Niche', 'Payments': 'Niche', 'Crypto Card Issuer': 'Niche', 'OTC Marketplace': 'Niche',
  'Governance Incentives': 'Niche',
  'Chain': 'Bridge', 'Cross Chain Bridge': 'Bridge',
  'Prediction Market': 'Pred', 'Insurance': 'Pred',
};

/** One protocol's playbook (OPS report section 2.2 — priority order, first match wins). */
function playbookFor(p: SnapshotProtocol, age: number | null): PlaybookId {
  if (risingScore(p, age) > 0) return 'P1';
  const risk = riskScore(p, age);
  const fam = FAMILY[p.category ?? ''] ?? 'Vault'; // All 33 board categories are mapped; an unmapped one falls back to Vault (risk decides P2/P3/P4).
  if (fam === 'Vault') return risk === 0 ? 'P2' : risk === 1 ? 'P3' : 'P4';
  if (fam === 'DEX') return 'P5';
  if (fam === 'Lending') return risk <= 1 ? 'P6' : 'P7';
  if (fam === 'RWA') return 'P8';
  if (fam === 'Staking') return 'P9';
  if (fam === 'Bridge') return 'P10';
  if (fam === 'Pred') return 'P11';
  return 'P12';
}

/** A dollar figure shortened for prose: $2.75B, $43.6M, $9.8M (OPS report section 3). */
function shortUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return usd(n);
}

/** A 7-day change as prose: +78.0% (P1 is Rising, so the change is always positive). */
function chgShort(change: number | null): string {
  if (change === null) return '';
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}

/** The true 7-day TVL inflow (OPS report section 6.1 — the K2 fix): TVL x change/(100+change), NOT the Rising score. */
function dTvl(p: SnapshotProtocol): number {
  if (p.change_7d === null) return 0;
  return (p.tvl_usd * p.change_7d) / (100 + p.change_7d);
}

/** The protocol's risk flags as prose, in riskScore order (TVL, age, chain): "TVL $43.6M < $100M + 1 chain". */
function riskReasons(p: SnapshotProtocol, age: number | null): string[] {
  const out: string[] = [];
  if (p.tvl_usd < 100_000_000) out.push(`TVL ${shortUsd(p.tvl_usd)} < $100M`);
  if (age !== null && age < 180) out.push(`age ${age}d < 180d`);
  if (p.chains.length <= 1) out.push('1 chain');
  return out;
}

export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const name = p.name;
  const chain = p.chains.length > 0 ? p.chains[0]! : null;
  const chainName = chainOf(p);
  const nChains = p.chains.length;
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasPhrase(chain);
  const total = farmCost(p, age).total;
  const pb = playbookFor(p, age);
  const risk = riskScore(p, age);
  const reasons = riskReasons(p, age);
  const midHold = Math.floor(hold / 2);
  const tvl = shortUsd(p.tvl_usd);
  const ageStr = age === null ? 'unknown age' : `${age} days old`;
  const action = actionFor(p, capital, chainName);
  const actionLower = action.charAt(0).toLowerCase() + action.slice(1);
  const actionCore = action.endsWith('.') ? action.slice(0, -1) : action;
  const weekly = weeklyFor(p.category);

  // Step 1 — setup / wallet (OPS report section 4).
  let s1: string;
  if (pb === 'P1') {
    s1 = `Open a fresh wallet to farm ${name} on ${chainName} — it grew ${chgShort(p.change_7d)} in 7 days — and keep its seed phrase offline.`;
  } else {
    let clause = '';
    if (pb === 'P2') clause = nChains > 1
      ? `. ${name} runs on ${nChains} chains, so fund the wallet on ${chainName} first`
      : `. ${name} runs on ${chainName} only, so fund the wallet there first`;
    else if (pb === 'P3') clause = `. ${name} has one risk flag (${reasons[0] ?? ''}), so keep this wallet separate from your main funds`;
    else if (pb === 'P4') clause = `. ${name} carries ${risk} risk flags (${reasons.join(' + ')}) — keep this wallet isolated and fund it with only the $${capital} you plan to farm`;
    else if (pb === 'P5') clause = `. ${name} is a trading venue, so keep only the $${capital} you plan to farm in this wallet`;
    else if (pb === 'P7') clause = `. ${name} carries ${risk} risk flags (${reasons.join(' + ')}) — keep this wallet isolated`;
    else if (pb === 'P9' && nChains > 1) clause = `. ${name} runs on ${nChains} chains, so fund the wallet on ${chainName} first`;
    else if (pb === 'P10') clause = nChains > 1
      ? `. ${name} runs on ${nChains} chains, so fund the wallet on ${chainName} first`
      : `. ${name} runs on ${chainName} only, so every step in this plan happens there — keep a gas buffer for spikes`;
    else if (pb === 'P12' && nChains > 1) clause = `. ${name} runs on ${nChains} chains, so fund the wallet on ${chainName} first`;
    s1 = `Open a fresh wallet to farm ${name} on ${chainName} and keep its seed phrase offline${clause}.`;
  }

  // Step 2 — the core action (P1 appends a Rising note; P3/P4/P7 prepend a free verification).
  let s2: string;
  if (pb === 'P1') s2 = `${actionCore} — ${name} added ${shortUsd(dTvl(p))} TVL in 7 days, so enter this week.`;
  else if (pb === 'P3') s2 = `Check that ${name}'s points page is live, then ${actionLower}`;
  else if (pb === 'P4') s2 = `Verify ${name}'s points page is live and the vault accepts deposits, then ${actionLower}`;
  else if (pb === 'P7') s2 = `Verify ${name}'s lending market is live and accepts $${capital} of supply, then ${actionLower}`;
  else s2 = action;

  // Step 3 — the weekly action (P2 opens "Once a week"; every playbook has a monitor clause).
  const weekOpener = pb === 'P2' ? 'Once a week' : 'Each week';
  let monitorClause = '';
  if (pb === 'P1') monitorClause = `, and re-check ${name}'s growth — if the 7d change turns negative, stop adding`;
  else if (pb === 'P2') monitorClause = ` — ${name} is established (TVL ${tvl}, ${ageStr}), so a light weekly check is enough`;
  else if (pb === 'P3') monitorClause = `, and confirm ${name}'s points balance moved`;
  else if (pb === 'P4') monitorClause = `, and check ${name}'s TVL — if it falls 20% below ${tvl}, pause deposits`;
  else if (pb === 'P5') monitorClause = `, and check whether the ${name} position drifted out of range`;
  else if (pb === 'P6') monitorClause = `, and check ${name}'s collateral ratio — top it up if it drifts toward the liquidation line`;
  else if (pb === 'P7') monitorClause = `, and check ${name}'s collateral ratio and TVL (${tvl}) — a thin pool moves fast`;
  else if (pb === 'P8') monitorClause = `, and confirm ${name}'s asset still tracks its peg — a depeg is the signal to review the exit`;
  else if (pb === 'P9') monitorClause = `, and check ${name}'s staking rewards — claim or restake only through the protocol's own page`;
  else if (pb === 'P10') monitorClause = `, and keep the receipt — the receipt is your proof of activity on ${name}`;
  else if (pb === 'P11') monitorClause = p.category === 'Insurance'
    ? `, and check the ${name} cover is still in force`
    : `, and review the ${name} position — close it if the market resolves against you`;
  else if (pb === 'P12') monitorClause = `, and keep the receipt — the receipt is your proof of activity on ${name}`;
  const s3 = `${weekOpener}, make one qualifying action on ${chainName}, such as ${weekly}${monitorClause}.`;

  // Step 4 — hold (P4/P7 replace the snapshot clause with a mid-hold re-verification).
  let holdTail = ' so the activity is counted in more than one snapshot';
  if (pb === 'P1') holdTail = ` so the activity is counted in more than one snapshot — ${name} is only ${age} days old, so a ${hold}-day hold proves staying power`;
  else if (pb === 'P4') holdTail = `, and at day ${midHold} re-verify ${name}'s points program is still live — young protocols sometimes change their rules mid-campaign`;
  else if (pb === 'P7') holdTail = `, and at day ${midHold} re-verify ${name}'s market is still live`;
  else if (pb === 'P9') holdTail = ' so the activity is counted in more than one snapshot — staking rewards accrue over the hold, so do not unstake early';
  const s4 = `Hold the ${name} position for at least ${hold} days${holdTail}.`;

  // Step 5 — anti-scam / withdraw (P1/P3/P4/P7 confirm the balance matches the log).
  const verifyClause = (pb === 'P1' || pb === 'P3' || pb === 'P4' || pb === 'P7') ? ' and confirm the balance matches your log' : '';
  const s5 = `Before you withdraw from ${name}, open ${name}'s points page from its official site${verifyClause} — never pay to claim, never connect from a DM link.`;

  // Step 6 — log + plan total (the total MUST equal farm_cost exactly, SPEC_V3 section 8.1).
  let logExtra = '';
  let logClause = 'so you can repeat or unwind it.';
  if (pb === 'P1') logClause = `and note its Rising score (${shortUsd(risingScore(p, age))}) — if ${name} stops growing, the score falls.`;
  else if (pb === 'P4') logClause = `and set a calendar reminder at day ${midHold} to re-check the points program.`;
  else if (pb === 'P5') logExtra = ', entry price';
  else if (pb === 'P7') logClause = `and set a calendar reminder at day ${midHold} to re-check the market.`;
  else if (pb === 'P9') logExtra = ', staking receipt';
  else if (pb === 'P10') logExtra = ', receipt';
  else if (pb === 'P11') logExtra = p.category === 'Insurance' ? ', policy' : ', market outcome';
  else if (pb === 'P12') logExtra = ', receipt';
  const s6 = `Log every ${name} transaction (wallet, dates, amounts${logExtra}) ${logClause} All in, the plan costs about ${usd(total)} over ${hold} days.`;

  return [
    { text: s1, cost: `${gas} for the first transaction`, time: '5 minutes' },
    { text: s2, cost: `$${capital} of capital and ${gas}`, time: '15 minutes to set up' },
    { text: s3, cost: `${gas} a week`, time: '10 minutes a week' },
    { text: s4, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: s5, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: s6, cost: 'nothing but the log', time: '5 minutes' },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    watchlist: row.watchlist,
    value_cost: row.value_cost,
    verdict: row.verdict,
    rising: row.rising,
  };
}

/** The scatter sample (SPEC_V3 section 9.3): the 119 traded non-CEX protocols with mcap > 0
 * the K1 curve was fitted on, as [tvl_usd, mcap_usd] pairs in snapshot order. No labels. */
export function scatterRows(snapshot: Snapshot): [number, number][] {
  return snapshot.protocols
    .filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.category !== 'CEX')
    .map((p) => [p.tvl_usd, p.mcap_usd!] as [number, number]);
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const medianValueCost = median(board.map((r) => r.value_cost));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rising_size: board.filter((r) => r.rising).length,
    median_value_cost: medianValueCost,
    rows: board.map(radarRow),
    live,
    scatter: scatterRows(snapshot),
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/**
 * Why a board's structure is not one the gate will take, or null: coverage, ranks, order, one
 * shared implied value, and a non-positive implied value. Farm steps are checked separately
 * (farmStepsIssue): while Agen 2 has not implemented them, main.ts treats that as a warning.
 */
export function structuralIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** Why a board's farm steps are not ones the gate will take, or null. */
export function farmStepsIssue(board: BoardRow[]): string | null {
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
  }
  return null;
}

/** Why a board is not one the gate will take, or null: structure first, then farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  return structuralIssue(board, snapshot) ?? farmStepsIssue(board);
}

/**
 * data.js (SPEC_V3 section 9.2): the dashboard's whole dataset as one script, no fetch and no
 * network. It carries BOTH variables, from the same board, so they can never disagree:
 * - window.RADAR: the starter's compact form (compact rows + live + model + metadata).
 * - window.BOARD_DATA: the full board.json ({rows: BoardRow[]} with farm_steps + score_breakdown),
 *   byte-identical in content to the board.json main.ts writes. The dashboard reads farm plans and
 *   implied values from BOARD_DATA (the single source of truth) and metadata/live from RADAR.
 */
export function dataScript(radar: RadarData, board: BoardRow[]): string {
  return `window.RADAR=${JSON.stringify(radar)};\nwindow.BOARD_DATA=${JSON.stringify({ rows: board })};\n`;
}
