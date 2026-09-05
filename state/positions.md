# Positions — engine metadata

The broker is the source of truth for quantities and prices (ENGINE.md §2.4);
this file carries what the broker cannot: the thesis link, entry context, and
kill criteria for each engine-managed position. Updated by any run that opens,
adds to, trims, or closes a position.

Format per position:

```
## TICKER — Company name
- Opened: YYYY-MM-DD (journal: journal/YYYY-MM.md entry of that date)
- Tranches: filled / planned, avg cost, total cost basis
- Thesis (one line) + link to full thesis in journal
- Fair-value band: X–Y RON   Kill criteria: ...
- Expected holding: ...
```

**Weekly review 2026-08-24** (first weekly run since inception): both positions
reviewed against thesis, kill criteria and fair-value band — **both HOLD**,
neither kill criterion approached, no trims warranted. Sizing: IARV 5.31% and
TLV 6.49% of portfolio, both far under the 20% single-name cap; defense 5.31%
and financials 6.49%, far under the 40% sector cap. Portfolio 11.8% invested.
Detail: journal/2026-08.md 2026-08-24 weekly entry.

**2026-08-31 (intraday dislocation run)**: BET fell ~7% intraday off its
corrected ATH, triggering both IARV's already-armed H1-based T2 and TLV's
dislocation-linked T2 leg. TLV filled in full (81 sh); IARV partially filled
(18 of 70 sh, thin book) with 52 sh left resting. Post-fill: IARV ~6.8% of
portfolio at cost, TLV ~12.8%, combined ~18.7% invested (mark) — both still
far under the 20% single-name / 40% sector caps. Detail:
journal/2026-08.md 2026-08-31 (intraday) entry.

**Weekly review 2026-09-05** (second weekly run): both positions reviewed
against thesis, kill criteria and fair-value band — **both HOLD, no
changes.** IARV: no thesis-changing news since the Aug 28 H1; T2 complete,
392 RON of room left under the ≤5,500 satellite cap (the cap, not price, is
now the binding constraint on adding more). TLV: no thesis-changing news;
price (35.98/36.08 live) sits above both the standing T2 band (33.00–34.50)
and the already-filled dislocation band (≤35.50) — no add. Neither kill
criterion approached. No trades this week. Portfolio ~23.4% invested at
cost, cash reserve ~76.6% — comfortably above the ≥25–30% STRATEGY §2
floor. Detail: journal/2026-09.md 2026-09-05 weekly entry.

## IARV — IAR SA Brasov
- Opened: 2026-08-04 (fill; order placed 2026-08-03) (journal: journal/2026-08.md entries of 2026-08-03 and 2026-08-04)
- Tranches: T1 64 sh @ avg 38.8161 (incl. fees). **T2 filled in full — completed 2026-08-31 close (confirmed 2026-09-01 daily run)**: the 52 sh remainder of the day order (limit 35.30) filled by end of day Aug 31 (blocked cash matched exactly). Combined with the 18 sh filled intraday, the full 70 sh T2 tranche is done. Broker-verified position as of 2026-09-01 pre-open: **134 sh @ avg cost 37.0078, total cost basis 4,959.04 RON** — 10.8% of portfolio at cost, just under the ≤5,500 satellite cap. Journal: journal/2026-08.md 2026-08-31 (intraday) entry; journal/2026-09.md 2026-09-01 entry.
- 2026-08-24 review: **HOLD.** Thesis intact and progressing — H225M 12-unit contract signed 2026-07-17 at €757m (correction: €852m was the SAFE allocation ceiling, not the price); the 30-unit follow-on carrying the local-production thesis remains unsigned and conditional. Mgmt reconfirmed 2026-08-19 (routine).
- 2026-08-28: H1 2026 condition MET (net profit 3.98x YoY) — T2 armed, order blocked that day by a BT Trade outage; executed (partially) 2026-08-31 once broker access returned, per a market-wide dislocation (BET -7% off ATH) that also brought the price well under the ≤41.00 band. See the 2026-08-28 and 2026-08-31 journal entries.
- Thesis (one line): near-monopoly helicopter MRO for a SAFE-funded (€16.68bn) defense demand step-up, 15x for doubled earnings power. Full thesis: WATCHLIST.md.
- Fair-value band: 48–60 RON.  Kill criteria: H1 profit flat-or-down YoY; SAFE awards bypassing IAR; governance action hostile to minorities.
- Expected holding: 1–3 years (theme duration), reviewed each earnings.

## TLV — Banca Transilvania
- Opened: 2026-08-06 (fill; order first placed 2026-08-03, re-placed daily until filled) (journal: journal/2026-08.md entries of 2026-08-03 through 2026-08-06). Note: this position was missing from this file until the 2026-08-14 daily run caught the gap during account reconciliation — a process miss, not a broker discrepancy; broker holdings matched the journal throughout.
- Tranches: T1 81 sh @ avg 37.0107 (incl. fees). **T2 dislocation-linked leg FILLED IN FULL 2026-08-31** (intraday): BET fell ≥5% from ATH (−7.08%, to 33,989.44) and TLV traded ≤35.50 (bid/ask 35.08/35.10) with thesis intact — both legs of the pre-written condition (STRATEGY §6 / this file's prior entry) fired. 81 sh @ effective avg 35.245 (incl. fees). New broker-verified position: **162 sh @ avg cost 36.1281, total cost basis 5,852.75 RON** (well under the ≤8,000 full-position cap). Journal: journal/2026-08.md 2026-08-31 (intraday) entry. The standard 33.00–34.50 T2 band was not used (price never traded there); assumption A10 (whether the standard band ever fills) stays open, tracked separately from this dislocation fill.
- 2026-08-24 review: **HOLD, no add at 37.56.** H1 confirmed the thesis outright — group net profit 2.5bn RON (+26.8% YoY), cost of risk 0.63% (−20bp), NPL 2.41% (−0.24pp), solvency 21.96%, ROE 21.98%, no guidance cut. No kill criterion hit; credit quality moved the *right* way. Not adding because every visible external valuation anchor (targets 29.9–33.88) sits 10–20% below spot, and ⚠ **the issuer buyback previously recorded as live price support closed 2026-05-22** (BVB report TLV_20260522160244) — there is no issuer bid under this price. See LESSONS.md M-2.
- Thesis (one line): dominant retail/SME bank compounding ~25–30%, 9.9x for the market's quality compounder while rates stay high. Full thesis: WATCHLIST.md.
- Fair-value band: 38–44 RON.  Kill criteria: guidance cut below 4bn; bank tax extended AND raised for 2027; NPL inflection in H1/Q3.
- Expected holding: 1–3+ years.
