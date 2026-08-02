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

_No positions yet. Inception 2026-08-02._
