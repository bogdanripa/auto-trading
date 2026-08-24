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

## IARV — IAR SA Brasov
- Opened: 2026-08-04 (fill; order placed 2026-08-03) (journal: journal/2026-08.md entries of 2026-08-03 and 2026-08-04)
- Tranches: 1/2 filled, 64 sh @ avg 38.8161 (incl. fees), cost basis 2,484.23 RON. **T2 armed for Fri 2026-08-28** (H1 date corrected from "~Aug 31"), condition: H1 net profit ≥1.5x YoY (assumption A7) + AGOA pre-check; then up to 70 sh at limit ≤41.00, total cost basis ≤5,500. Band rationale journaled in the 2026-08-24 weekly entry.
- 2026-08-24 review: **HOLD.** Thesis intact and progressing — H225M 12-unit contract signed 2026-07-17 at €757m (correction: €852m was the SAFE allocation ceiling, not the price); the 30-unit follow-on carrying the local-production thesis remains unsigned and conditional. Mgmt reconfirmed 2026-08-19 (routine). Mark 39.00 vs cost 38.8161 — flat. Open item: Aug 11–12 AGOA resolutions unverified, check before T2.
- Thesis (one line): near-monopoly helicopter MRO for a SAFE-funded (€16.68bn) defense demand step-up, 15x for doubled earnings power. Full thesis: WATCHLIST.md.
- Fair-value band: 48–60 RON.  Kill criteria: H1 profit flat-or-down YoY; SAFE awards bypassing IAR; governance action hostile to minorities.
- Expected holding: 1–3 years (theme duration), reviewed each earnings.

## TLV — Banca Transilvania
- Opened: 2026-08-06 (fill; order first placed 2026-08-03, re-placed daily until filled) (journal: journal/2026-08.md entries of 2026-08-03 through 2026-08-06). Note: this position was missing from this file until the 2026-08-14 daily run caught the gap during account reconciliation — a process miss, not a broker discrepancy; broker holdings matched the journal throughout.
- Tranches: 1/2 filled, 81 sh @ avg 37.0107 (incl. fees), cost basis 2,997.87 RON. **T2 band deliberately NOT raised** on the confirmed-good H1 (2026-08-24 weekly decision): stays 33.00–34.50, plus a dislocation-linked leg at ≤35.50 if BET falls ≥5% from its ATH. Accepted explicitly that this may never fill — tracked as falsifiable assumption A10 (check Oct 31).
- 2026-08-24 review: **HOLD, no add at 37.56.** H1 confirmed the thesis outright — group net profit 2.5bn RON (+26.8% YoY), cost of risk 0.63% (−20bp), NPL 2.41% (−0.24pp), solvency 21.96%, ROE 21.98%, no guidance cut. No kill criterion hit; credit quality moved the *right* way. Not adding because every visible external valuation anchor (targets 29.9–33.88) sits 10–20% below spot, and ⚠ **the issuer buyback previously recorded as live price support closed 2026-05-22** (BVB report TLV_20260522160244) — there is no issuer bid under this price. See LESSONS.md M-2.
- Thesis (one line): dominant retail/SME bank compounding ~25–30%, 9.9x for the market's quality compounder while rates stay high. Full thesis: WATCHLIST.md.
- Fair-value band: 38–44 RON.  Kill criteria: guidance cut below 4bn; bank tax extended AND raised for 2027; NPL inflection in H1/Q3.
- Expected holding: 1–3+ years.
