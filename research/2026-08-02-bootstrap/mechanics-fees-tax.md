# BVB Market Mechanics, BT Trade Costs, Romanian Investor Taxation — as of 2026-08-02

All facts dated and sourced. Verified via live web research 2026-08-02 (Saturday; last BVB trading session was Friday 2026-07-31).

---

## 1. BVB Trading Hours — Regulated (Main) Market, equities (Bucharest local time = EEST/UTC+3 in summer)

Schedule in force since 1 Oct 2018 (BVB announcement 13 Sep 2018, `bvb.ro/info/Anunturi/Anunt_program BVB.pdf`), confirmed unchanged on the live schedule page `m.bvb.ro/tradingandstatistics/tradingsessionschedule` (fetched 2026-08-02):

| Phase | Main market "Regular" (REGS) |
|---|---|
| Pre-open (opening auction call) | 09:45 – 10:00 |
| Opening auction fixing | ~10:00 |
| Continuous trading | 10:00 – 17:45 |
| Pre-close (closing auction call) | 17:45 – 17:50 |
| Closing auction fixing | ~17:50 |
| Trading-at-last (at closing price only) | 17:50 – 18:00 |
| Market closed | 18:00 |

- Since 2 Dec 2019, opening/closing fixings get a **random 0–30 second interval** (anti-gaming), per the same BVB schedule page (fetched 2026-08-02).
- Deal market (block trades, DEALS): 10:00–18:00 continuous.
- The **closing price is the closing-auction price**; trading-at-last executes only at that price.

### Trading days / holidays Aug–Dec 2026
BVB closes on Romanian legal holidays (weekends always closed). For Aug–Dec 2026:
- **Sat 15 Aug 2026** (Assumption) — falls on a weekend, no trading day lost.
- **Mon 30 Nov 2026** (St. Andrew) — CLOSED.
- **Tue 1 Dec 2026** (National Day) — CLOSED.
- **Fri 25 Dec 2026** (Christmas) — CLOSED (26 Dec is a Saturday).
- **Thu 24 Dec and Thu 31 Dec 2026 — expected CLOSED but NOT yet announced.** Precedent: BVB announcement of 5 Dec 2025 closed 24 & 31 Dec 2025, last 2025 session 30 Dec, first 2026 session 5 Jan (`m.bvb.ro/AboutUs/MediaCenter/PressItem/.../6312`, fetched 2026-08-02). BVB does this every year; watch for the announcement in early Dec 2026.
- No other closures Aug–Oct 2026: every Mon–Fri is a trading day.

---

## 2. Order mechanics

### Tick sizes (pasi de pret)
BVB applies MiFID II/RTS 11-style liquidity bands (shareM1…shareM6, keyed to average daily number of transactions). Source: BVB "Actualizare pasi de pret pentru actiuni…", file updated 29 Jan 2026, latest entry effective 30 Jan 2026 (`m.bvb.ro/juridic/files/RO_Aplicare_noi_pasi_de_pret_29012026.pdf`, extracted 2026-08-02). Tick table (RON), selected rows:

| Price range (RON) | shareM2 | shareM3 | shareM4 |
|---|---|---|---|
| 0.5 ≤ p < 1 | 0.002 | 0.001 | 0.0005 |
| 1 ≤ p < 2 | 0.005 | 0.002 | 0.001 |
| 2 ≤ p < 5 | 0.01 | 0.005 | 0.002 |
| 5 ≤ p < 10 | 0.02 | 0.01 | 0.005 |
| 10 ≤ p < 20 | 0.05 | 0.02 | 0.01 |
| 20 ≤ p < 50 | 0.1 | 0.05 | 0.02 |
| 50 ≤ p < 100 | 0.2 | 0.1 | 0.05 |
| 100 ≤ p < 200 | 0.5 | 0.2 | 0.1 |
| 200 ≤ p < 500 | 1 | 0.5 | 0.2 |

Band assignments for key names (same document): **TLV, SNP, H2O, EBS = shareM4**; **SNG, SNN, BRD, TGN, TEL, EL, FP, DIGI, ONE, M, WINE, TTS, AQ, TRP, SFG, PE, ATB, AROBS, CFH, GREEN, SMTL = shareM3**; most smaller regulated-market and AeRO names = shareM2; anything unlisted in the doc defaults to shareM1.

Practical: TLV at ~36.9 RON → tick 0.02 (5.4 bp); SNP at ~1.26 → tick 0.001 (7.9 bp); H2O at ~200 → tick 0.1 (5 bp).

### Order types & validity
- **Limit** and **market** orders supported; market order executes immediately at best available price(s) (Tradeville help, via search 2026-08-02; standard Arena XT behavior — unfilled remainder of a market order rests as limit at last execution price).
- Hidden/iceberg orders and stop orders exist on Arena XT (BRK Arena XT user manual, `brk.ro/files/.../manual_arena_xt_brk.pdf`).
- Validity: **Day** (expires end of session), **Open** (good-till-cancel, **max 62 calendar days** from last update; updating resets the clock), **GTD** (specific date, **max 62 days**), plus FOK/IOC-type executions. Confirmed across BRK Arena XT manual, Investimental guide (`investimental.ro/ghid/ghid-valabilitate-termene-ordine-la-bvb/`) and Prime Transaction rules, via search 2026-08-02. So GTC orders silently die after 62 days — the engine must re-enter resting orders.

### Settlement
- **T+2** since 2014, via Depozitarul Central (financialmarket.ro T+2 explainer; conso.ro; both retrieved 2026-08-02).
- **EU-wide move to T+1 on 11 Oct 2027**, Romania/RON included (EU T+1 Industry Committee `eu-t1.eu`; SIX, Euronext T+1 program pages; retrieved 2026-08-02). No change during 2026.

---

## 3. BT Trade (BT Capital Partners) fee schedule — BVB equities, online retail account

Source: "Anexa — Comisioane, taxe si impozite asociate datorate de client", TIP CONT: ONLINE, live document on the BT Trade EVO platform (`evo.bt-trade.ro/assets/documents/anexa-3-comisioane-taxe-si-impozite-pdf.pdf`, fetched and text-extracted 2026-08-02; document references ASF Instruction 1/6.218/2023 so it post-dates 2023; no explicit version date printed):

**Commission per trade (buy and sell each), tiered by initial invested amount / cumulative 3-month turnover:**

| Tier (RON) | Equities commission |
|---|---|
| < 100,000 | **0.65%** |
| 100,000 – 500,000 | 0.60% |
| 500,000 – 1,000,000 | 0.50% |
| > 1,000,000 | 0.40% |

- Tier is recomputed monthly from rolling 3-month turnover; **once you reach a lower tier it is never raised back** (explicit "FACILITATE" clause).
- **ASF fee 0.06% on buy-side value is INCLUDED in the commission** (section 9 of the Anexa).
- **Order fee: 2 RON per online order**, reduced by the commission generated — i.e., effectively a **2 RON minimum total cost per executed order** (if commission ≥ 2 RON, order fee = 0).
- **Monthly subscription: FREE. Account opening: free. No custody or inactivity fee listed for BVB holdings** (custody fees exist only for foreign markets).
- **Dividend collection fee: 10 RON per security (ISIN) per payment** where the dividend received ≥ 10 RON; if the dividend is < 10 RON, the whole dividend is taken as the fee. (Section 6a — material for a dividend-heavy portfolio.)
- Share transfer out to another intermediary or to Depozitarul Central: 30 RON/ISIN. Transfer in: free.
- No market-data fee appears in the Anexa (platform access free; real-time data terms not specified in the document).
- With 47,000 RON capital the engine sits in the **0.65% tier**; >100k RON of cumulative 3-month turnover would drop it to 0.60% the following month.

**Peer context (typical Romanian retail range, for sanity):** Investimental 0.37% min 1.45 RON (rankia.ro broker comparison, updated 30 Mar 2026); BRK: 1 RON order fee / min 45 RON per quarter (same source); ZF survey: ~5–6 RON total commission per 1,000 RON purchase incl. ~1–1.5 RON ASF+BVB fees (`zf.ro/burse-fonduri-mutuale/...-22437861`). BT Trade at 0.65% is at the expensive end of Romanian retail but fee-free on custody/subscription.

---

## 4. Taxation 2026 — Romanian tax-resident individual, Romanian broker (withholding at source)

**MAJOR CHANGE vs 2025 — rates doubled by Law 239/2025** (second Bolojan fiscal package), published in Monitorul Oficial 15 Dec 2025, in force 1 Jan 2026. Cross-verified: ZF 20 Dec 2025 (`zf.ro/burse-fonduri-mutuale/...-22984186`), socotim.ro 18 Dec 2025, avocatnet.ro, and Financial Market's investment-tax guide of 10 Jul 2026 (post-effective-date confirmation).

### Capital gains (listed shares, sold through a Romanian intermediary — BT Capital Partners qualifies)
- **3% of the gain if held > 365 days** (was 1% in 2023–2025).
- **6% of the gain if held ≤ 365 days** (was 3%).
- **Withheld at source by the broker on each sale; final tax.** No annual filing needed for the tax itself.
- **Losses are NOT deductible and cannot be carried forward** under this at-source regime ("pierderi definitive") — each gain is taxed standalone (ZF 20 Dec 2025; financialmarket.ro 10 Jul 2026). This penalizes churn with mixed outcomes: a +10%/−10% pair still pays tax on the winner.
- FIFO/average-cost mechanics per ASF Instruction 1/6.218/2023 (referenced in the BT Anexa).
- ⚠️ BT's own FAQ page (`intreb.bancatransilvania.ro/care-este-impozitul-pe-profit-la-vanzarea-de-actiuni-pe-bvb/`, fetched 2026-08-02) still shows the old 1%/3% — it is stale; the law and the July 2026 guide control. (BT's dividend FAQ page IS updated to 16%.)

### Dividends
- **16% withholding from 1 Jan 2026** (up from 10% in 2025), per Law 141/2025 (25 Jul 2025) — confirmed by ANAF's law text (`static.anaf.ro/static/10/Anaf/legislatie/L_141_2025.pdf`), PwC alert, StartupCafe 24 Sep 2025, and BT's FAQ (fetched 2026-08-02: "începând din 2026 de 16% și este reținut la sursă"). Applies to dividends **distributed** after 1 Jan 2026; dividends from 2025 interim statements keep 10%. Final tax, withheld at source — nothing to file for the tax itself.

### CASS (10% health contribution) — NOT withheld; via Declarația Unică (D212)
Total annual investment income (dividends + capital gains + interest, cumulated) is compared to thresholds based on the minimum gross wage in force on 1 Jan 2026 = **4,050 RON** (financialmarket.ro guide 10 Jul 2026; capital.ro; impozitul.ro/cass):

| Annual investment income | CASS due |
|---|---|
| < 24,300 RON (6 salaries) | 0 |
| 24,300 – 48,600 RON | 2,430 RON |
| 48,600 – 97,200 RON | 4,860 RON |
| > 97,200 RON (24 salaries) | 9,720 RON |

- Per ZF (20 Dec 2025): for Romanian-broker clients the CASS base counts **gross gains** (no loss netting, mirroring the withholding regime), vs net for foreign-broker clients.
- Deadline: D212 filed and CASS paid by **25 May of the following year** (financialmarket.ro 10 Jul 2026).
- Engine relevance at 47k RON capital: crossing 24,300 RON of gains+dividends in a calendar year triggers a 2,430 RON cliff (≈5.2% of capital) — worth tracking realized income vs the threshold late in the year.

### Announced for 2027
- **No further announced rate changes for 2027** found as of 2026-08-02 (searched ZF/Bursa/Profit/EuropaLibera); the 16% and 3%/6% rates apply from 2026 onward with no sunset.
- Structural: **T+1 settlement from 11 Oct 2027** (EU-wide), which will shift the 365-day holding computation inputs marginally and speed cash recycling.

---

## 5. Practical round-trip cost math (BT Trade, <100k tier)

Measured closing-book spreads, Fri 2026-07-31 17:50+ close (m.bvb.ro instrument pages, fetched 2026-08-02):
- **TLV** 36.90/36.94 → spread 0.108% (2 ticks)
- **SNP** 1.2580/1.2590 → spread 0.079% (1 tick)
- **H2O** 199.80/200.00 → spread 0.100% (2 ticks)

Round-trip friction on a liquid BET blue chip:
- Commission: 0.65% buy + 0.65% sell = **1.30%** (ASF fee included)
- Full spread if crossing both ways: **~0.08–0.15%** (use ~0.10 % planning figure; mid-caps/AeRO 0.5–2%+, avoid market orders there)
- **Total ≈ 1.40% of principal per round trip**, before tax
- Plus exit tax: 3% (>365d) or 6% (≤365d) **of the gain only**, withheld
- Plus 10 RON per dividend payment per ISIN while held

Implications for the engine (47,000 RON):
- **Minimum order size:** 2 RON minimum ⇒ break-even vs 0.65% at ~308 RON/order. Any order ≥ ~500 RON pays pure percentage. With 6–12 positions of 4,000–8,000 RON, the minimum never binds.
- **Minimum sensible holding period:** each round trip burns ~1.4%. Against a BET-type gross return of ~10–15%/yr, one full portfolio turnover per year costs ~10–14% of the expected annual return; monthly churn would be ruinous (~17%/yr friction). Holding **≥12 months** both (a) amortizes friction to ~1.4%/yr or less and (b) **halves the exit tax to 3%**. Sensible floor: plan holds in years, not months; require an expected edge > ~2% (friction + short-term tax delta) before swapping one holding for another within 365 days.
- **No-loss-offset asymmetry:** selling losers costs no tax but their losses never shelter winners — so tax does not reward loss-harvesting; only commissions matter on the loss side.
- **Dividend drag:** 16% tax + 10 RON/ISIN/payment. On a 5%-yield position of 5,000 RON (250 RON gross dividend): 40 RON tax + 10 RON fee = 20% total take. Favor fewer/larger positions in dividend payers; fee is fixed per payment, so a 2,000 RON position yielding 100 RON loses 26% of the dividend to tax+fee.
- **Tier note:** rebalancing >100k RON in any rolling 3 months permanently drops commission to 0.60% (never re-raised).

---

## 6. BET index review calendar 2026

Mechanism (BET Manual, `bvb.ro/info/indices/Manual BET_RO.pdf`, 2012 edition + observed 2026 practice): quarterly periodic adjustments aligned to the Mar/Jun/Sep/Dec futures cycle, computed ~5 trading days before expiry, **effective the first session after the third Friday**; composition (add/remove) decisions taken at the **March and September** committee meetings held in the first week of the quarter's last month. BET currently has **20 constituents** (BET composition page, data of 31 Jul 2026).

Observed 2026 dates:
- **March 2026 review** (BVB press release, `m.bvb.ro/.../Hotarari-ale-Comisiei-Indicilor-in-sedinta-din-6-martie-2026/6353`): committee met **Fri 6 Mar 2026**; new weights/factors computed **13 Mar**; **effective 23 Mar 2026** (Monday after third Friday 20 Mar). BET changes: **CFH (Cris-Tim) added, WINE (Purcari) removed**.
- **June 2026 review**: composition page labeled 19.06.2026 (third Friday) → effective Mon 22 Jun 2026.
- **September 2026 (projected from the fixed pattern — not yet announced):** committee decision ~**Fri 4 Sep 2026** (announced same day via BVB press release); factors computed ~Fri 11 Sep; **changes effective Mon 21 Sep 2026** (third Friday = 18 Sep). This is a composition-decision meeting (March/September cycle) — add/remove risk for borderline names.
- **December 2026 (projected):** committee ~Fri 4 Dec; effective Mon 21 Dec 2026 (third Friday = 18 Dec).

BET composition snapshot, 31 Jul 2026 (m.bvb.ro BET profile, fetched 2026-08-02): 20 names; top weights TLV 18.17%, SNP 15.82%, SNG 14.39%, H2O 12.10%, BRD 7.12%, TGN 6.28%, EL 5.94%, DIGI 5.25%; total basket cap ~148.7bn RON. Weight cap per constituent: 20% at adjustment (manual).

---

## Key sources
- BT Capital Partners fee annex (live, evo.bt-trade.ro), extracted 2026-08-02
- BVB trading schedule page + 13 Sep 2018 program announcement (bvb.ro), fetched 2026-08-02
- BVB tick-size document updated 29 Jan 2026 (m.bvb.ro/juridic), extracted 2026-08-02
- BVB Index Committee press release 6 Mar 2026; BET Manual; BET profile page (31 Jul 2026 data)
- Law 239/2025 coverage: ZF 20 Dec 2025, socotim.ro 18 Dec 2025, avocatnet.ro; Law 141/2025: ANAF text, PwC, StartupCafe 24 Sep 2025
- Financial Market complete 2026 investment-tax guide, 10 Jul 2026
- BT FAQ pages (intreb.bancatransilvania.ro), fetched 2026-08-02
- m.bvb.ro instrument pages TLV/SNP/H2O (close of 31 Jul 2026)
- EU T+1: eu-t1.eu, SIX, Euronext (fetched 2026-08-02)

---CONFIDENCE---
1) Capital gains 3%/6%: confirmed by 3+ independent sources incl. a 10 Jul 2026 post-effective-date guide, but BT's own FAQ still shows stale 1%/3% — I could not fetch the raw text of Law 239/2025 itself; treat 3%/6% as correct with high confidence. One search-engine summary transposed the rates; direct article fetches consistently say 3% >365d / 6% ≤365d. 2) BT Trade Anexa has no printed version date; it was fetched live from evo.bt-trade.ro today so I treat it as current, and its commission grid (0.65% <100k) is consistent with ZF's 5-6 RON per 1,000 RON survey. The 10 RON/ISIN dividend-collection fee is quoted verbatim; my reading 'per payment event' is an interpretation — worth confirming against an actual BT Trade account statement. Real-time market-data fees for BT Trade: not found anywhere; reported as not listed. 3) Dec 24 and Dec 31, 2026 closures are EXPECTED (every-year practice, 2025 precedent) but not yet announced; Nov 30 / Dec 1 / Dec 25 closures derive from the legal-holiday calendar, not an explicit BVB 2026 announcement (BVB publishes these piecemeal). A Rankia calendar listing Apr 3/6 as 2026 BVB holidays appears to use Western Easter and is likely wrong; irrelevant for Aug-Dec. 4) September 2026 BET review dates (committee ~Sep 4, effective Sep 21) are projected from the confirmed March 2026 pattern and the manual's rules — BVB has not yet published them. The BET manual I extracted is the 2012 edition (says 10 constituents); current count is 20, so the manual's mechanics may have been amended in details I could not fetch. 5) Spread figures are closing-book snapshots from Friday 2026-07-31; intraday spreads can be wider, and WebFetch page summaries could not be pixel-verified. 6) CASS 'gross gains' base for Romanian-broker clients rests on ZF's 20 Dec 2025 reporting; I did not read the ANAF norms directly. Minimum wage 4,050 RON on 1 Jan 2026 confirmed by two secondary sources, not by an official MO citation. 7) Order-mechanics details (market-order remainder resting as limit; iceberg availability) come from broker manuals (BRK, Tradeville, Prime Transaction) rather than the current BVB Code text; the 62-day max validity for Open/GTD is confirmed by three independent broker sources.