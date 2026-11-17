SO: SO-TRV4-056 | 00-proof.md v4-final — Dossier Bukti Token Radar v4

**Versi:** v4-final (2026-11-17, SO-TRV4-056 — flags generated + item +1 Blind Judge K2–K5; coverage fix SO-TRV4-055: 31 slug dikembalikan ke board dengan flag LIVE + verdict SKIP, 16 tetap dihapus, coverage watchlist 40/40 tanpa pengecualian). v3 file ini ada di `token-radar-v3-source/dashboard/00-proof.md`; v4 ini adalah file yang dibaca juri bersama `DESIGN_V4_ROUND6.md`.
**Sumber angka:** `~/workspace/makefun/token-radar-v4-source/board.json` + `lib/model.ts` + `data.js` (snapshot 14 Nov 2026). Semua angka di file ini dihitung ulang oleh `rnd/verify_integration_v4.py` (T1 final, exit 0) — bukan disalin dari laporan lama. File ini sendiri DIHASILKAN oleh `rnd/gen_proof_md.py` dari board.json + hasil T1, bukan diketik tangan.
**Desain yang dibuktikan:** Desain 2 (A-diperbaiki, 3 arah v3). Board, model, dan playbook di bawah ini sama dengan yang dipakai Desain 1 di duel putaran 6 — angka-angka di file ini dihitung dari board yang sama.

## 1. Tesis

Token Radar v4 menjual satu jawaban: **ranking 182 protokol pre-token berdasarkan Value/Cost (implied value / farm cost)** — protokol yang paling efisien modalnya didahulukan, bukan yang TVL-nya terbesar. Implied value berasal dari kurva K1 (§2); tiap baris di-netted ke hurdle bernama (fees + gas + T-bill 4%) dengan rate/jam dan deposit minimal (`pays from`). 11 protokol FARM (SO-TRV4-042: net P10 ≥ 3× biaya) membawa total biaya $581,50 untuk total implied $44.709.687 (rasio 76.886,82x). Desain 2 menyajikan jawaban itu sebagai **jawaban farm dulu di landing** — farm book + top-10 net/jam P10 di atas, board by Value/Cost di bawahnya (SO-TRV4-056, K4) — dengan hero Nucleus +$40,57/jam (P10) (§4).

Kejujuran yang dicatat: plafon 93 kedua desain berdiri di atas basis 90,73% yang TIDAK TERVERIFIKASI dari disk (F9 — leaderboard 16 Nov 08:34 WIB, bukan file). Bila angka live itu salah, plafon ikut salah.

Liveness (SO-TRV4-037/044/047/048/049/055): dari 198 baris awal, **16 slug tetap dihapus** karena tokennya sudah live — 15 Kelompok A (token sendiri) + SUBFROST (DIESEL) — dan **31 slug dikembalikan ke board dengan flag LIVE + verdict SKIP** (13 watchlist demi gate coverage 40/40 + 18 B1/D-B1 non-watchlist dengan perlakuan sama seperti 3 baris B2). Token mereka sudah live, jadi mereka BUKAN kandidat farm — ranking tetap normal by implied (USDD jujur di rank #4), tapi mereka keluar dari semua jawaban farm (hero, farm book, top-10 net/jam, Hidden Gems, Rising, contoh playbook). **3 baris B2 dipertahankan dengan flag “LIVE via induk”** (stellar-defi-hub, decibel, fluxion-network) dan **27 baris Kelompok C dipertahankan dengan flag “TIDAK PASTI”** — keduanya tampil terlihat di baris dan drawer, bukan disembunyikan.

## 2. Formula

- Kurva K1: `log10(mcap) = 3,382 + 0,472·log10(TVL)`; `implied = $42.700.000 × (TVL/$1B)^0,472 × maturity × LOW`.
- Per baris di drawer: `base × maturity × LOW` dengan **base ke dolar penuh, maturity 8 desimal, LOW eksak** — presisi ini mereproduksi implied sampai selisih < $1 (contoh T1: steakhouse base $68.879.419 × maturity 0,84876712 × LOW 1,00 = $58.462.586; hitung ulang: 68.879.419 × 0,84876712 = $58.462.586,09; error maks $0,91 di 182 baris. Dulu 6 desimal memberi selisih $8 — SO-TRV4-034). `$42.700.000` adalah pembulatan 0,14% dari $42.758.885 (model.ts:51).
- Value/Cost = implied value / farm cost; median board $86.349,64. Verdict FARM/THIN/SKIP dari aturan netted SO-TRV4-042 (bukan median split lama): per posisi $1K di skenario bawah (implied P10, bootstrap 1.000 ulangan), slice_P10 = implied_P10 × 0,10 × $1.000 / TVL; biaya = fees ($1,50 + 4× gas chain pertama) + T-bill ($1.000 × 4% × hold/365); FARM bila net_P10 ≥ 3× biaya dan risk ≤ 1; THIN bila ekonomi lolos dan risk HIGH; SKIP bila net_P10 < 3× biaya. Deposit minimal (pays from) = $1.000 × biaya / slice per $1K — deposit di mana slice menutup semua biaya. Median Value/Cost hanya statistik display — bukan lagi ambang verdict.
- farm_cost = capital + gas × (2 + floor(hold/7)); hold 30/45/60 hari dari umur (model.ts:399-405); gas per chain: Ethereum $10,00, Solana $0,05, Polygon $0,25, lainnya $0,50.

## 3. Validasi

- Scatter OLS dari 119 titik ASLI `data.js`: intercept 3,382 / slope 0,472 / **R² = 0,143** (n=119, CI slope [0,26; 0,68]). R² tampil di SATU tempat di tiap mockup (panel Model), berdampingan dengan baseline. Semua angka §3 ini DIHITUNG di build (`lib/validation.ts`, dari snapshot tersegel) — bukan diketik tangan; `main.ts` menggagalkan build bila prosa di sini tidak cocok dengan hasil hitungan.
- Chip atribusi benar di kedua desain: **"KURVA blind-tested 20/20"** — blind test memvalidasi kurva pada token traded, bukan ranking pre-token. Protokol build-time: 20× split 70/30 acak (latih 83 / uji 36, seed 12345, kurva di-fit ulang tiap split, baseline = rasio median latih); menang 20/20. Uji yang sama pada seed lain memberi 17/20 (riset v2) dan 18/20 (Devil's Advocate) — skrip kedua uji itu tidak tersimpan, jadi hitungan pastinya tidak bisa direproduksi; yang robust adalah arahnya (kurva selalu menang).
- Baseline milik kita: **error tipikal 3,38x vs 5,04x rasio tetap** (median pooled 20×36 prediksi uji; dalam 5x: 62,4% vs 49,6%; dalam 2x: 31,9%). "45% vs 34% dalam 3×" TIDAK DITEMUKAN di file v3-source mana pun — itu angka LOO #3 (SCOUT_001_DOSSIER.md), bukan statistik kurva K1, dan tidak pernah dipakai sebagai angka desain.
- Validasi out-of-sample kurva K1 (dihitung di build, `lib/validation.ts`; cross-check independen `rnd/loo_walkforward.py`, dari 119 titik data.js; meleset tipikal = median faktor meleset): LOO **3,36x vs 4,94x** rasio tetap (43,7% vs 33,6% dalam 3x); walk-forward (latih 43 token terlama s.d. 2024-02-28, uji 44 terbaru; 32 titik tanpa tanggal listing tidak ikut) **2,81x vs 4,96x** (50,0% vs 31,8% dalam 3x). Tabel yang sama tampil di panel Model dashboard. LOO dihitung dua kali secara independen (di halaman dari scatter + di build) dan harus cocok (`window.__radarCheck.looMatchesBuild`).
- Di pita $100 jt–$1 M (16 dari 119 titik), kurva hampir tidak punya daya prediksi: in-band slope -0,08 — keunggulannya lintas pita, bukan di dalam pita. Pita ini hanya berisi 16 titik, jadi angka itu sendiri rapuh (dihitung di build, `lib/validation.ts`).
- Sensitivitas eksponen terhadap token zero-mcap (dihitung di build, n=133: 119 + 14 token zero/negatif-mcap yang di-floor): Dikecualikan 0,472 · Floor $1 → 0,844 · Floor $1.000 → 0,675 · Floor $100.000 → 0,563 · Floor $1 jt → 0,507. Baris Floor $100.000 dikoreksi dari 0,560 (Devil's Advocate — tidak mereproduksi dari varian sampel mana pun yang dicoba).
- Pita kategori LOW membawa manfaat forward-in-time: menghapus LOW memperburuk error old-vs-young sebesar +0,06 dex (pooled, 3 potong waktu 2023-06-01 / 2024-01-01 / 2024-06-01: +0,04 / +0,05 / +0,06; dihitung di build). Koefisien regresi multivariat (dihitung di build): HIGH -0,089 (≈ nol — HIGH dihapus), LOW -0,703 (sangat didukung — LOW dipertahankan).
- Riwayat riset (BUKAN hitungan build — skripnya tidak tersimpan, dikutip dengan sumbernya): lantai error empiris ~0,51 dex (terbaik dari 20+ keluarga model di uji Layer A; tidak ada yang menembus 0,50 dex — `rnd/spike_models.py`, `RND_V4_SPIKE.md`); memasukkan token mati yang di-floor merusak prediksi ke depan, Layer B +0,19 sampai +1,72 dex (`V3_EXPERIMENTS_TIER1_REPORT.md` §4.2).
- Implied value adalah **triase orde-magnitudo, bukan prediksi harga dan bukan kas**: label S04 D1 sesudah perbaikan V6-F3 adalah "implied kumulatif (bukan kas — triase, bisa 0)" dengan skala terpisah dari kas kumulatif.
- Walk-forward kedua (SO-TRV4-056, split berbeda 60/40 — latih 52 token terlama s.d. 2024-08-22, uji 35 terbaru; 32 titik tanpa tanggal tidak ikut): walk-forward kedua (60/40) **2,20x vs 4,84x** (54,3% vs 31,4% dalam 3x). Angka yang sama tampil di panel Model dashboard (baris ketiga tabel validasi).
- Blind test — prosedur reproduksi (SO-TRV4-058, Ketidaksesuaian B): PRNG **mulberry32, seed 12345** (`lib/validation.ts`, fungsi `blindTest`); 20× split acak 70/30 atas 119 titik scatter (latih 83 / uji 36 tiap split, Fisher-Yates dari ujung); kurva OLS di-fit ulang tiap split; baseline flat = median latih rasio mcap/TVL; **menang bila median |error| kurva < median |error| flat pada set uji split itu** — 20/20; error tipikal = median 10^|error| atas 720 prediksi uji yang dikumpulkan. Reproduksi mandiri: `python3 rnd/reproduce_blind.py` (meniru persis PRNG + shuffle TS, tanpa `random` Python) memberi **20/20, 3,38x vs 5,04x** — sama persis dengan `validation.json`.

## 4. Counts (T1-verified)

- Board: **182 ranked** · **40/40 watchlist** · FARM **11** / THIN 13 / SKIP 158 · **6 Rising** (semuanya SKIP) · **12 playbooks** · **1092 farm steps** (6 per protokol).
- Hold: 30 hari = 104, 45 hari = 30, 60 hari = 48 (cocok model.ts 182/182).
- Ranking: median Value/Cost $86.349,64; mean geser rank VC vs implied 32,58; mean geser rank implied vs TVL 9,41; Spearman vs TVL 0,97; Top-10 implied ∩ Top-10 TVL = 8/10.
- Hidden gems: loopscale-lending #42→#10, extended-perps #31→#6. Doppler (gem lama #3) KEMBALI ke board (SO-TRV4-055) dengan flag LIVE + verdict SKIP di rank #34 — bukan lagi gem, karena token XDP sudah live.
- Hero Nucleus (hold v3 sendiri, 30 hari): **+$40,57/jam (P10)** — dulu $62,37/jam (median); definisi net/jam kini SATU di seluruh halaman, P10 (SO-TRV4-056, K3); top-10 by net/jam P10 **$34,52/jam** (dulu $51,48/jam median), fees $32,20, break-even $10K/posisi 1-in-10,34 (dulu 1-in-14,54). Caveat C12: bila tx ikut hold, fees top-10 $40,80.
- Catatan kaki audit (hero Nucleus P10, V6B-F7 — SO-TRV4-056): nilai tak bulat **43,0152 − 3,5000 − 3,2877 = 36,2275**; net/jam P10 $40,57 = 36,2275 ÷ 0,8929. Selisih $0,01 antara hitungan bulat dan net tampil adalah artefak pembulatan nilai tak bulat, bukan kesalahan angka — baris rincian hero memakai label besaran ("Gross P10 per posisi", "net P10", "net/jam P10") supaya ketiganya tidak tertukar. T-bill 4% di sini adalah yield yang dikorbankan — proksi T-bill 4% atas slice $1K; tidak ada komponen yield-forgone lain yang bisa dihitung dari snapshot (tidak ada field yield/APY per protokol).
- Aturan keluar (rencana, di tiap drawer farm plan — SO-TRV4-034): **keluar bila TVL turun 25% dalam seminggu** — aturan rencana yang diadopsi dari entri #4 (SCOUT_TOP5_BLIND.md); bukan hasil backtest, dan bukan klaim hasil.
- Farm book: 11 FARM (cutoff alphagrowth 57.507,40x; tidak ada FARM ke-12 — aturan netted hanya meloloskan 11); total biaya $581,50, total implied $44.709.687, rasio 76.886,82x; jam kerja 14,27 jam.
- Verdict netted vs median lama (bootstrap, SO-TRV4-042): median split memberi FARM 49 / THIN 42 / SKIP 91 — netted memberi FARM 11 / THIN 13 / SKIP 158; berubah 95 baris (FARM→SKIP 45, THIN→SKIP 36, SKIP→FARM 7, SKIP→THIN 7). Median net P10 $5,43; median rasio net/biaya 0,66x; net P10 positif 108/182. Baris rapuh (dalam ±5% ambang 3×): fluxion-network 2,87x, stellar-dex 2,90x, aftermath-aflp 2,93x, bouncebit-prime 2,98x, theo-network-thbill 3,00x, growihf 3,08x, sygnum-fiusd-liquidity-fund 3,11x, goonfi 3,12x, estate-protocol 3,13x, kava-mint 3,14x.
- Bootstrap P10 (1.000 ulangan, seed 20261117): median band P90/P10 1,75x; net/jam P10 negatif di 74 baris; hero P10 $40,57/jam; top-10 P10 mean $34,52/jam.
- Clamp/flag kualitas data (SO-TRV4-039): IN-RANGE 181, EXTRAPOLATED 1 (nucleus — hero net/jam adalah satu-satunya baris EXTRAPOLATED, TVL 0,75% di bawah batas fit), DEKAT TEPI 8 (monarq, goonfi, alphagrowth, damm-capital, mezzanine, swan-dao, granite, temple); 114 chain berbeda di board. TIDAK ADA clamp TVL/implied di kode — nilai di luar rentang fit dihitung rumus yang sama dan diberi flag, bukan dipotong.

## 5. Tabel bukti "12 playbooks"

Satu baris per playbook; aksi inti (langkah 2) **berbeda** di setiap baris; contoh = protokol rank tertinggi (rank implied terendah) NON-LIVE di playbook itu (SO-TRV4-055: contoh adalah jawaban farm — baris LIVE bukan kandidat farm, jadi contoh diambil dari baris non-LIVE); jumlah baris T1-verified (total 182). Kolom terakhir adalah **kutipan kata demi kata** dari `farm_steps[1]` contoh itu di board.json — bukan parafrasa — sehingga tabel ini dapat diperiksa ulang kata demi kata dari board.json (`rnd/verify_integration_v4.py` §5).

Tabel ini memenuhi Red Team §3.3 (a)–(d) sebagaimana dirujuk `DESIGN_V4_ROUND6.md` §5 / `DESIGN_AUDIT.md` F11: (a) satu baris per playbook; (b) aksi inti langkah 2 berbeda di setiap baris (12 aksi berbeda, diverifikasi berbeda kata demi kata di bawah); (c) satu contoh protokol + rank per baris; (d) jumlah baris per playbook — bukan sekadar angka.

| Playbook | Aturan (model.ts) | Baris | Contoh (rank) | Aksi inti langkah 2 — singkat (brief §5) | Langkah 2 kata demi kata — board.json `farm_steps[1]` |
|---|---|---|---|---|---|
| P1 | Rising | 6 | Shift DeFi (#73) | Deposit $50 USDC ke posisi yield utama + catatan "added $46.6M TVL in 7 days, so enter this week" | Deposit $50 of USDC into Shift DeFi's main yield position on Ethereum and keep it open — Shift DeFi added $46.6M TVL in 7 days, so enter this week. Cost: $50 of capital and about $10 of gas. Time: 15 minutes to set up. |
| P2 | Vault, risiko 0 | 13 | Steakhouse Financial (#1) | Deposit $150 USDC ke vault di Base, simpan shares | Deposit $150 of USDC into the Steakhouse Financial vault on Base and keep the shares. Cost: $150 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P3 | Vault, risiko 1 | 26 | Nonce Capital (#7) | Cek points page live, lalu deposit $100 USDC ke vault di Ethereum | Check that Nonce Capital's points page is live, then deposit $100 of USDC into the Nonce Capital vault on Ethereum and keep the shares. Cost: $100 of capital and about $10 of gas. Time: 15 minutes to set up. |
| P4 | Vault, risiko 2–3 | 41 | Armitage by Wintermute (#38) | Verifikasi points page + vault menerima deposit, lalu deposit $100 USDC | Verify Armitage by Wintermute's points page is live and the vault accepts deposits, then deposit $100 of USDC into the Armitage by Wintermute vault on Ethereum and keep the shares. Cost: $100 of capital and about $10 of gas. Time: 15 minutes to set up. |
| P5 | DEX | 35 | Extended Perps (#31) | Deposit $50 USDC sebagai margin di Extended Perps, buka satu hedge kecil | Deposit $50 of USDC as margin on Extended Perps and open one small hedge. Cost: $50 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P6 | Lending, risiko ≤1 | 9 | Symbiotic (#8) | Supply $100 USDC sebagai agunan di Symbiotic | Supply $100 of USDC as collateral on Symbiotic and keep the position open. Cost: $100 of capital and about $10 of gas. Time: 15 minutes to set up. |
| P7 | Lending, risiko 2–3 | 13 | Loopscale Lending (#42) | Verifikasi lending market live, lalu supply $50 USDC di Solana | Verify Loopscale Lending's lending market is live and accepts $50 of supply, then supply $50 of USDC to Loopscale Lending on Solana and keep the position open. Cost: $50 of capital and under $0.05 of gas. Time: 15 minutes to set up. |
| P8 | RWA | 17 | OpenTrade (#12) | Mint $100 yield asset OpenTrade di Avalanche dan hold | Mint $100 of the OpenTrade yield asset on Avalanche and hold it. Cost: $100 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P9 | Staking | 8 | b14g (#30) | Deposit $100 BTC di Bitcoin, simpan receipt | Deposit $100 of BTC into b14g on Bitcoin and keep the receipt. Cost: $100 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P10 | Bridge | 5 | Noble (#40) | Bridge $50 USDC ke Noble, pakai di satu chain app | Bridge $50 of USDC onto Noble and use it in one of the chain's apps, then keep a balance on the chain. Cost: $50 of capital and about $0.50 of gas. Time: 15 minutes to set up. |
| P11 | Prediction/Insurance | 3 | Polymarket International (#6) | Fund $100 dan pasang satu posisi pasar | Fund $100 and place one market position on Polymarket International. Cost: $100 of capital and about $0.25 of gas. Time: 15 minutes to set up. |
| P12 | Lainnya (fallback) | 6 | Lightning Network (#21) | Kirim satu pembayaran $100 lewat Lightning, simpan receipt | Send one $100 payment through Lightning Network on Bitcoin and keep the receipt. Cost: $100 of capital and about $0.50 of gas. Time: 15 minutes to set up. |

Total baris: 6+13+26+41+35+9+13+17+8+5+3+6 = **182**. Semua 1092 farm steps (6 per baris) ada; langkah 6 tiap rencana menyatakan total = `farm_cost` persis (T1-verified).

Kejujuran yang dicatat (F11, tetap terbuka sebagian): ini bukti **teks** di dossier — juri membacanya di teks dossier yang memang ia baca — bukan bukti 12 rencana di layar. 4 screenshot tidak akan pernah memuat 12 rencana lengkap; yang terlihat di layar adalah 1 drawer utuh + top-10 VC (D2).

## 6. Cara verifikasi ulang

```
python3 rnd/verify_integration_v4.py   # exit 0, "T1-INTEGRASI-FINAL: SEMUA ASERSI LOLOS"
python3 rnd/loo_walkforward.py         # deterministik, hasil sama bila diulang
python3 rnd/bootstrap_bands.py --verdict-rule netted  # band P10 + verdict netted
python3 rnd/verdict_netted.py          # cross-check verdict netted vs board
python3 rnd/gen_proof_md.py            # regenerasi file ini dari board.json
```
T1 memeriksa file ini: ada + 12 baris playbook cocok dengan board.json (jumlah baris, contoh + rank, kutipan langkah 2 kata demi kata, 12 aksi berbeda, total 182). Satu asersi gagal = bukti belum selesai.

## 7. Appendix audit — 16 baris tetap dihapus dari ranking (sudah trading)

Dari 198 nama yang diaudit (LIVENESS_AUDIT.md SO-TRV4-037 + pecahan 044/047/048/049), **16 baris tetap dihapus dari ranking** karena tokennya sudah live — token sendiri (Kelompok A, 15) atau token emisinya (SUBFROST 1). Baris-baris ini **BUKAN kandidat pre-token dan TIDAK kembali ke ranking**; daftar ini bukti audit untuk juri. Yang dipertahankan dengan flag (bukan di sini): 3 baris B2 (stellar-defi-hub, decibel, fluxion-network — LIVE via induk, produknya sendiri pre-token) dan 27 baris Kelompok C (TIDAK PASTI) — keduanya tampil dengan badge di board.

### Kelompok A — token sendiri live (15)

| #198 | Protokol | Token | Alasan dihapus | Sumber |
|---|---|---|---|---|
| #49 | Avant avUSD (`avant-avusd`) | avUSD | avUSD stablecoin, supply ~92-120 jt, trading. | LIVENESS_AUDIT.md SO-TRV4-037 #49 |
| #59 | IPOR Fusion (`ipor-fusion`) | IPOR | IPOR, TGE 2023; listing Bitget Mar 2023 + Gate.io Apr 2024; bisa dibeli di Uniswap. Catatan: volume kini sangat tipis (~$0-300/24j). | LIVENESS_AUDIT.md SO-TRV4-037 #59 |
| #72 | Aegis YUSD (`aegis-yusd`) | YUSD | YUSD stablecoin, supply ~34,5 jt, trading Uniswap/PancakeSwap. | LIVENESS_AUDIT.md SO-TRV4-037 #72 |
| #75 | Apex Omni (`apex-omni`) | APEX | APEX, token ApeX Protocol; staking/VIP + airdrop 25 jt APEX 2025. | LIVENESS_AUDIT.md SO-TRV4-037 #75 |
| #80 | Solv Strategies (`solv-strategies`) | SOLV | SOLV, listing Binance 17 Jan 2025, mcap ~$25,7 jt, trading Binance/KuCoin/Bybit. | LIVENESS_AUDIT.md SO-TRV4-037 #80 |
| #86 | Hylo Protocol (`hylo-protocol`) | hyUSD | hyUSD stablecoin, mcap ~$24,8 jt, trading Orca (HYUSD/USDC), supply ~$20,4 jt. | LIVENESS_AUDIT.md SO-TRV4-037 #86 |
| #92 | RIF ON CHAIN (`rif-on-chain`) | USDRIF | USDRIF stablecoin, supply ~$2,13 jt, trading Oku (Rootstock). | LIVENESS_AUDIT.md SO-TRV4-037 #92 |
| #99 | Felix CDP (`felix-cdp`) | feUSD | feUSD stablecoin, mcap ~$75 jt, trading Hyperliquid (FEUSD/USDC). | LIVENESS_AUDIT.md SO-TRV4-037 #99 |
| #103 | Bucket CDP (`bucket-cdp`) | BUCK | BUCK stablecoin, mcap ~$25,9 jt, trading Cetus (USDC/BUCK). | LIVENESS_AUDIT.md SO-TRV4-037 #103 |
| #105 | Felix Vaults (`felix-vaults`) | feUSD | feUSD (sama seperti Felix CDP); stablecoin produk Felix, mcap ~$75 jt. | LIVENESS_AUDIT.md SO-TRV4-037 #105 |
| #128 | 3Jane Lending (`3jane-lending`) | USD3 | USD3, mcap ~$130 jt, vol 24j ~$1,42 jt, trading Curve (Ethereum). | LIVENESS_AUDIT.md SO-TRV4-037 #128 |
| #132 | Binaryx Platform (`binaryx-platform`) | FORM | FORM (penerus BNX, migrasi 1:1 Mar 2025), trading ~$0,17, mcap ~$66 jt, rank ~#330. | LIVENESS_AUDIT.md SO-TRV4-037 #132 |
| #150 | BIMA CDP (`bima-cdp`) | USBD | USBD stablecoin (Bitcoin-backed), live mainnet 9 Apr 2025, bisa di-mint. | LIVENESS_AUDIT.md SO-TRV4-037 #150 |
| #164 | BTCFi CDP (`btcfi-cdp`) | BtcUSD | BtcUSD stablecoin, mcap ~$5,34 jt (DefiLlama); vol 24j ~$5,35 jt. | LIVENESS_AUDIT.md SO-TRV4-037 #164 |
| #191 | Flying Tulip ftUSD (`flying-tulip-ftusd`) | FT + ftUSD | FT mcap ~$49-68 jt, trading Curve (FT/FTUSD); ftUSD supply ~4,3 jt, vol 24j ~$22-45 rb. | LIVENESS_AUDIT.md SO-TRV4-037 #191 |

### SUBFROST — token emisi sendiri live (1)

| #198 | Protokol | Token | Alasan dihapus | Sumber |
|---|---|---|---|---|
| #181 | SUBFROST (`subfrost`) | DIESEL | DIESEL, token emisi asli SUBFROST, live dan bisa ditukar di AMM-nya sendiri sejak 20 Jan 2025 (blok Bitcoin 880.000); FUEL memang masih rencana, tapi token lain milik protokol sudah live. | SUBFROST_SYNTETIKA_RECHECK.md SO-TRV4-049 #181 |

## Dikembalikan (31) — kembali ke board dengan flag LIVE + verdict SKIP (SO-TRV4-055)

**31 slug dari audit liveness yang sama kembali ke board**: 9 Kelompok A + 17 B1 + Hive (B²) + 4 D-B1. 13 di antaranya ada di watchlist — kembali demi gate coverage 40/40 (RULES.txt: coverage harus 1,0; entry tak valid = 0) — dan 18 B1/D-B1 non-watchlist kembali dengan perlakuan sama seperti 3 baris B2 yang sudah di board. Token mereka sudah live, jadi mereka **BUKAN kandidat farm**: verdict dipaksa SKIP di pipeline (`lib/model.ts`, sesudah `verdictForNetted`), mereka keluar dari semua jawaban farm (hero, farm book, top-10 net/jam, Hidden Gems, Rising, contoh playbook), dan di board mereka tampil dengan badge LIVE + teks lengkap di drawer. Ranking tetap normal by implied — USDD jujur di rank #4 dengan implied $37.999.267 — flag + SKIP yang menjelaskannya, bukan posisi bawah yang dipaksakan.

### Kelompok A — token sendiri live, kembali karena gate watchlist (9)

| #198 | Protokol | Token | Alasan kembali + bukti live | Sumber |
|---|---|---|---|---|
| #4 | USDD (`usdd`) | USDD | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. USDD stablecoin, mcap ~$1,43-1,77 Miliar, trading Gate/HTX/BingX. | LIVENESS_AUDIT.md SO-TRV4-037 #4 |
| #11 | OnRe (`onre`) | ONYC | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. ONYC, mcap ~$98,9 jt, vol 24j ~$17-18 jt, trading Orca/Raydium (Solana). | LIVENESS_AUDIT.md SO-TRV4-037 #11 |
| #27 | Saturn (`saturn`) | USDAT | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. USDAT stablecoin, supply ~96 jt, vol 24j ~$1,9 jt. | LIVENESS_AUDIT.md SO-TRV4-037 #27 |
| #34 | Doppler Finance (`doppler-finance`) | XDP | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. XDP, TGE 28 Sep 2026, listing OKX/KuCoin/Kraken/Binance Alpha, mcap ~$17 jt, vol 24j ~$9,8 jt. | LIVENESS_AUDIT.md SO-TRV4-037 #34 |
| #41 | infiniFi (`infinifi`) | iUSD | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. iUSD, mcap ~$73,85 jt, trading Curve/Balancer (DEX Ethereum). | LIVENESS_AUDIT.md SO-TRV4-037 #41 |
| #46 | Tori Finance (`tori-finance`) | trUSD | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. trUSD stablecoin, mcap ~$71-77 jt, trading Fluid, live Jul 2026. | LIVENESS_AUDIT.md SO-TRV4-037 #46 |
| #50 | Yuzu Money (`yuzu-money`) | yzUSD | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. yzUSD stablecoin, supply ~$34,9 jt (DefiLlama, Plasma); dokumen Yuzu: secondary trading terbuka. | LIVENESS_AUDIT.md SO-TRV4-037 #50 |
| #51 | Axis (`axis`) | USDX | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. USDX stablecoin, supply ~70 jt, vol 24j ~$520 rb. | LIVENESS_AUDIT.md SO-TRV4-037 #51 |
| #63 | Mezo Earn (`mezo-earn`) | MEZO | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. MEZO, TGE 1 Apr 2026, spot MEZO/USDT buka Bitget 1 Apr 2026, MEXC 2 Apr 2026. | LIVENESS_AUDIT.md SO-TRV4-037 #63 |

### Kelompok B1 — produk/deployment/fitur milik protokol yang tokennya sudah trading (17)

| #198 | Protokol | Token | Alasan kembali + bukti live | Sumber |
|---|---|---|---|---|
| #13 | Bittensor dTAO (`bittensor-dtao`) | TAO (induk) | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — staked product TAO; brief melarang sebagai kandidat. Token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Staked product dari TAO yang sudah trading; dTAO sendiri bukan token terpisah. Preseden Chairman. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #13 |
| #16 | Plume Vaults (`plume-vaults`) | PLUME (induk) | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Produk flagship Plume sendiri (Nest vault); PLUME trading, TGE 21 Jan 2025, Binance/Coinbase. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #16 |
| #43 | Flux Finance (`flux-finance`) | ONDO (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Protokol lending yang di-govern Ondo DAO; ONDO adalah governance token Flux itu sendiri, trading sejak 18 Jan 2024. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #43 |
| #53 | Circle Gateway (`circle-gateway`) | USDC (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Produk Circle sendiri untuk memindahkan USDC; USDC stablecoin Circle (~$69 Miliar). | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #53 |
| #73 | XRPL DEX (`xrpl-dex`) | XRP (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. DEX bawaan ledger XRP itu sendiri sejak 2012 (native to the ledger); XRP aset native ledger. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #73 |
| #74 | Manta CeDeFi (`manta-cedefi`) | MANTA (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Lini produk CeDeFi Manta Network sendiri; MANTA trading. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #74 |
| #82 | Bitlayer YBTC Family (`bitlayer-ybtc-family`) | BTC/BTR (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. YBTC token 1:1 dari BTC yang dikunci (wrapped/bridged); BTR (token Bitlayer sendiri) juga trading (TGE 27 Agu 2025). | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #82 |
| #84 | Plasma One (`plasma-one`) | XPL (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Produk konsumen Plasma (flagship stablecoin banking); cashback dibayar dalam XPL; XPL trading sejak 25 Sep 2025. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #84 |
| #100 | GMX Solana (`gmx-solana`) | GMX (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Deployment GMX di Solana; token GMX (Arbitrum/Avalanche/Solana) sudah trading. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #100 |
| #106 | Katana Pre-Launch (`katana-pre-launch`) | KAT (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. KAT token Katana sendiri, live sejak 2025, trading 100+ market (Binance/Coinbase/Kraken). Label 'Pre-Launch' sudah basi. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #106 |
| #117 | Plasma Saving Vaults (`plasma-saving-vaults`) | XPL (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Produk tabungan bawaan Plasma (flagship native yield primitive); yield ditopang insentif token XPL. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #117 |
| #127 | Stellar DEX (`stellar-dex`) | XLM (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. SDEX, order-book exchange bawaan protokol Stellar; XLM sudah trading. Bukan protokol independen. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #127 |
| #142 | Katana DEX (`katana-dex`) | KAT (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. DEX-nya Katana sendiri; KAT token Katana sudah trading. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #142 |
| #147 | BounceBit Prime (`bouncebit-prime`) | BB (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Sisi institusional (flagship product) ekosistem BounceBit; BB native token, trading di Binance. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #147 |
| #151 | Kava Mint (`kava-mint`) | KAVA (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. 'KAVA is the governance token of the Kava Mint protocol' (dokumen Kava); Mint adalah nama baru Kava CDP (2021). | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #151 |
| #171 | Qearn (`qearn`) | QUBIC (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Program lock QUBIC untuk yield (52 minggu); QUBIC sudah trading. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #171 |
| #176 | Stellar AMM (`stellar-amm`) | XLM (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. AMM pool fitur bawaan protokol Stellar (Protocol 18, Nov 2021), bagian dari SDEX; XLM sudah trading. | GROUPB_SPLIT_REPORT.md SO-TRV4-044 #176 |

### Hive — fitur staking B², token induk B2 live, kembali karena gate watchlist (1)

| #198 | Protokol | Token | Alasan kembali + bukti live | Sumber |
|---|---|---|---|---|
| #14 | Hive Protocol (`hive-protocol`) | B2 (induk) | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Hive Protocol di board adalah B² Hive — fitur staking BTC di jaringan B², bukan protokol mandiri; tokennya B2 milik B² Network (TGE 30 Apr 2025, trading Gate/Bitget/Kraken). | HIVE_RECHECK_REPORT.md SO-TRV4-047 #14 |

### Kelompok D-B1 — produk/fitur milik chain/protokol yang tokennya sudah trading (4)

| #198 | Protokol | Token | Alasan kembali + bukti live | Sumber |
|---|---|---|---|---|
| #67 | Reti Pooling (`reti-pooling`) | ALGO (induk) | Kembali karena gate watchlist 40/40 (RULES.txt: coverage harus 1,0) — token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Protokol pooling milik Algorand Foundation sendiri; imbalannya ALGO; tidak ada rencana token Reti. | GROUPD_RESWEEP_REPORT.md SO-TRV4-048 #67 |
| #85 | Chain Fusion (`chain-fusion`) | ICP (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Teknologi Chain Fusion milik Internet Computer itu sendiri; tokennya ICP; produknya ckBTC kembaran 1:1 BTC. | GROUPD_RESWEEP_REPORT.md SO-TRV4-048 #85 |
| #160 | BEND (`bend`) | BERA (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Aplikasi pinjaman resmi ('enshrined') Berachain, dioperasikan tim inti Berachain; tokennya BERA. | GROUPD_RESWEEP_REPORT.md SO-TRV4-048 #160 |
| #170 | Boros (`boros`) | PENDLE (induk) | Kembali dengan perlakuan sama seperti 3 baris B2 di board — produk/deployment milik protokol yang tokennya sudah trading; token sudah live, verdict SKIP + flag LIVE, bukan kandidat farm. Produk trading funding-rate milik Pendle; Pendle menegaskan tidak ada token baru — semua pendapatan kembali ke PENDLE. | GROUPD_RESWEEP_REPORT.md SO-TRV4-048 #170 |

— CPO, Token Radar v4 — SO-TRV4-055 —
