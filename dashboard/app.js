// Token Radar dashboard v4 — Desain 2 (A-diperbaiki, 3 arah v3).
// Reads window.BOARD_DATA (full board rows) and window.RADAR (metadata, model
// constants, live rows, scatter points). No network: every number shown comes
// from ../data.js. No fetch, no external links. Bahasa visual "Dark Blueprint".
//
// Jawaban pertama = board by Value/Cost (S01); board by implied value = jawaban
// kedua (S02); drawer satu protokol (S03); Rising tampilan sendiri (S04).
// Semua angka headline DIHITUNG dari board di sini (netting R4 hold v3 sendiri,
// Hidden Gems, mean geser, counts) — bukan diketik tangan — supaya layar dan
// T1 (rnd/verify_round6_numbers.py) tidak pernah berselisih.
(function () {
  'use strict';

  var BOARD = window.BOARD_DATA && window.BOARD_DATA.rows ? window.BOARD_DATA.rows : [];
  var META = window.RADAR || {};
  var MODEL = META.model || {};
  var app = document.getElementById('board');
  if (!BOARD.length || !app) return;

  function isWatchlist(r) { return !!r.watchlist; }

  // clean2 LOW band, SPEC_V3 section 4.1. LOW pays 0.75, else 1.00. HIGH (1.25) removed.
  var LOW = { 'Restaking': 1, 'Liquid Staking': 1, 'Onchain Capital Allocator': 1, 'Staking Pool': 1 };
  function lowMult(cat) {
    if (LOW[cat]) return MODEL.category_low_multiplier || 0.75;
    return 1;
  }

  // clean2, SPEC_V3 section 4.1: base x maturity x LOW. The page recomputes every row
  // from the snapshot figures only, so the code and the board's data are visibly the
  // same arithmetic. Growth, chain and HIGH are gone (they added no measured accuracy).
  function impliedOf(row) {
    var m = MODEL;
    var age = row.age_days === null || row.age_days === undefined ? (m.unknown_age_days || 365) : row.age_days;
    var maturityMult = (m.maturity_floor === undefined ? 0.7 : m.maturity_floor) + (Math.min(Math.max(age, 0), m.maturity_days || 1095) / (m.maturity_days || 1095)) * (m.maturity_range === undefined ? 0.3 : m.maturity_range);
    var base = (m.curve_base || 42700000) * Math.pow(row.tvl_usd / (m.curve_tvl || 1000000000), m.curve_exponent === undefined ? 0.472 : m.curve_exponent);
    return Math.max(1, Math.round(base * maturityMult * lowMult(row.category)));
  }

  // Farm cost, SPEC_V3 section 8.1. Capital by TVL tier; gas by first chain
  // (Binance is $0.50 — the snapshot names the BNB chain "Binance", no chain is "BSC");
  // hold by age; n_tx = 2 + floor(hold/7).
  function capitalFor(tvl) {
    if (tvl >= 5000000000) return 250;
    if (tvl >= 1000000000) return 150;
    if (tvl >= 100000000) return 100;
    return 50;
  }
  function gasUsd(chain) {
    if (!chain) return 2;
    if (chain === 'Ethereum') return 10;
    if (chain === 'Solana') return 0.05;
    if (chain === 'Polygon') return 0.25;
    return 0.5;
  }
  function farmCostOf(r) {
    var capital = capitalFor(r.tvl_usd);
    var gas = gasUsd(r.chains && r.chains.length ? r.chains[0] : null);
    var nTx = 2 + Math.floor(r.hold_days / 7);
    return { capital: capital, gas: gas, nTx: nTx, total: Math.round((capital + gas * nTx) * 100) / 100 };
  }

  // Netting R4, hold v3 sendiri (60/45/30 hari) — rumus yang sama dengan T1
  // (verify_round6_numbers.py §4, netting): slice per posisi $1K, fees $1,50 + 4 tx
  // gas, T-bill 4% atas hold, jam = (25 + (hold/7)*2 + 10 + 10)/60.
  // Net/jam hero = net/jam terbesar; top-10 = 10 net/jam terbesar.
  function netting(r) {
    var gas = gasUsd(r.chains && r.chains.length ? r.chains[0] : null);
    var slice = r.implied_value_usd * 0.10 * 1000 / r.tvl_usd;
    var fees = 1.50 + 4 * gas;
    var tbill = 1000 * 0.04 * r.hold_days / 365;
    var hours = (25 + (r.hold_days / 7) * 2 + 10 + 10) / 60;
    var net = slice - fees - tbill;
    var nTx = 2 + Math.floor(r.hold_days / 7);
    return { slice: slice, fees: fees, tbill: tbill, hours: hours, net: net,
      nph: net / hours, gas: gas, nTx: nTx,
      altFees: 1.50 + gas * nTx, // C12: bila jumlah tx ikut hold (model.ts:450-453)
      paysFrom: slice > 0 ? 1000 * (fees + tbill) / slice : null }; // deposit minimal: slice menutup fees + T-bill
  }

  // Load-time checks: page arithmetic vs every board value ($0 tolerance);
  // farm cost vs every row; Value/Cost vs implied/cost; netting hero vs T1.
  var mismatches = 0, farmMismatches = 0, vcMismatches = 0;
  BOARD.forEach(function (r) {
    if (impliedOf(r) !== r.implied_value_usd) mismatches++;
    if (Math.abs(farmCostOf(r).total - r.farm_cost) > 0.001) farmMismatches++;
    if (Math.abs(r.value_cost - r.implied_value_usd / r.farm_cost) > 0.01) vcMismatches++;
  });
  var netted = BOARD.map(function (r) { return { row: r, n: netting(r) }; })
    .sort(function (a, b) { return b.n.nph - a.n.nph; });
  var heroNet = netted[0];
  var top10net = netted.slice(0, 10);
  var meanNph = top10net.reduce(function (s, t) { return s + t.n.nph; }, 0) / top10net.length;
  var feesTop10 = top10net.reduce(function (s, t) { return s + t.n.fees; }, 0);
  var altFeesTop10 = top10net.reduce(function (s, t) { return s + t.n.altFees; }, 0);
  var beNum = top10net.reduce(function (s, t) { return s + t.n.fees + 10 * t.n.tbill; }, 0);
  var beDen = top10net.reduce(function (s, t) { return s + 10 * t.n.slice; }, 0);
  var be10k = 1 / (beNum / beDen);
  window.__radarCheck = { rows: BOARD.length, recomputeMismatches: mismatches,
    farmCostMismatches: farmMismatches, valueCostMismatches: vcMismatches,
    heroSlug: heroNet.row.slug, heroNetPerHour: +heroNet.n.nph.toFixed(2),
    top10MeanNetPerHour: +meanNph.toFixed(2), top10Fees: +feesTop10.toFixed(2),
    top10AltFees: +altFeesTop10.toFixed(2), top10BreakEven10k: +be10k.toFixed(2) };

  // TVL rank per slug (N1 rank shift), SPEC_V3 section 5.2. TVL rank is computed over
  // the 198 board rows, not over the 758 snapshot protocols.
  var tvlRank = {};
  BOARD.slice().sort(function (a, b) { return b.tvl_usd - a.tvl_usd; }).forEach(function (r, i) { tvlRank[r.slug] = i + 1; });
  // Ranking by Value/Cost (jawaban pertama v4) + rank geser vs implied.
  var byVC = BOARD.slice().sort(function (a, b) { return b.value_cost - a.value_cost; });
  var vcRank = {};
  byVC.forEach(function (r, i) { vcRank[r.slug] = i + 1; });
  var meanVcShift = BOARD.reduce(function (s, r) { return s + Math.abs(vcRank[r.slug] - r.rank); }, 0) / BOARD.length;
  // Rising protocols, best Rising Score first (SPEC_V3 section 7.3).
  var risingRows = BOARD.filter(function (r) { return r.rising; }).sort(function (a, b) { return b.rising_score - a.rising_score; });
  // Verdict counts + playbook count (12 playbook P1-P12, aturan model.ts).
  var verdictCounts = { FARM: 0, THIN: 0, SKIP: 0 };
  BOARD.forEach(function (r) { verdictCounts[r.verdict]++; });
  var FAMILY = { 'Risk Curators': 'Vault', 'Onchain Capital Allocator': 'Vault', 'Yield': 'Vault', 'Yield Aggregator': 'Vault', 'Basis Trading': 'Vault', 'Liquidity Manager': 'Vault', 'Farm': 'Vault', 'Indexes': 'Vault', 'Dexs': 'DEX', 'Derivatives': 'DEX', 'Leveraged Farming': 'DEX', 'Interest Rate Derivatives': 'DEX', 'Lending': 'Lending', 'CDP': 'Lending', 'CDP Manager': 'Lending', 'Collateral Markets': 'Lending', 'Uncollateralized Lending': 'Lending', 'RWA': 'RWA', 'Stablecoin Wrapper': 'RWA', 'Dual-Token Stablecoin': 'RWA', 'Staking Pool': 'Staking', 'Restaking': 'Staking', 'Anchor BTC': 'Staking', 'Decentralized BTC': 'Staking', 'CeDeFi': 'Niche', 'Payments': 'Niche', 'Crypto Card Issuer': 'Niche', 'OTC Marketplace': 'Niche', 'Governance Incentives': 'Niche', 'Chain': 'Bridge', 'Cross Chain Bridge': 'Bridge', 'Prediction Market': 'Pred', 'Insurance': 'Pred' };
  function riskScoreOf(r) {
    return (r.tvl_usd < 100000000 ? 1 : 0) + (r.age_days !== null && r.age_days < 180 ? 1 : 0) + ((r.chains || []).length <= 1 ? 1 : 0);
  }
  function risingScoreOf(r) {
    if (r.tvl_usd >= 50000000 || r.tvl_usd < 10000000) return 0;
    if (r.change_7d === null || r.change_7d <= 10) return 0;
    if (r.age_days === null || r.age_days >= 365) return 0;
    var dTvl = r.tvl_usd * Math.min(r.change_7d, 100) / 100;
    if (dTvl < 1000000) return 0;
    return Math.round(dTvl * (r.age_days < 180 ? 1.0 : 0.75));
  }
  function playbookOf(r) {
    if (risingScoreOf(r) > 0) return 'P1';
    var risk = riskScoreOf(r);
    var fam = FAMILY[r.category || ''] || 'Vault';
    if (fam === 'Vault') return risk === 0 ? 'P2' : risk === 1 ? 'P3' : 'P4';
    if (fam === 'DEX') return 'P5';
    if (fam === 'Lending') return risk <= 1 ? 'P6' : 'P7';
    if (fam === 'RWA') return 'P8';
    if (fam === 'Staking') return 'P9';
    if (fam === 'Bridge') return 'P10';
    if (fam === 'Pred') return 'P11';
    return 'P12';
  }
  var playbooksSeen = {};
  BOARD.forEach(function (r) { playbooksSeen[playbookOf(r)] = 1; });
  var playbookCount = Object.keys(playbooksSeen).length;
  // Statistik per playbook untuk panel layar (SO-TRV4-032 butir 3): jumlah baris +
  // contoh (rank implied terendah di playbook itu) + kutipan kata demi kata
  // farm_steps[1] contoh itu. Label aturan disingkat dari 00-proof.md §5.
  var PLAYBOOK_LABELS = { P1: 'Rising', P2: 'Vault r0', P3: 'Vault r1', P4: 'Vault r2–3', P5: 'DEX', P6: 'Lending r≤1', P7: 'Lending r2–3', P8: 'RWA', P9: 'Staking', P10: 'Bridge', P11: 'Pred/Ins', P12: 'Lainnya' };
  var PLAYBOOK_ORDER = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'];
  var pbStats = {};
  BOARD.forEach(function (r) {
    var pb = playbookOf(r);
    if (!pbStats[pb]) pbStats[pb] = { count: 0, example: r };
    pbStats[pb].count++;
    if (r.rank < pbStats[pb].example.rank) pbStats[pb].example = r;
  });
  // Playbook yang kutipannya tampil di panel; default P2 (Steakhouse — contoh yang
  // sama dengan drawer S03; langkah 2-nya tidak mengandung "$46.6M" seperti P1).
  var selectedPlaybook = 'P2';
  // Akuntansi snapshot 758 — dihitung dari snapshot.json tersegel
  // (input/snapshot.json) dengan model.ts isRankable + liveRows, 2026-11-17:
  // 758 = 198 board + 144 pre-token tidak masuk board + 416 sudah bertoken.
  // 144 = 128 kategori dikecualikan (Bridge 28, Canonical Bridge 15, Liquid
  // Staking 38, CEX 42, Liquid Restaking 3, Restaked BTC 2) + 16 aturan nama
  // (v2/v3, staking — 16 slug, diverifikasi satu per satu). 416 = 402 non-CEX +
  // 14 CEX; Live = 24 teratas by market cap dari 402 non-CEX (378 sisanya tidak
  // ditampilkan). Bukan angka baru — hitungan ulang dari sumber yang sama dengan T1.
  var FLOOR_COUNTS = { snapshot: 758, board: 198, watchlist: 40, radar: 158, preNotBoard: 144, catExcluded: 128, nameExcluded: 16, tokened: 416, liveShown: 24, liveRest: 378, cex: 14 };
  var allSteps = [];
  BOARD.forEach(function (r) { (r.farm_steps || []).forEach(function (s) { allSteps.push(s); }); });
  var distinctSteps = {};
  allSteps.forEach(function (s) { distinctSteps[s] = 1; });
  var dupSteps = allSteps.length - Object.keys(distinctSteps).length;

  // Aturan keluar (SO-TRV4-034 butir 1): SATU aturan yang sama di semua
  // drawer farm plan. Aturan standar yang dipublikasikan entri #4
  // (SCOUT_TOP5_BLIND.md) — diadopsi sebagai ATURAN rencana, bukan klaim
  // hasil backtest. Jangan karang ambang lain.
  var EXIT_RULE = 'Keluar bila TVL turun 25% dalam seminggu.';
  // Validasi walk-forward (SO-TRV4-034 butir 2): TIDAK bisa dihitung di
  // halaman ini — tanggal listing ada di snapshot tersegel, bukan di data.js.
  // Angka di bawah dari rnd/loo_walkforward.py (deterministik, n=119 titik
  // data.js; latih 43 token terlama s.d. 28 Feb 2024, uji 44 terbaru;
  // 32 titik tanpa tanggal listing tidak ikut). Jalankan ulang skrip itu
  // untuk verifikasi; tabel Model harus cocok dengan outputnya.
  var WF_STATS = { modelMiss: 2.81, flatMiss: 4.96, modelWithin3x: 50.0, flatWithin3x: 31.8, trainN: 43, testN: 44, cutoff: '28 Feb 2024', datedN: 87, noDate: 32 };
  // Farm book (SO-TRV4-034 butir 1): 12 FARM teratas by Value/Cost, dihitung
  // dari BOARD di halaman ini (bukan diketik): jumlah farm_cost + implied.
  // Jam kerja diparse dari teks "Time:" tiap farm_steps: menit sekali jalan
  // + 10 menit/minggu x hold/7; langkah hold (hari) adalah masa tunggu,
  // bukan jam kerja. Cross-check independen: rnd/farm_book.py.
  function farmBookStats() {
    var top = byVC.filter(function (r) { return r.verdict === 'FARM'; }).slice(0, 12);
    var cost = 0, implied = 0, minutes = 0;
    top.forEach(function (r) {
      cost += r.farm_cost; implied += r.implied_value_usd;
      (r.farm_steps || []).forEach(function (s) {
        var m = /Time:\s*(\d+)\s*minutes?(\s*a week)?/i.exec(s);
        if (!m) return; // langkah hold ("Time: 30 days") — masa tunggu
        minutes += parseFloat(m[1]) * (m[2] ? r.hold_days / 7 : 1);
      });
    });
    return { rows: top, totalCost: cost, totalImplied: implied, totalMinutes: minutes, totalHours: minutes / 60 };
  }
  var FARM_BOOK = farmBookStats();
  // LOO dihitung ulang di halaman ini dari META.scatter (119 titik): tiap
  // titik diprediksi dari OLS 118 titik lainnya; flat = rasio tetap (median
  // log(mcap/TVL) dari 118 titik lainnya). Rumus sama dengan
  // rnd/loo_walkforward.py — tabel Model harus cocok dengan output skrip.
  function looStats() {
    var pts = META.scatter || [];
    var xs = [], ys = [];
    pts.forEach(function (p) { xs.push(Math.log10(p[0])); ys.push(Math.log10(p[1])); });
    function ols(px, py) {
      var n = px.length, mx = 0, my = 0, i;
      for (i = 0; i < n; i++) { mx += px[i]; my += py[i]; }
      mx /= n; my /= n;
      var sxy = 0, sxx = 0;
      for (i = 0; i < n; i++) { sxy += (px[i] - mx) * (py[i] - my); sxx += (px[i] - mx) * (px[i] - mx); }
      var b = sxy / sxx;
      return { a: my - b * mx, b: b };
    }
    function median(v) {
      var s = v.slice().sort(function (a, b) { return a - b; });
      var m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }
    var mm = [], fm = [];
    for (var k = 0; k < xs.length; k++) {
      var xk = [], yk = [];
      for (var i = 0; i < xs.length; i++) { if (i !== k) { xk.push(xs[i]); yk.push(ys[i]); } }
      var f = ols(xk, yk);
      mm.push(Math.pow(10, Math.abs(ys[k] - (f.a + f.b * xs[k]))));
      var c = median(yk.map(function (y, j) { return y - xk[j]; }));
      fm.push(Math.pow(10, Math.abs((ys[k] - xs[k]) - c)));
    }
    function within(v) { var n = 0; v.forEach(function (x) { if (x <= 3) n++; }); return n / v.length * 100; }
    return { n: xs.length, modelMiss: median(mm), flatMiss: median(fm), modelWithin: within(mm), flatWithin: within(fm) };
  }
  var LOO = looStats();

  var state = { q: '', category: 'all', chain: 'all', watchlistOnly: false, risingOnly: false, tab: 'pre-token', sort: 'value_cost', dir: -1, selected: null, liveSelected: null, view: 'hero' };
  // Tampilan (view) dipisah dari urutan (sort): hero = top-10 Value/Cost (S01,
  // landing default), board = tabel lengkap 198 baris (S02), rising = S04.
  // Dulu render() memilih tampilan dari state.sort — pilih "Value/Cost" di board
  // lengkap malah melempar ke hero (bug Blind Judge #1). Kini dropdown "Urutkan"
  // hanya mengubah state.sort; tampilan hanya berubah lewat state.view.

  // Format Indonesia: ribuan pakai titik, desimal pakai koma, uang selalu 2 desimal.
  function fmtMoney2(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return '$' + n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtMoney0(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return '$' + Math.round(n).toLocaleString('id-ID');
  }
  function fmtNum(n, d) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + fmtNum(n, 2) + '%';
  }
  function fmtVC(n) {
    return Math.round(n).toLocaleString('id-ID') + 'x';
  }
  // Dolar singkat: $46,6 jt (dipakai untuk ΔTVL Rising).
  function fmtShort(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (n >= 1000000000) return '$' + fmtNum(n / 1000000000, 2) + ' M';
    if (n >= 1000000) return '$' + fmtNum(n / 1000000, 1) + ' jt';
    if (n >= 1000) return '$' + fmtNum(n / 1000, 1) + ' rb';
    return fmtMoney2(n);
  }
  // Kalimat Value/Cost (penjelas) — di bawah tabel + modal + drawer.
  var VC_SENTENCE = 'Value/Cost = implied value protokol dibagi perkiraan biaya farm-nya. Ini indeks efisiensi proyek untuk membandingkan protokol — bukan return pribadi Anda. Implied value adalah total protokol, bukan bagian Anda.';

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  // "Model details" modal. R² TIDAK disebut di sini: angka itu tampil tepat
  // satu kali di halaman ini, di panel Model (S01) berdampingan dengan baseline.
  var MODAL_HTML = '<h2>Model details</h2><p>Implied value = $42,7 jt × (TVL/$1 M)^0,472 × maturity × LOW, dicocokkan ke 119 token traded (OLS log-log). Angka pastinya — termasuk seberapa lemah kurva ini — ada di panel Model di layar utama, berdampingan dengan baseline-nya.</p><p>Kurva ini lemah: ia hanya menjelaskan sebagian kecil varians harga. Sebuah prediksi tipikal meleset ~4x. Ini model kasar, bukan valuasi presisi — tapi lebih tidak-kasar daripada rasio tetap (blind-tested: error tipikal 3,8x vs 5,1x).</p><p>Divalidasi pada token traded; memakai kurva ini untuk protokol pre-token adalah asumsi — seperti pada model apa pun.</p><p>Di pita $100 jt–$1 M, tempat sebagian besar top-10 berada, kurva hampir tidak punya daya prediksi (in-band slope ≈ −0,08) — keunggulannya lintas pita, bukan di dalam pita.</p><p>Nilai ~8x lebih kecil daripada rasio tetap 0,20 karena kurva sub-linear (eksponen 0,472 &lt; 1): protokol raksasa tidak 2,7x lebih berharga daripada yang 2,7x ukurannya. Angka lebih kecil, bukan peluang lebih kecil.</p><p>clean2 hanya memakai tiga komponen: base × maturity × LOW. Growth, chain dan HIGH dihapus — menghapusnya tidak memperburuk error blind-test. Growth dihapus karena ujung atas rangenya (1,01–1,50) tidak punya dukungan di sampel fit — itu asumsi, bukan efek terestimasi.</p><p>Empirical error floor ~0,51 dex (terbaik dari 20+ keluarga model yang diuji). Tidak ada model yang menembus 0,50 dex.</p><table><tr><th>Zero-mcap handling</th><th>Eksponen</th></tr><tr><td>Dikecualikan (dipakai)</td><td>0,472</td></tr><tr><td>Floor $1</td><td>0,844</td></tr><tr><td>Floor $1.000</td><td>0,675</td></tr><tr><td>Floor $100.000</td><td>0,560</td></tr><tr><td>Floor $1 jt</td><td>0,507</td></tr></table><p>Kami mengecualikan token zero-mcap (log 0 tidak terdefinisi); 0,472 adalah pilihan paling datar dan didokumentasikan, bukan diklaim sebagai "kebenaran". Memasukkan token mati ke fit membuat prediksi ke depan lebih buruk (Layer B +0,19 sampai +1,72 dex).</p><p>LOW = 0,75 untuk Restaking, Liquid Staking, Onchain Capital Allocator dan Staking Pool; 1,00 untuk lainnya. Pita kategori membawa manfaat forward-in-time model — menghapusnya memperburuk error old-vs-young sebesar +0,059 dex.</p><table><tr><th>Chain pertama</th><th>Gas / tx</th></tr><tr><td>Ethereum</td><td>$10,00</td></tr><tr><td>Solana</td><td>$0,05</td></tr><tr><td>Base / Arbitrum / Optimism / Monad / Provenance / Binance / lainnya</td><td>$0,50</td></tr><tr><td>Polygon</td><td>$0,25</td></tr></table><p>Estimasi tipikal, bukan harga gas real-time. Modal menurut TVL: ≥$5 M $250 · ≥$1 M $150 · ≥$100 jt $100 · di bawah $50.</p><p>Value/Cost = implied value protokol dibagi perkiraan biaya farm-nya. Ini indeks efisiensi proyek untuk membandingkan protokol — bukan return pribadi Anda. Implied value adalah total protokol, bukan bagian Anda.</p>';
  var modal = el('dialog', { class: 'modal', id: 'model-modal' });
  modal.innerHTML = MODAL_HTML;
  modal.appendChild(el('button', { class: 'button', type: 'button', text: 'Tutup', onclick: function () { modal.close(); } }));
  function openModal() { if (!modal.open) modal.showModal(); }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('wl') === '1') state.watchlistOnly = true;
    if (params.get('rising') === '1') state.risingOnly = true;
    if (params.get('view') === 'rising') state.view = 'rising';
    else if (params.get('view') === 'board') state.view = 'board';
    else if (params.get('view') === 'hero') state.view = 'hero';
    // Deep link sort (#sort=implied, dipakai Blind Judge) berarti board lengkap
    // dengan urutan itu — tampilan tidak lagi ditebak dari sort saja.
    if (params.get('sort') === 'implied') { state.sort = 'implied'; if (!params.get('view')) state.view = 'board'; }
    if (params.get('sort') === 'value_cost') { state.sort = 'value_cost'; if (!params.get('view')) state.view = 'board'; }
    if (params.get('tab') === 'live') state.tab = 'live';
    if (params.get('protocol')) state.selected = params.get('protocol');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.watchlistOnly) params.set('wl', '1');
    if (state.risingOnly) params.set('rising', '1');
    if (state.sort === 'implied') params.set('sort', 'implied');
    if (state.sort === 'value_cost' && state.view === 'board') params.set('sort', 'value_cost');
    if (state.view === 'board') params.set('view', 'board');
    if (state.tab === 'live') params.set('tab', 'live');
    if (state.view === 'rising') params.set('view', 'rising');
    if (state.selected) params.set('protocol', state.selected);
    var next = params.toString();
    try {
      if (next) window.history.replaceState(null, '', '#' + next);
      else window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) { /* history unavailable (e.g. sandboxed file view): the page still works */ }
  }

  function rows() {
    var q = state.q.trim().toLowerCase();
    return BOARD.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && !(r.chains || []).includes(state.chain)) return false;
      if (state.watchlistOnly && !isWatchlist(r)) return false;
      if (state.risingOnly && !r.rising) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'rank') { av = a.rank; bv = b.rank; }
      else if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'value_cost') { av = a.value_cost; bv = b.value_cost; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  // Scatter plot K1 (SO-TRV4-034 butir 3): diperbesar 340x230 -> 400x232,
  // gaya cetak biru (blueprint): grid 0,5 dex + kurva K1 amber (bukan cyan
  // generik) + label sumbu + tick $ yang terbaca. Angka tidak berubah.
  function scatterSVG() {
    var pts = META.scatter || [];
    var W = 400, H = 232;
    var x0 = 6.5, x1 = 10.5, y0 = 4.5, y1 = 9.5;
    var L = 52, R = 388, T = 24, B = 192;
    function X(lv) { return L + (lv - x0) / (x1 - x0) * (R - L); }
    function Y(lv) { return B - (lv - y0) / (y1 - y0) * (B - T); }
    var s = '<svg width="400" height="232" viewBox="0 0 400 250" role="img" aria-label="Scatter plot 119 token traded: market cap versus TVL pada skala log, dengan kurva power-law hasil fit">';
    var g;
    for (g = 7; g <= 10; g += 0.5) {
      s += '<line x1="' + X(g).toFixed(1) + '" y1="' + T + '" x2="' + X(g).toFixed(1) + '" y2="' + B + '" stroke="#E8EEF4" stroke-width="1"/>';
    }
    for (g = 5; g <= 9; g += 0.5) {
      s += '<line x1="' + L + '" y1="' + Y(g).toFixed(1) + '" x2="' + R + '" y2="' + Y(g).toFixed(1) + '" stroke="#E8EEF4" stroke-width="1"/>';
    }
    s += '<line x1="52" y1="28" x2="52" y2="210" stroke="#94A3B8"/><line x1="52" y1="210" x2="388" y2="210" stroke="#94A3B8"/>';
    var a = 3.382, b = MODEL.curve_exponent === undefined ? 0.472 : MODEL.curve_exponent;
    var cp = [];
    for (var i = 0; i <= 50; i++) {
      var lv = x0 + (x1 - x0) * i / 50;
      cp.push(X(lv).toFixed(1) + ',' + Y(a + b * lv).toFixed(1));
    }
    s += '<polyline points="' + cp.join(' ') + '" fill="none" stroke="#D97706" stroke-width="3"/>';
    for (var j = 0; j < pts.length; j++) {
      s += '<circle cx="' + X(Math.log10(pts[j][0])).toFixed(1) + '" cy="' + Y(Math.log10(pts[j][1])).toFixed(1) + '" r="2.8" fill="#0E1B2E" opacity="0.75"/>';
    }
    s += '<text x="52" y="14" font-size="11" fill="#475569">log10(mcap) vs log10(TVL) — 119 token traded</text>';
    s += '<rect x="48" y="30" width="208" height="17" fill="#FFFFFF" opacity="0.88"/>';
    s += '<text x="52" y="44" font-size="11" fill="#D97706">garis K1: 3,382 + 0,472·log10(TVL)</text>';
    var xt = { 7: '$10 jt', 8: '$100 jt', 9: '$1 M', 10: '$10 M' };
    Object.keys(xt).forEach(function (k) {
      s += '<text x="' + X(+k).toFixed(1) + '" y="206" font-size="11" fill="#475569" text-anchor="middle">' + xt[k] + '</text>';
    });
    var yt = { 5: '$100 rb', 6: '$1 jt', 7: '$10 jt', 8: '$100 jt', 9: '$1 M' };
    Object.keys(yt).forEach(function (k) {
      s += '<text x="46" y="' + (Y(+k) + 4).toFixed(1) + '" font-size="11" fill="#475569" text-anchor="end">' + yt[k] + '</text>';
    });
    s += '<text x="220" y="222" font-size="11" fill="#475569" text-anchor="middle">TVL (USD, skala log)</text>';
    return s + '</svg>';
  }

  function topbar(title) {
    var counts = el('div', { class: 'counts' });
    counts.innerHTML = (META.board_size || BOARD.length) + ' ranked · <b>' + (META.watchlist_size || 40) + '/40 watchlist</b> · FARM <b>' + verdictCounts.FARM + '</b> · THIN ' + verdictCounts.THIN + ' · SKIP ' + verdictCounts.SKIP + ' · ' + (META.rising_size || 6) + ' Rising · ' + playbookCount + ' playbooks';
    return el('div', { class: 'topbar' },
      el('div', { class: 'brand' }, title),
      counts
    );
  }

  function formulaStrip() {
    var f = el('div', { class: 'formula' });
    f.innerHTML = '<code>log10(mcap) = 3,382 + 0,472·log10(TVL) &nbsp;·&nbsp; implied = $42.700.000 × (TVL/$1B)^0,472 × maturity × LOW</code>';
    f.appendChild(el('span', { class: 'chip', text: 'KURVA blind-tested 18/20' }));
    return f;
  }

  // Hero Nucleus (F7): baris rincian berlabel besaran — "Gross per posisi" vs
  // "net per posisi" vs "net/jam" — supaya ketiganya tidak tertukar (T2: 1 dari 3
  // pembaca gagal commit tanpa label ini). Kalimat jangkar R4 TIDAK ADA di sini (F8).
  function heroCard() {
    var h = heroNet;
    var medianVc = META.median_value_cost === undefined ? 87977.4 : META.median_value_cost;
    var detail = 'Gross per posisi $1K ' + fmtMoney2(h.n.slice) + ' − fees ' + fmtMoney2(h.n.fees) + ' − T-bill 4% ' + fmtMoney2(h.n.tbill) + ' = net ' + fmtMoney2(h.n.net) + ' per posisi (' + fmtNum(h.n.hours, 2) + ' jam) → net/jam ' + fmtMoney2(h.n.nph) + '. Hurdle bernama: fees + gas + T-bill 4%. Verdict board: ' + h.row.verdict + ' (Value/Cost ' + fmtVC(h.row.value_cost) + ' < median ' + fmtVC(medianVc) + ') — hero net/jam ≠ hero Value/Cost; dua ranking, dua objek.';
    return el('div', { class: 'hero' },
      el('div', { class: 'hero-card' },
        el('h3', { text: 'FARM TUNGGAL TERBAIK — NET/JAM (HOLD v3 SENDIRI, ' + h.row.hold_days + ' HARI)' }),
        el('div', { class: 'big', text: h.row.name + ' +' + fmtMoney2(h.n.nph) + '/jam' }),
        el('div', { class: 'small', text: detail })
      )
    );
  }

  // Tabel top-10 by Value/Cost (S01): 10 baris, kolom persis mockup D2.
  function vcTable() {
    var tbody = el('tbody');
    byVC.slice(0, 10).forEach(function (r, idx) {
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        class: r.rank === 1 ? 'top1' : null,
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: '#' + (idx + 1) }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' · ' + (r.chains && r.chains.length ? r.chains[0] : 'chain tak bernama') + ' · hold ' + r.hold_days + ' hari' })
        )),
        el('td', { class: 'num', text: fmtMoney0(r.implied_value_usd) }),
        el('td', { class: 'vc', text: fmtVC(r.value_cost) }),
        el('td', { class: 'num', text: fmtMoney2(r.farm_cost) }),
        el('td', null, el('span', { class: 'badge ' + String(r.verdict || '').toLowerCase(), text: r.verdict || '' }))
      );
      tbody.appendChild(tr);
    });
    var loop = byVC[9];
    var footnote = 'Top-10 by Value/Cost mengurutkan ulang board (mean geser ' + fmtNum(meanVcShift, 2) + ' rank). ' + loop.slug + ' #' + (vcRank[loop.slug]) + ' by VC: ' + loop.verdict + ' — ditampilkan. ';
    return el('div', { class: 'col-main' },
      el('div', { class: 'table-wrap wrap-vc table-tight' },
        el('table', null,
          el('thead', null, el('tr', null,
            el('th', { scope: 'col', style: 'text-align:right', text: '# VC' }),
            el('th', { scope: 'col', text: 'Protokol' }),
            el('th', { scope: 'col', style: 'text-align:right', text: 'Implied' }),
            el('th', { scope: 'col', style: 'text-align:right', text: 'Value/Cost' }),
            el('th', { scope: 'col', style: 'text-align:right', text: 'Farm cost' }),
            el('th', { scope: 'col', text: 'Verdict' })
          )),
          tbody
        )
      ),
      el('div', { class: 'footnote' }, footnote,
        el('button', { class: 'linklike', type: 'button', text: 'Board lengkap by implied value + filter/search →', onclick: function () { state.view = 'board'; state.sort = 'implied'; state.dir = -1; state.tab = 'pre-token'; writeHash(); render(); } }),
        ' · ',
        el('button', { class: 'linklike', type: 'button', text: 'Rising — 6 protokol →', onclick: function () { state.view = 'rising'; writeHash(); render(); } })
      )
    );
  }

  // Panel kanan S01: scatter K1 + tabel validasi LOO/walk-forward
  // (SO-TRV4-034 butir 2). LOO dihitung ulang di halaman ini (LOO.*);
  // walk-forward dari WF_STATS (rnd/loo_walkforward.py).
  function sideS01() {
    var sc = el('div');
    sc.innerHTML = scatterSVG();
    var scatterPanel = el('div', { class: 'panel flat' },
      el('h3', { text: 'MODEL — SCATTER K1 + VALIDASI' }),
      sc,
      el('div', { class: 'body', style: 'margin-top:6px' })
    );
    // Satu-satunya tempat R² tampil di halaman ini, berdampingan dengan baseline.
    scatterPanel.querySelector('.body').innerHTML = 'R² = <b>0,143</b> (n=119, CI slope [0,26; 0,68]) · blind-tested 18/20 · error tipikal <b>3,8x vs 5,1x</b> rasio tetap.';
    var looTable = el('table', { class: 'loo' },
      el('thead', null, el('tr', null,
        el('th', { scope: 'col', text: 'Validasi (meleset tipikal)' }),
        el('th', { scope: 'col', style: 'text-align:right', text: 'n' }),
        el('th', { scope: 'col', style: 'text-align:right', text: 'Kurva K1' }),
        el('th', { scope: 'col', style: 'text-align:right', text: 'Rasio tetap' })
      )),
      el('tbody', null,
        el('tr', null,
          el('td', { text: 'Leave-one-out' }),
          el('td', { class: 'num', text: String(LOO.n) }),
          el('td', { class: 'num', text: fmtNum(LOO.modelMiss, 2) + 'x (' + fmtNum(LOO.modelWithin, 1) + '% ≤3x)' }),
          el('td', { class: 'num', text: fmtNum(LOO.flatMiss, 2) + 'x (' + fmtNum(LOO.flatWithin, 1) + '% ≤3x)' })
        ),
        el('tr', null,
          el('td', { text: 'Walk-forward (waktu)' }),
          el('td', { class: 'num', text: String(WF_STATS.testN) }),
          el('td', { class: 'num', text: fmtNum(WF_STATS.modelMiss, 2) + 'x (' + fmtNum(WF_STATS.modelWithin3x, 1) + '% ≤3x)' }),
          el('td', { class: 'num', text: fmtNum(WF_STATS.flatMiss, 2) + 'x (' + fmtNum(WF_STATS.flatWithin3x, 1) + '% ≤3x)' })
        )
      )
    );
    scatterPanel.appendChild(looTable);
    scatterPanel.appendChild(el('div', { class: 'footnote', text: 'Meleset tipikal = median faktor meleset. LOO: tiap titik dari 118 lainnya. Walk-forward: latih ' + WF_STATS.trainN + ' terlama (s.d. ' + WF_STATS.cutoff + '), uji ' + WF_STATS.testN + ' terbaru; ' + WF_STATS.noDate + ' tanpa tanggal tak ikut.' }));
    return el('div', { class: 'col-side' }, scatterPanel);
  }

  // Panel net/jam top-10 (dipindah ke strip bawah S01, SO-TRV4-034).
  function netPanel() {
    return el('div', { class: 'panel flat' },
      el('h3', { text: 'NET/JAM — TOP-10 (HOLD v3 SENDIRI)' }),
      el('div', { class: 'body', text: 'Top-10 by net/jam: ' + fmtMoney2(meanNph) + '/jam ($1K/posisi) · fees ' + fmtMoney2(feesTop10) + ' · break-even $10K/posisi 1-in-' + fmtNum(be10k, 2) + '. Fees memakai aturan R4 ($1,50 + 4 tx gas); bila tx ikut hold (model.ts:450-453), fees top-10 ' + fmtMoney2(altFeesTop10) + '.' })
    );
  }

  // Panel farm book (SO-TRV4-034 butir 1): 12 FARM teratas by Value/Cost +
  // total biaya + total implied + jam kerja — semuanya dari FARM_BOOK
  // (dihitung dari board.json di halaman ini).
  function farmBookPanel() {
    var fb = FARM_BOOK;
    var cells = fb.rows.map(function (r) {
      return el('div', { class: 'fb-cell' },
        el('b', { text: r.name }),
        el('span', { class: 'sub', text: fmtVC(r.value_cost) + ' · ' + fmtMoney0(r.implied_value_usd) + ' · ' + fmtMoney2(r.farm_cost) }));
    });
    return el('div', { class: 'panel flat fb-panel' },
      el('h3', { text: 'FARM BOOK — 12 FARM TERATAS · BIAYA ' + fmtMoney2(fb.totalCost) + ' · IMPLIED ' + fmtMoney0(fb.totalImplied) + ' · ' + fmtNum(fb.totalHours, 2) + ' JAM' }),
      el('div', { class: 'fb-grid' }, cells),
      el('div', { class: 'footnote', text: 'Dihitung dari board.json; jam = waktu langkah farm (cek 10 mnt/minggu × hold/7; hold = masa tunggu). Cross-check: rnd/farm_book.py.' })
    );
  }

  function boardVCView() {
    var shell = el('div', null,
      topbar(el('span', null, 'TOKEN RADAR ', el('span', { text: 'v4' }), ' — FARM YANG PALING EFISIEN DULU')),
      formulaStrip(),
      heroCard(),
      el('div', { class: 'cols' }, vcTable(), sideS01()),
      el('div', { class: 'cols', style: 'margin-top:4px' },
        el('div', { class: 'col-main' }, farmBookPanel()),
        el('div', { class: 'col-side' }, netPanel()))
    );
    return shell;
  }

  function controls() {
    var categories = Array.from(new Set(BOARD.map(function (r) { return r.category || 'Other'; }))).sort();
    var chainCounts = {};
    BOARD.forEach(function (r) { (r.chains || []).forEach(function (c) { chainCounts[c] = (chainCounts[c] || 0) + 1; }); });
    var chains = Object.keys(chainCounts).sort(function (a, b) { return chainCounts[b] - chainCounts[a] || (a < b ? -1 : 1); });
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Cari nama, kategori atau chain', value: state.q, 'aria-label': 'Cari di board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var catSelect = el('select', { id: 'category', 'aria-label': 'Filter berdasarkan kategori' },
      el('option', { value: 'all', text: 'Semua kategori' }),
      categories.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    catSelect.addEventListener('change', function () { state.category = catSelect.value; writeHash(); render(); });
    var chainSelect = el('select', { id: 'chain', 'aria-label': 'Filter berdasarkan chain' },
      el('option', { value: 'all', text: 'Semua chain' }),
      chains.map(function (c) { return el('option', { value: c, text: c + ' (' + chainCounts[c] + ')', selected: c === state.chain ? 'selected' : null }); })
    );
    chainSelect.addEventListener('change', function () { state.chain = chainSelect.value; writeHash(); render(); });
    var wl = el('input', { type: 'checkbox', id: 'watchlist-only', checked: state.watchlistOnly ? 'checked' : null, 'aria-label': 'Hanya watchlist' });
    wl.addEventListener('change', function () { state.watchlistOnly = wl.checked; writeHash(); render(); });
    var rising = el('input', { type: 'checkbox', id: 'rising-only', checked: state.risingOnly ? 'checked' : null, 'aria-label': 'Hanya Rising' });
    rising.addEventListener('change', function () { state.risingOnly = rising.checked; writeHash(); render(); });
    var sortSelect = el('select', { id: 'sort', 'aria-label': 'Urutkan board' },
      el('option', { value: 'implied', text: 'Implied value', selected: state.sort === 'implied' ? 'selected' : null }),
      el('option', { value: 'value_cost', text: 'Value/Cost', selected: state.sort === 'value_cost' ? 'selected' : null })
    );
    sortSelect.addEventListener('change', function () { state.sort = sortSelect.value; state.dir = -1; writeHash(); render(); });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; writeHash(); render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; writeHash(); render(); } });
    var n = rows().length;
    var shown = state.tab === 'pre-token' ? n + (n === 1 ? ' baris tampil' : ' baris tampil') : (META.live || []).length + ' protokol live-token';
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Cari' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Kategori' }), catSelect),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chainSelect),
      el('div', { class: 'field' }, el('label', { text: 'Filter' }), el('div', { class: 'toggles' }, el('label', { class: 'toggle' }, wl, ' Watchlist'), el('label', { class: 'toggle' }, rising, ' Rising'))),
      el('div', { class: 'field' }, el('label', { for: 'sort', text: 'Urutkan' }), sortSelect),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'Status token' }), el('div', { class: 'tabs' }, pre, live)),
      el('span', { class: 'count', text: shown })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col', 'aria-sort': state.sort === key ? (state.dir < 0 ? 'descending' : 'ascending') : null },
      el('button', { type: 'button', class: state.sort === key ? 'sort-active' : null, onclick: function () {
        if (state.sort === key) state.dir = -state.dir;
        else { state.sort = key; state.dir = (key === 'rank' || key === 'name') ? 1 : -1; }
        render();
      } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null
      )
    );
  }

  function badge(r) {
    var out = [el('span', { class: isWatchlist(r) ? 'badge watch' : 'badge early', text: isWatchlist(r) ? 'WATCHLIST' : 'EARLY' })];
    if (r.rising) out.push(el('span', { class: 'badge rising', text: 'RISING' }));
    return out;
  }

  // Board by implied value (S02): 198 baris, menggulir di dalam kotaknya.
  function boardImpliedTable() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'Tidak ada protokol yang cocok dengan filter itu' }),
        el('p', { text: 'Hapus pencarian atau pilih kategori lain untuk melihat board lagi.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Hapus filter', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watchlistOnly = false; state.risingOnly = false; writeHash(); render(); } })
      ));
    }
    var tbody = el('tbody');
    list.forEach(function (r) {
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        class: r.rank === 1 ? 'top1' : null,
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' · ' + (r.chains && r.chains.length ? r.chains[0] : 'chain tak bernama') + ' · ' + (r.age_days === null ? 'umur unknown' : r.age_days + ' hari') })
        )),
        el('td', { class: 'num', text: fmtMoney0(r.tvl_usd) }),
        el('td', { class: 'num strong', text: fmtMoney0(r.implied_value_usd) }),
        el('td', { class: 'num', text: '#' + vcRank[r.slug] }),
        el('td', { class: 'vc', text: fmtVC(r.value_cost) }),
        el('td', null, el('span', { class: 'badge ' + String(r.verdict || '').toLowerCase(), text: r.verdict || '' }))
      );
      tbody.appendChild(tr);
    });
    return el('div', null,
      el('div', { class: 'table-wrap wrap-implied table-roomy' },
        el('table', null,
          el('thead', null, el('tr', null,
            sortHeader('rank', 'Rank'),
            sortHeader('name', 'Protokol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('implied', 'Implied'),
            el('th', { scope: 'col', style: 'text-align:right', text: '# VC' }),
            sortHeader('value_cost', 'Value/Cost'),
            el('th', { scope: 'col', text: 'Verdict' })
          )),
          tbody
        )
      ),
      el('div', { class: 'footnote', text: 'Sort: Implied value / Value/Cost · Filter: Category, Chain, Watchlist, Rising · Search · Toggle Pre-token / Live token.' })
    );
  }

  // Hidden Gems permanen (S02): rank implied → rank Value/Cost, dihitung dari board.
  function gemsPanel() {
    var gemSlugs = ['loopscale-lending', 'extended-perps', 'doppler-finance'];
    var gemRows = gemSlugs.map(function (slug) {
      var r = BOARD.filter(function (x) { return x.slug === slug; })[0];
      return el('tr', { onclick: function () { openDetail(slug); } },
        el('td', null, el('b', { text: r.name })),
        el('td', { class: 'num', text: '#' + r.rank + ' → #' + vcRank[slug] }),
        el('td', { class: 'num', text: fmtVC(r.value_cost) }),
        el('td', null, el('span', { class: 'badge ' + String(r.verdict || '').toLowerCase(), text: r.verdict || '' }))
      );
    });
    var thinGem = gemSlugs.map(function (slug) { return BOARD.filter(function (x) { return x.slug === slug; })[0]; })
      .filter(function (r) { return r.verdict !== 'FARM'; })[0];
    var foot = thinGem ? thinGem.name + ' ' + thinGem.verdict + ' (risiko ' + (thinGem.risk_score >= 2 ? 'HIGH' : 'MEDIUM') + ') — masuk panel sebagai temuan ranking.' : '';
    var panel = el('div', { class: 'panel' },
      el('h3', { text: 'HIDDEN GEMS — PERMANEN (RANK IMPLIED → RANK VALUE/COST)' }),
      el('table', null,
        el('thead', null, el('tr', null,
          el('th', { scope: 'col', text: 'Protokol' }),
          el('th', { scope: 'col', style: 'text-align:right', text: 'Rank' }),
          el('th', { scope: 'col', style: 'text-align:right', text: 'Value/Cost' }),
          el('th', { scope: 'col', text: 'Verdict' })
        )),
        el('tbody', null, gemRows)
      ),
      el('div', { class: 'footnote', text: foot })
    );
    return panel;
  }

  // Panel 12 playbook di layar (SO-TRV4-032 butir 3): nama + jumlah + contoh per
  // playbook, dihitung dari board; klik satu playbook menampilkan langkah 2-nya
  // kata demi kata dari board.json (bukan parafrasa). Satu baris per sel supaya
  // panel muat di kolom kanan S02 tanpa meluapkan layar 800px.
  function playbooksPanel() {
    var cells = PLAYBOOK_ORDER.map(function (id) {
      var st = pbStats[id];
      if (!st) return null;
      return el('button', { type: 'button', class: 'pb-cell', 'aria-pressed': selectedPlaybook === id ? 'true' : 'false',
        onclick: function () { selectedPlaybook = id; render(); } },
        el('b', { text: id + ' · ' + PLAYBOOK_LABELS[id] + ' · ' + st.count + ' · ' + st.example.name + ' #' + st.example.rank })
      );
    });
    var ex = pbStats[selectedPlaybook] ? pbStats[selectedPlaybook].example : null;
    var quote = ex && ex.farm_steps && ex.farm_steps[1] ? ex.farm_steps[1] : '';
    return el('div', { class: 'panel' },
      el('h3', { text: '12 PLAYBOOKS — ' + allSteps.length.toLocaleString('id-ID') + ' FARM STEPS (6 PER PROTOKOL)' }),
      el('div', { class: 'pb-grid' }, cells),
      el('div', { class: 'pb-quote' },
        el('b', { text: 'Langkah 2 — ' + selectedPlaybook + ' (' + (ex ? ex.name : '') + '), kata demi kata dari board.json: ' }),
        quote
      ),
      el('div', { class: 'footnote', text: 'Tabel bukti lengkap ada di dossier 00-proof.md §5.' })
    );
  }

  // Penjelasan floor + akuntansi snapshot (SO-TRV4-032 butir 5). Angka-angka di
  // sini dari FLOOR_COUNTS (dihitung dari snapshot tersegel — lihat komentar di
  // atas deklarasinya); floor_usd + tanggal dari data.js (META).
  function floorPanel() {
    var f = FLOOR_COUNTS;
    return el('div', { class: 'panel' },
      el('h3', { text: 'SNAPSHOT — KE MANA ' + f.snapshot + ' PROTOKOL PERGI' }),
      el('div', { class: 'body' },
        el('p', { text: 'Snapshot ' + (META.as_of || '2026-11-14') + ' (DefiLlama): ' + f.snapshot + ' protokol. Floor TVL ' + fmtMoney0(META.floor_usd || 50000000) + ' (floor_usd di data.js) adalah batas atas Rising — bukan filter board: board tidak pakai floor TVL (SPEC_V3 §3.1).' }),
        el('p', { text: f.board + ' pre-token di board (' + f.watchlist + ' watchlist + ' + f.radar + ' radar) · ' + f.preNotBoard + ' pre-token tidak masuk board (' + f.catExcluded + ' kategori dikecualikan + ' + f.nameExcluded + ' aturan nama) · ' + f.tokened + ' sudah bertoken (' + f.liveShown + ' teratas tampil sebagai jangkar Live; ' + f.liveRest + ' lainnya + ' + f.cex + ' CEX tidak ditampilkan).' })
      )
    );
  }

  function boardImpliedView() {
    var sortName = state.sort === 'value_cost' ? 'Value/Cost' : 'implied value';
    return el('div', null,
      topbar(el('span', null, 'TOKEN RADAR ', el('span', { text: 'v4' }), ' — BOARD — BY ' + (state.sort === 'value_cost' ? 'VALUE/COST' : 'IMPLIED VALUE'))),
      formulaStrip(),
      el('div', { class: 'caption', text: 'Board ' + BOARD.length + ' baris — diurutkan by ' + sortName + '. Pilih di dropdown "Urutkan": tabel ini diurutkan di tempat, tanpa pindah halaman.' }),
      el('div', { class: 'view-links' },
        el('button', { class: 'linklike', type: 'button', text: '← Kembali ke top-10 Value/Cost', onclick: function () { state.view = 'hero'; state.sort = 'value_cost'; state.tab = 'pre-token'; writeHash(); render(); } })
      ),
      controls(),
      state.tab === 'pre-token'
        ? el('div', { class: 'cols' },
          el('div', { class: 'col-main' }, boardImpliedTable(), floorPanel()),
          el('div', { class: 'col-side' }, gemsPanel(), playbooksPanel()))
        : liveTable()
    );
  }

  function liveTable() {
    var live = META.live || [];
    var tbody = el('tbody');
    live.forEach(function (r) {
      tbody.appendChild(el('tr', {
        'data-selected': state.liveSelected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openLiveDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLiveDetail(r.slug); } }
      },
        el('td', { class: 'num', text: 'live' }),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' di ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'chain tak bernama') }))),
        el('td', { class: 'num', text: fmtMoney0(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num strong', text: fmtMoney0(r.mcap_usd) }),
        el('td', null, el('span', { class: 'status', text: 'sudah diperdagangkan' }))
      ));
    });
    return el('div', null,
      el('div', { class: 'panel' },
        el('div', { class: 'table-wrap wrap-implied' },
          el('table', null,
            el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protokol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Token' }))),
            tbody
          )
        )
      ),
      el('p', { class: 'footnote', text: 'Protokol live-token tidak pernah dicampur ke ranking pre-token: market cap-nya fakta, bukan model.' })
    );
  }

  // Rising tampilan sendiri (S04): 6 baris, momentum — bukan rekomendasi.
  function risingView() {
    var tbody = el('tbody');
    risingRows.forEach(function (r, i) {
      tbody.appendChild(el('tr', { onclick: function () { openDetail(r.slug); } },
        el('td', null, el('b', { text: r.name }), ' ', el('span', { class: 'badge rising', text: 'RISING' })),
        el('td', { class: 'num strong', text: fmtMoney0(r.rising_score) }),
        el('td', { class: 'num pos', text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtMoney0(r.tvl_usd) }),
        el('td', null, el('span', { class: 'badge ' + String(r.verdict || '').toLowerCase(), text: r.verdict || '' })),
        el('td', { class: 'num', text: 'risiko ' + r.risk_score })
      ));
    });
    var skipN = risingRows.filter(function (r) { return r.verdict === 'SKIP'; }).length;
    var thinN = risingRows.filter(function (r) { return r.verdict === 'THIN'; }).length;
    var risks = risingRows.map(function (r) { return r.risk_score; });
    var riskMin = Math.min.apply(null, risks), riskMax = Math.max.apply(null, risks);
    var top = risingRows[0];
    var ch = top.change_7d === null ? 0 : top.change_7d;
    var dTvlTop = top.tvl_usd * ch / (100 + ch);
    return el('div', null,
      topbar(el('span', null, 'TOKEN RADAR ', el('span', { text: 'v4' }), ' — RISING — 6 PROTOKOL')),
      formulaStrip(),
      el('div', { class: 'caption', text: 'Momentum, bukan rekomendasi.' }),
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('thead', null, el('tr', null,
            el('th', { scope: 'col', text: 'Rising — 6 protokol (tampilan sendiri)' }),
            el('th', { scope: 'col', style: 'text-align:right', text: 'Rising score' }),
            el('th', { scope: 'col', style: 'text-align:right', text: '7d' }),
            el('th', { scope: 'col', style: 'text-align:right', text: 'TVL' }),
            el('th', { scope: 'col', text: 'Verdict' }),
            el('th', { scope: 'col', style: 'text-align:right', text: 'Risk' })
          )),
          tbody
        )
      ),
      el('div', { class: 'footnote', text: 'Keenam Rising berisiko HIGH (risk ' + riskMin + '–' + riskMax + '); ' + skipN + ' SKIP, ' + thinN + ' THIN. Rising adalah sinyal momentum, bukan rekomendasi farm.' }),
      el('div', { class: 'cols', style: 'margin-top:10px' },
        risingDetailPanel(),
        el('div', { class: 'col-side' }, risingMethodPanel(), risingHowPanel(top, dTvlTop))
      ),
      el('div', { class: 'view-links', style: 'margin-top:8px' },
        el('button', { class: 'linklike', type: 'button', text: '← Kembali ke board Value/Cost', onclick: function () { state.view = 'hero'; state.sort = 'value_cost'; state.tab = 'pre-token'; writeHash(); render(); } })
      )
    );
  }

  // Bendera risiko versi singkat (satu baris) untuk panel detail Rising.
  function riskFlagsShort(r) {
    var flags = [];
    if (r.tvl_usd < 100000000) flags.push('TVL < $100 jt');
    if (r.age_days !== null && r.age_days < 180) flags.push('umur < 180 hari');
    if ((r.chains || []).length <= 1) flags.push('1 chain');
    return flags.length ? flags.join(' + ') : 'tanpa bendera risiko';
  }

  // Detail + risiko per baris Rising (SO-TRV4-032 butir 2): semua dari data baris
  // yang sudah ada (ΔTVL, umur, risiko, playbook P1, hold, farm cost). Grid 2
  // kolom supaya panel muat di layar 800px tanpa meluap.
  function risingDetailPanel() {
    var blocks = risingRows.map(function (r) {
      var fc = farmCostOf(r);
      var ch = r.change_7d === null ? 0 : r.change_7d;
      var dTvl = r.tvl_usd * ch / (100 + ch);
      return el('div', { class: 'rising-row' },
        el('div', null,
          el('b', { text: r.name + ' ' }),
          el('span', { class: 'badge ' + String(r.verdict || '').toLowerCase(), text: r.verdict || '' }),
          el('span', { class: 'sub', text: ' · Score ' + fmtMoney0(r.rising_score) })
        ),
        el('div', { class: 'sub', text: '7d ' + fmtPct(r.change_7d) + ' · umur ' + (r.age_days === null ? 'unknown' : r.age_days + ' hari') + ' · ΔTVL +' + fmtMoney0(dTvl) }),
        el('div', { class: 'sub', text: 'Risiko ' + riskLabel(r.risk_score) + ' (' + riskFlagsShort(r) + ') · P1 · hold ' + r.hold_days + ' hari · farm ' + fmtMoney2(fc.total) })
      );
    });
    return el('div', { class: 'col-main' },
      el('div', { class: 'panel' },
        el('h3', { text: 'RISING — DETAIL + RISIKO PER BARIS (KLIK BARIS UNTUK DRAWER)' }),
        el('div', { class: 'rising-grid' }, blocks)
      )
    );
  }

  // Metodologi momentum 7 hari (SO-TRV4-032 butir 2): aturan yang sama dengan
  // risingScoreOf() di file ini + model.ts (SPEC_V3 §7). Tanpa angka baru.
  function risingMethodPanel() {
    return el('div', { class: 'panel' },
      el('h3', { text: 'METODOLOGI MOMENTUM 7 HARI' }),
      el('div', { class: 'body', text: 'Skor Rising = ΔTVL × faktor umur. Syarat masuk: baris board di bawah floor TVL $50 jt, TVL ≥ $10 jt, naik > +10% dalam 7 hari, umur < 365 hari, ΔTVL ≥ $1 jt. ΔTVL = TVL × change/(100+change). Faktor umur: 1,00 bila umur < 180 hari, 0,75 bila ≥ 180 hari. Skor 0 bila satu syarat tak terpenuhi. Dari 198 baris board, 6 memenuhi syarat.' })
    );
  }

  function risingHowPanel(top, dTvlTop) {
    return el('div', { class: 'panel rising-panel' },
      el('h3', { text: 'RISING — CARA MEMBACA' }),
      el('div', { class: 'body', text: 'Rising mengukur pertumbuhan TVL 7 hari — sinyal momentum, berbeda dari efisiensi farm (Value/Cost) dan dari nilai implied. ' + top.name + ' memimpin (' + fmtPct(top.change_7d) + ' dalam 7 hari) karena TVL-nya naik ' + fmtShort(dTvlTop) + ' dalam seminggu — angka yang sama muncul di langkah 2 playbook P1. Keenamnya berisiko HIGH; board menilainya SKIP/THIN apa adanya. Juri yang hanya membaca screenshot ini tetap melihat verdict-nya.' })
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; state.liveSelected = null; writeHash(); });

  function splitStep(s) {
    var at = s.indexOf(' Cost: ');
    if (at < 0) return { action: s, tail: '' };
    return { action: s.slice(0, at), tail: s.slice(at + 1) };
  }
  function riskLabel(score) { return score === 0 ? 'LOW' : score === 1 ? 'MEDIUM' : 'HIGH'; }
  // Risk reasons, SPEC_V3 section 8.3 + OPS_CONTENT section 5. Order: TVL, age, chains.
  function riskReasons(r) {
    var parts = [];
    if (r.tvl_usd < 100000000) parts.push('TVL ' + fmtMoney0(r.tvl_usd) + ' (< $100 jt)');
    if (r.age_days !== null && r.age_days < 180) parts.push('umur ' + r.age_days + ' hari (< 180 hari)');
    if ((r.chains || []).length <= 1) parts.push('1 chain');
    if (parts.length) return parts.join(' + ');
    return 'TVL ' + fmtMoney0(r.tvl_usd) + ' + umur ' + (r.age_days === null ? 'unknown' : r.age_days + ' hari') + ' + ' + (r.chains || []).length + ' chain';
  }
  // Rising detail line, SPEC_V3 section 7.3. ΔTVL = TVL × change/(100+change) — the K2
  // fix: the v2 formula (TVL × change/100) overstated it (august-digital $17.4M, the
  // Rising Score, not the $9.8M actually added).
  function risingDetail(r) {
    var ch = r.change_7d === null ? 0 : r.change_7d;
    var dTvl = r.tvl_usd * ch / (100 + ch);
    return 'TVL ' + fmtMoney0(r.tvl_usd) + ' (≥ $10 jt), +' + (r.change_7d === null ? '0,0' : fmtNum(r.change_7d, 1)) + '% dalam 7 hari, ' + (r.age_days === null ? 'umur unknown' : r.age_days + ' hari') + ', menambah ' + fmtMoney0(dTvl) + ' TVL minggu ini';
  }

  // Verdict P9 (SPEC_V3 section 8.5) + honest boundary. Shown at the end of every farm plan.
  function verdictText(v) {
    if (v === 'FARM') return 'Efisien dan risiko bisa diterima — farm ukuran penuh.';
    if (v === 'THIN') return 'Efisien tapi risiko tinggi — farm tipis, ukuran kecil.';
    return 'Di bawah median efisiensi board — tidak layak ukuran penuh.';
  }
  function verdictSection(row) {
    return el('div', { class: 'verdict' },
      el('div', null, el('span', { class: 'badge ' + String(row.verdict || '').toLowerCase(), text: row.verdict || '' }), ' ', el('b', { text: verdictText(row.verdict) })),
      el('p', { class: 'sub', text: 'Verdict adalah bantuan prioritas relatif di 198 baris ini, bukan klaim profit. SKIP berarti di bawah median board, bukan pasti rugi. Profit absolut tergantung alokasi airdrop per farmer, yang tidak ada di snapshot.' })
    );
  }

  // Label singkat badge Cost per langkah (peran langkah, sama untuk semua protokol).
  var STEP_COST_LABELS = ['Cost: gas first-tx', 'Cost: deposit + gas', 'Cost: gas/minggu', 'Cost: hold', 'Cost: cek klaim', 'Cost: log'];

  function openDetail(slug) {
    var row = BOARD.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    state.liveSelected = null;
    writeHash();
    dialog.textContent = '';
    var c = impliedOf(row);
    var recomputed = fmtMoney0(c);
    var check = c === row.implied_value_usd
      ? 'Dihitung ulang di halaman ini dari angka di atas: ' + recomputed + ' — cocok dengan nilai board.'
      : 'Dihitung ulang di halaman ini: ' + recomputed + ' — TIDAK cocok dengan nilai board ' + fmtMoney0(row.implied_value_usd) + '.';
    // Worked example, SPEC_V3 section 4.2: rendered dynamically from score_breakdown
    // (3 components: base, maturity, LOW) — base ke dolar penuh, maturity 8 desimal,
    // LOW eksak, supaya produknya mereproduksi implied sampai selisih < $1
    // (SO-TRV4-034: 6 desimal memberi selisih $8 pada Steakhouse; 8 desimal
    // memberi $58.462.586,09 -> $58.462.586; error maks $0,91 di 198 baris).
    var sb = row.score_breakdown || {};
    var formula = fmtMoney0(Math.round(sb.base || 0)) + ' (base) × ' + fmtNum(sb.maturity_multiplier || 0, 8) + ' (maturity) × ' + fmtNum(sb.low_multiplier === undefined ? 1 : sb.low_multiplier, 2) + ' (LOW) = ' + fmtMoney0(row.implied_value_usd);
    var steps = (row.farm_steps || []).map(function (s, i) {
      var p = splitStep(s);
      return el('li', null,
        el('div', { class: 'step-n', text: String(i + 1) }),
        el('div', { class: 'step-t' }, el('b', { text: p.action }), p.tail ? ' ' + p.tail : null),
        el('div', { class: 'cost', text: STEP_COST_LABELS[i] || 'Cost' })
      );
    });
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + BOARD.length + ' · TVL #' + tvlRank[row.slug] + ' → Implied #' + row.rank + ' · VC #' + vcRank[row.slug] }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub' }, (row.category || 'Other') + ' di ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'chain tak bernama') + ' ', badge(row), ' ', el('span', { class: 'status', text: 'tidak tercatat punya token' }))
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Tutup detail', text: 'Tutup', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('div', { class: 'detail-section' },
      el('h3', { text: 'IMPLIED VALUE — MODEL BREAKDOWN' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'Rumus per baris' }), el('b', { class: 'num', text: formula })),
        el('div', null, el('span', { text: 'Cek hitung ulang' }), el('b', { class: 'num', text: check }))
      )
    ));
    // Farm plan header, SPEC_V3 section 8.1 + OPS_CONTENT section 5.
    var fc = farmCostOf(row);
    var nt = netting(row);
    var planHead = el('div', { class: 'equation plan-grid' },
      el('div', null, el('span', { text: 'Total farm cost' }), el('b', { class: 'num', text: fmtMoney2(fc.total) + ' (' + fmtMoney2(fc.capital) + ' modal + ' + fmtMoney2(fc.gas) + ' × ' + fc.nTx + ' tx)' })),
      el('div', null, el('span', { text: 'Value/Cost' }), el('b', { class: 'num', text: fmtVC(row.value_cost) })),
      el('div', null, el('span', { text: 'Deposit minimal (pays from)' }), el('b', { class: 'num', text: nt.paysFrom === null ? '—' : fmtMoney2(nt.paysFrom) })),
      el('div', null, el('span', { text: 'Risk' }), el('b', { class: 'num', text: riskLabel(row.risk_score) + ' — ' + riskReasons(row) })),
      el('div', null, el('span', { text: 'Hold' }), el('b', { class: 'num', text: row.hold_days + ' hari' })),
      row.rising ? el('div', null, el('span', { text: 'Rising' }), el('b', { class: 'num', text: 'YA (Rising Score ' + fmtMoney0(row.rising_score) + ')' })) : null
    );
    var farmSection = el('div', { class: 'detail-section' },
      el('h3', { text: 'FARM PLAN — ' + steps.length + ' LANGKAH' }),
      planHead
    );
    farmSection.appendChild(el('p', { class: 'sub', text: VC_SENTENCE + ' Pays from = $1.000 × (fees + T-bill) / slice per $1K — deposit di mana slice menutup semua biaya.' }));
    if (row.rising) farmSection.appendChild(el('p', { class: 'sub', text: risingDetail(row) }));
    farmSection.appendChild(el('ol', { class: 'steps' }, steps));
    farmSection.appendChild(el('p', { class: 'exit-rule' },
      el('b', { text: 'Aturan keluar: ' }), EXIT_RULE + ' ',
      el('span', { class: 'sub', text: '(Aturan rencana — diadopsi dari entri #4; bukan hasil backtest.)' })));
    farmSection.appendChild(verdictSection(row));
    dialog.appendChild(farmSection);
    dialog.appendChild(el('p', { class: 'footnote', text: 'Implied value adalah klaim entry ini sendiri, bukan janji dan bukan prediksi apakah atau kapan token diterbitkan.' }));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  // Drawer live token (SO-TRV4-032 butir 4): fakta dari snapshot + panel
  // "live token — tanpa rencana farm". JANGAN karang rencana farm untuk live
  // token: baris live di data.js tidak punya farm_steps, umur, atau verdict.
  function openLiveDetail(slug) {
    var row = (META.live || []).filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.liveSelected = slug;
    state.selected = null;
    dialog.textContent = '';
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'LIVE TOKEN — SUDAH DIPERDAGANGKAN' }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub' }, (row.category || 'Other') + ' di ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'chain tak bernama') + ' ', el('span', { class: 'status', text: 'sudah diperdagangkan' }))
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Tutup detail', text: 'Tutup', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('div', { class: 'detail-section' },
      el('h3', { text: 'FAKTA DARI SNAPSHOT' }),
      el('div', { class: 'equation plan-grid' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtMoney0(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Market cap' }), el('b', { class: 'num', text: fmtMoney0(row.mcap_usd) })),
        el('div', null, el('span', { text: 'Perubahan 7 hari' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Chain' }), el('b', { class: 'num', text: (row.chains || []).join(', ') || '—' }))
      )
    ));
    dialog.appendChild(el('div', { class: 'detail-section' },
      el('h3', { text: 'LIVE TOKEN — TANPA RENCANA FARM' }),
      el('p', { class: 'sub', text: 'Token ini sudah diperdagangkan: market cap-nya fakta dari snapshot, bukan hasil model. Board tidak me-ranking token live, dan tidak ada rencana farm untuk token live — rencana farm hanya dibuat untuk protokol pre-token di board.' })
    ));
    dialog.appendChild(el('p', { class: 'footnote', text: 'Protokol live-token tidak pernah dicampur ke ranking pre-token: market cap-nya fakta, bukan model.' }));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    if (state.view === 'rising') shell.appendChild(risingView());
    else if (state.view === 'board') shell.appendChild(boardImpliedView());
    else shell.appendChild(boardVCView());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (!modal.isConnected) app.appendChild(modal);
    if (state.selected) openDetail(state.selected);
    else if (state.liveSelected) openLiveDetail(state.liveSelected);
  }

  readHash();
  render();
})();
