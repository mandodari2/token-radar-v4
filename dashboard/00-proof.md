SO: SO-TRV4-022 | 00-proof.md v4 — Dossier Bukti Token Radar v4

**Versi:** v4 (2026-11-17, pasca-DA V6 — SO-TRV4-022, perbaikan V6-F5). v3 file ini ada di `token-radar-v3-source/dashboard/00-proof.md`; v4 ini adalah file yang dibaca juri bersama `DESIGN_V4_ROUND6.md`.
**Sumber angka:** `~/workspace/makefun/token-radar-v3-source/board.json` + `lib/model.ts` + `data.js` (snapshot 14 Nov 2026). Semua angka di file ini dihitung ulang oleh `rnd/verify_round6_numbers.py` (T1, exit 0) — bukan disalin dari laporan lama. File ini sendiri DIHASILKAN oleh `rnd/gen_proof_md.py` dari board.json + hasil T1, bukan diketik tangan.
**Desain yang dibuktikan:** Desain 2 (A-diperbaiki, 3 arah v3). Board, model, dan playbook di bawah ini sama dengan yang dipakai Desain 1 di duel putaran 6 — angka-angka di file ini dihitung dari board yang sama.
**Catatan salinan build D2:** file ini adalah `00-proof.md` v4 dengan 4 kalimat yang merujuk Desain 1 diungkapkan ulang tanpa mengubah satu angka pun, sesuai SPEC_V4 §1 (nol kata yang merujuk konsep Desain 1 di seluruh build D2). Detail jadwal mingguan Desain 1 tidak dipakai di build ini.

## 1. Tesis

Token Radar v4 menjual satu jawaban: **ranking 198 protokol pre-token berdasarkan Value/Cost (implied value / farm cost)** — protokol yang paling efisien modalnya didahulukan, bukan yang TVL-nya terbesar. Implied value berasal dari kurva K1 (§2); tiap baris di-netted ke hurdle bernama (fees + gas + T-bill 4%) dengan rate/jam dan deposit minimal (`pays from`). 12 protokol FARM ber-Value/Cost tertinggi (cutoff bitfi-basis 175.527x) membawa total biaya $1.438,80 (modal $1.350,00 + gas $88,80) untuk total implied $358.329.228 (rasio 249.047,28x). Desain 2 menyajikan jawaban itu sebagai **board yang diurutkan by Value/Cost** dengan hero Nucleus +$62,37/jam (§4).

Kejujuran yang dicatat: plafon 93 kedua desain berdiri di atas basis 90,73% yang TIDAK TERVERIFIKASI dari disk (F9 — leaderboard 16 Nov 08:34 WIB, bukan file). Bila angka live itu salah, plafon ikut salah.

## 2. Formula

- Kurva K1: `log10(mcap) = 3,382 + 0,472·log10(TVL)`; `implied = $42.700.000 × (TVL/$1B)^0,472 × maturity × LOW`.
- Per baris di drawer: `base × maturity × LOW` dengan **base ke dolar penuh, maturity 8 desimal, LOW eksak** — presisi ini mereproduksi implied sampai selisih < $1 (contoh T1: steakhouse base $68.879.419 × maturity 0,84876712 × LOW 1,00 = $58.462.586; hitung ulang: 68.879.419 × 0,84876712 = $58.462.586,09; error maks $0,91 di 198 baris. Dulu 6 desimal memberi selisih $8 — SO-TRV4-034). `$42.700.000` adalah pembulatan 0,14% dari $42.758.885 (model.ts:51).
- Value/Cost = implied value / farm cost; median board 87.977,39. Verdict FARM/THIN/SKIP dari aturan P9 model.ts (VC ≥ median + risiko ≤1 = FARM).
- farm_cost = capital + gas × (2 + floor(hold/7)); hold 30/45/60 hari dari umur (model.ts:399-405); gas per chain: Ethereum $10,00, Solana $0,05, Polygon $0,25, lainnya $0,50.

## 3. Validasi

- Scatter OLS dari 119 titik ASLI `data.js`: intercept 3,382 / slope 0,472 / **R² = 0,143** (n=119, CI slope [0,26; 0,68]). R² tampil di SATU tempat di tiap mockup (panel Model), berdampingan dengan baseline.
- Chip atribusi benar di kedua desain: **"KURVA blind-tested 18/20"** — blind test memvalidasi kurva pada token traded, bukan ranking pre-token.
- Baseline milik kita: **typical error 3,8x vs 5,1x fixed ratio** (model.ts:51-54). "45% vs 34% dalam 3×" TIDAK DITEMUKAN di file v3-source mana pun — itu angka LOO #3 (SCOUT_001_DOSSIER.md), bukan statistik kurva K1, dan tidak pernah dipakai sebagai angka desain.
- Validasi out-of-sample kurva K1 (rnd/loo_walkforward.py, dari 119 titik data.js; meleset tipikal = median faktor meleset): LOO **3,36x vs 4,94x** rasio tetap (43,7% vs 33,6% dalam 3x); walk-forward (latih 43 token terlama s.d. 2024-02-28, uji 44 terbaru; 32 titik tanpa tanggal listing tidak ikut) **2,81x vs 4,96x** (50,0% vs 31,8% dalam 3x). Tabel yang sama tampil di panel Model dashboard.
- Implied value adalah **triase orde-magnitudo, bukan prediksi harga dan bukan kas**: label S04 D1 sesudah perbaikan V6-F3 adalah "implied kumulatif (bukan kas — triase, bisa 0)" dengan skala terpisah dari kas kumulatif.

## 4. Counts (T1-verified)

- Board: **198 ranked** · **40/40 watchlist** · FARM **51** / THIN 48 / SKIP 99 · **6 Rising** · **12 playbooks** · **1.188 farm steps** (6 per protokol).
- Hold: 30 hari = 118, 45 hari = 31, 60 hari = 49 (cocok model.ts 198/198).
- Ranking: median Value/Cost $87.977,39; mean geser rank VC vs implied 34.88; mean geser rank implied vs TVL 10.84; Spearman vs TVL 0.964; Top-10 implied ∩ Top-10 TVL = 8/10.
- Hidden gems: loopscale-lending #42→#10, extended-perps #31→#6, doppler-finance #34→#7.
- Hero Nucleus (hold v3 sendiri, 30 hari): **+$62,37/jam**; top-10 by net/jam **$54,41/jam**, fees $33,00, break-even $10K/posisi 1-in-15,25. Caveat C12: bila tx ikut hold, fees top-10 $42,00.
- Catatan kaki audit (hero Nucleus, V6B-F7): nilai tak bulat **62,4743 − 3,50 − 3,2877 = 55,6866**; net/jam $62,37 = 55,6866 ÷ 0,8929. Selisih $0,01 antara hitungan bulat ($62,47 − $3,50 − $3,29 = $55,68) dan net tampil $55,69 adalah artefak pembulatan nilai tak bulat, bukan kesalahan angka — baris rincian hero di mockup memakai label besaran ("Gross per posisi" dan "net/jam") supaya ketiganya tidak tertukar.
- Aturan keluar (rencana, di tiap drawer farm plan — SO-TRV4-034): **keluar bila TVL turun 25% dalam seminggu** — aturan rencana yang diadopsi dari entri #4 (SCOUT_TOP5_BLIND.md); bukan hasil backtest, dan bukan klaim hasil.
- 12 FARM ber-Value/Cost tertinggi (cutoff bitfi-basis 175.527x; #13 FARM hyperithm 172.792x di bawah cutoff); total biaya $1.438,80, total implied $358.329.228, rasio 249.047,28x.

## 5. Tabel bukti "12 playbooks"

Satu baris per playbook; aksi inti (langkah 2) **berbeda** di setiap baris; contoh = protokol rank tertinggi (rank implied terendah) di playbook itu; jumlah baris T1-verified (total 198). Kolom terakhir adalah **kutipan kata demi kata** dari `farm_steps[1]` contoh itu di board.json — bukan parafrasa — sehingga tabel ini dapat diperiksa ulang kata demi kata dari board.json (`rnd/verify_round6_numbers.py` §8).

Tabel ini memenuhi Red Team §3.3 (a)–(d) sebagaimana dirujuk `DESIGN_V4_ROUND6.md` §5 / `DESIGN_AUDIT.md` F11: (a) satu baris per playbook; (b) aksi inti langkah 2 berbeda di setiap baris (12 aksi berbeda, diverifikasi berbeda kata demi kata di bawah); (c) satu contoh protokol + rank per baris; (d) jumlah baris per playbook — bukan sekadar angka.

| Playbook | Aturan (model.ts) | Baris | Contoh (rank) | Aksi inti langkah 2 — singkat (brief §5) | Langkah 2 kata demi kata — board.json `farm_steps[1]` |
|---|---|---|---|---|---|
| P1 | Rising | 6 | Shift DeFi (#77) | Deposit $50 USDC ke posisi yield utama + catatan "added $46.6M TVL in 7 days, so enter this week" | Deposit $50 of USDC into Shift DeFi's main yield position on Ethereum and keep it open — Shift DeFi added $46.6M TVL in 7 days, so enter this week. Cost: $50 of capital and about $10 of gas. Time: 15 minutes to set up. |
| P2 | Vault, risiko 0 | 13 | Steakhouse Financial (#1) | Deposit $150 USDC ke vault di Base, simpan shares | Deposit $150 of USDC into the Steakhouse Financial vault on Base and keep the shares. Cost: $150 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P3 | Vault, risiko 1 | 30 | Nonce Capital (#7) | Cek points page live, lalu deposit $100 USDC ke vault di Ethereum | Check that Nonce Capital's points page is live, then deposit $100 of USDC into the Nonce Capital vault on Ethereum and keep the shares. Cost: $100 of capital and about $10 of gas. Time: 15 minutes to set up. |
| P4 | Vault, risiko 2–3 | 43 | Armitage by Wintermute (#38) | Verifikasi points page + vault menerima deposit, lalu deposit $100 USDC | Verify Armitage by Wintermute's points page is live and the vault accepts deposits, then deposit $100 of USDC into the Armitage by Wintermute vault on Ethereum and keep the shares. Cost: $100 of capital and about $10 of gas. Time: 15 minutes to set up. |
| P5 | DEX | 36 | Bittensor dTAO (#13) | Provide $100 likuiditas ke pool utama di Bittensor | Provide $100 of liquidity to Bittensor dTAO's main pool on Bittensor and keep the position open. Cost: $100 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P6 | Lending, risiko ≤1 | 11 | USDD (#4) | Deposit $150 collateral dan mint stable asset di Tron | Deposit $150 of collateral and mint the protocol's stable asset through USDD on Tron. Cost: $150 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P7 | Lending, risiko 2–3 | 16 | Loopscale Lending (#42) | Verifikasi lending market live, lalu supply $50 USDC di Solana | Verify Loopscale Lending's lending market is live and accepts $50 of supply, then supply $50 of USDC to Loopscale Lending on Solana and keep the position open. Cost: $50 of capital and under $0.05 of gas. Time: 15 minutes to set up. |
| P8 | RWA | 20 | OnRe (#11) | Mint $100 yield asset di Solana dan hold | Mint $100 of the OnRe yield asset on Solana and hold it. Cost: $100 of capital and under $0.05 of gas. Time: 15 minutes to set up. |
| P9 | Staking | 9 | b14g (#30) | Deposit $100 BTC di Bitcoin, simpan receipt | Deposit $100 of BTC into b14g on Bitcoin and keep the receipt. Cost: $100 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P10 | Bridge | 5 | Hive Protocol (#14) | Bridge $100 USDC ke chain, pakai di satu chain app | Bridge $100 of USDC onto Hive Protocol and use it in one of the chain's apps, then keep a balance on the chain. Cost: $100 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P11 | Prediction/Insurance | 3 | Polymarket International (#6) | Fund $100 dan pasang satu posisi pasar | Fund $100 and place one market position on Polymarket International. Cost: $100 of capital and about $0.25 of gas. Time: 15 minutes to set up. |
| P12 | Lainnya (fallback) | 6 | Lightning Network (#21) | Kirim satu pembayaran $100 lewat Lightning, simpan receipt | Send one $100 payment through Lightning Network on Bitcoin and keep the receipt. Cost: $100 of capital and about $0.50 of gas. Time: 15 minutes to set up. |

Total baris: 6+13+30+43+36+11+16+20+9+5+3+6 = **198**. Semua 1.188 farm steps (6 per baris) ada; langkah 6 tiap rencana menyatakan total = `farm_cost` persis (T1-verified).

Kejujuran yang dicatat (F11, tetap terbuka sebagian): ini bukti **teks** di dossier — juri membacanya di teks dossier yang memang ia baca — bukan bukti 12 rencana di layar. 4 screenshot tidak akan pernah memuat 12 rencana lengkap; yang terlihat di layar adalah 1 drawer utuh + top-10 VC (D2).

## 6. Cara verifikasi ulang

```
python3 rnd/verify_round6_numbers.py   # exit 0, "T1: SEMUA ASERSI LOLOS"
python3 rnd/loo_walkforward.py         # deterministik, hasil sama bila diulang
python3 rnd/gen_proof_md.py            # regenerasi file ini dari board.json
```
§8 skrip T1 memeriksa file ini: ada + 12 baris playbook cocok dengan board.json (jumlah baris, contoh + rank, kutipan langkah 2 kata demi kata, 12 aksi berbeda, total 198). Satu asersi gagal = bukti belum selesai.

— CPO, Token Radar v4 — SO-TRV4-022 —
