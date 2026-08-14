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

## IARV — IAR SA Brasov
- Opened: 2026-08-04 (fill; order placed 2026-08-03) (journal: journal/2026-08.md entries of 2026-08-03 and 2026-08-04)
- Tranches: 1/2 filled, 64 sh @ avg 38.8161 (incl. fees), cost basis 2,484.23 RON. T2 planned only after H1 print (~Aug 31) confirms defense step-up.
- Thesis (one line): near-monopoly helicopter MRO for a SAFE-funded (€16.68bn) defense demand step-up, 15x for doubled earnings power. Full thesis: WATCHLIST.md.
- Fair-value band: 48–60 RON.  Kill criteria: H1 profit flat-or-down YoY; SAFE awards bypassing IAR; governance action hostile to minorities.
- Expected holding: 1–3 years (theme duration), reviewed each earnings.

## TLV — Banca Transilvania
- Opened: 2026-08-06 (fill; order first placed 2026-08-03, re-placed daily until filled) (journal: journal/2026-08.md entries of 2026-08-03 through 2026-08-06). Note: this position was missing from this file until the 2026-08-14 daily run caught the gap during account reconciliation — a process miss, not a broker discrepancy; broker holdings matched the journal throughout.
- Tranches: 1/2 filled, 81 sh @ avg 37.0107 (incl. fees), cost basis 2,997.87 RON. T2 planned at 33–34.5 or after H1 (Aug 21, call Aug 24) confirms guidance.
- Thesis (one line): dominant retail/SME bank compounding ~25–30%, 9.9x for the market's quality compounder while rates stay high. Full thesis: WATCHLIST.md.
- Fair-value band: 38–44 RON.  Kill criteria: guidance cut below 4bn; bank tax extended AND raised for 2027; NPL inflection in H1/Q3.
- Expected holding: 1–3+ years.
