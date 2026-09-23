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

**2026-09-15 (daily run)**: AROBS T1 order (placed 2026-09-14) broker-confirmed
filled in full: 3,850 sh @ avg cost 0.7623 (incl. fees), cost basis 2,934.78
RON — first fill at better than the 0.77 limit (day order captured intraday
liquidity below the limit). Portfolio value (cash + holdings, market)
45,554.56 RON: cash 30,426.00 (66.8%), AROBS mkt 2,849.00 (6.3%), IARV mkt
4,542.60 (10.0%), TLV mkt 7,736.96 (17.0%) — ~33.2% invested at market
(~34.9% at cost), all single-name and sector positions well under the
20%/40% caps, cash reserve comfortably above the ≥25–30% floor. No trades
today beyond confirming this fill — no other watchlist trigger in range.
Detail: journal/2026-09.md 2026-09-15 daily entry.

**2026-09-17 (daily run)**: No trades. Portfolio value (cash + holdings,
market) 45,017.80 RON: cash 30,426.00 (67.6%), AROBS mkt 2,849.00 (6.3%),
IARV mkt 4,261.20 (9.5%), TLV mkt 7,481.60 (16.6%) — ~32.4% invested at
market, all single-name/sector positions well under caps. BET closed Sep
16 at 31,693.28 (−13.35% off ATH), ~1.9% above the −15% dislocation tier
— the closest approach yet. Portfolio down 4.13% since inception vs BET
down 12.34% — losing 8.2pp less than BET, consistent with the
falling-market mandate. No thesis changes. Detail: journal/2026-09.md
2026-09-17 daily entry.

**2026-09-18 (daily run)**: No trades. Portfolio value (cash + holdings,
market) 45,000.50 RON: cash 30,426.00 (67.6%), AROBS mkt 2,764.30 (6.1%),
IARV mkt 4,194.20 (9.3%), TLV mkt 7,616.00 (16.9%) — ~32.3% invested at
market, all single-name/sector positions well under caps. BET closed Sep
17 at 32,053.91 (+1.14% day) after a PM (Siegfried Mureșan) was finally
named, reversing an intraday decline — −12.37% off ATH, pulled back from
the −15% tier. Portfolio down 4.16% since inception vs BET down 11.34% —
losing 7.2pp less than BET. No thesis changes; SNN made its closest-yet
approach to its entry band but the restart leg remains unconfirmed.

**Weekly review 2026-09-19** (fourth weekly run): all three positions
reviewed against thesis, kill criteria and fair-value band — **all HOLD,
no changes.** TLV and IARV remain fully capped (no room to add at any
price); AROBS holds T1 only, no second tranche defined. Reporting dates
re-verified clean for all three against each issuer's own BVB financial
calendar (TLV Nov 20 Q3 / Oct 1 Investor Day; IARV Nov 13 Q3; AROBS Nov
19 Q3, newly confirmed). Assumption A14 (AROBS/Cabrio ownership) graded
held on strengthened indirect evidence. Portfolio value (cash +
holdings, market) 45,472.80 RON: cash 30,426.00 (66.9%), AROBS mkt
2,833.60 (6.2%), IARV mkt 4,261.20 (9.4%), TLV mkt 7,952.00 (17.5%) —
~33.1% invested at market, all single-name/sector positions well under
caps (TLV closest at 17.5%, still 2.5pp under the 20% cap). BET closed
Sep 18 at 32,757.81 (+2.20% day, second straight rally on the PM
nomination) — −10.44% off ATH. Portfolio down 3.16% since inception vs
BET down 9.40% — losing about a third of what BET lost (+6.24pp gap,
essentially flat vs last week's +6.00pp; the week-over-week arithmetic
shows both portfolio and index are lower than 7 days ago, so this gap
held mechanically rather than widening on stock selection — see journal
self-check). No trades this week. Detail: journal/2026-09.md 2026-09-19
weekly entry.
Detail: journal/2026-09.md 2026-09-18 daily entry.

**2026-09-21 (daily run)**: No trades. All three positions unchanged and
broker-confirmed (AROBS 3,850 sh, IARV 134 sh, TLV 224 sh), no open
orders. Portfolio value (cash + holdings, market) 45,472.80 RON —
identical to Friday's/the weekly mark since no session has closed over
the weekend: cash 30,426.00 (66.9%), AROBS mkt 2,833.60 (6.2%), IARV mkt
4,261.20 (9.4%), TLV mkt 7,952.00 (17.5%). BET's last close remains Sep
18 (32,757.81, −10.44% off ATH); no new benchmark row today. PSD's
decision on whether to back the Mureșan investiture is being decided
today (BPN meeting), not already resolved as STRATEGY.md's plan assumed
— tracked for the next run. No thesis changes. Detail: journal/2026-09.md
2026-09-21 daily entry.

**2026-09-22 (daily run)**: No trades — and no live broker state this
run. The BT-Trade MCP returned a 502 on every attempt (three retries
across ~20 minutes of other run work); `get_cash`/`get_holdings`/
`list_orders` were never fetched, so nothing here is broker-verified
today. Public-quote estimate only (bvb.ro closes, Sep 21): cash
30,426.00 (last confirmed, unchanged since no order has been placed
since), AROBS mkt ≈2,810.50 (3,850 sh @ 0.7300), IARV mkt ≈4,328.20 (134
sh @ 32.3000), TLV mkt ≈7,884.80 (224 sh @ 35.2000) — **≈45,449.50 RON
total, not authoritative.** The day's dominant development was PSD
formally refusing to back the Mureșan investiture, driving a broad,
−2.59% BET session (−12.76% off ATH) — no company-specific news on any
held name, no kill criterion approached. The next run with working
broker access must reconcile this estimate against a fresh
`get_holdings`/`get_cash` call before treating it as fact. Detail:
journal/2026-09.md 2026-09-22 daily entry.

**2026-09-23 (same-day correction, ~16:40 Bucharest)**: broker access
restored mid-session (`get_cash`/`get_holdings` succeeded; `list_orders`
still 502'd). Reconciled against the pre-open entry below — **exact match,
no discrepancy**: cash 30,426.00 RON, AROBS 3,850 sh @ avg 0.7623, IARV 134
sh @ avg 37.0078, TLV 224 sh @ avg 35.7005. No unexplained activity. Full
detail: journal/2026-09.md 2026-09-23 same-day correction entry.

**2026-09-23 (daily run)**: No trades — and no live broker state this run
either, a second consecutive day (BT-Trade MCP failed to connect at
session start, 502). Public-quote estimate only (bvb.ro closes, Sep 22):
cash 30,426.00 (last confirmed, unchanged), AROBS mkt 2,833.60 (3,850 sh @
0.7360), IARV mkt 4,247.80 (134 sh @ 31.7000), TLV mkt 7,844.48 (224 sh @
35.0200) — **≈45,351.88 RON total, not authoritative.** BET closed Sep 22
at 32,140.01 (+0.72% day, −12.13% off ATH), a one-day relief bounce off
Sep 21's −12.76%. SNN's price leg held below its ≤56.00 band for a second
consecutive session; restart leg remains the sole blocker. ARS's overdue
fresh-news pass completed (a hangar contract, already priced in — see
WATCHLIST.md); no band change. No kill criterion approached on any held
name. If a third consecutive run also lacks broker access, escalate it as
a likely infrastructure issue (LESSONS.md P-4 precedent), not just
re-note it. Detail: journal/2026-09.md 2026-09-23 entry.

**Weekly review 2026-09-12** (third weekly run): TLV's standard T2 band
fired 2026-09-11 (broker-confirmed this run: 224 sh @ avg 35.7005, cost
basis 7,996.92 RON) — TLV is now **at its full-position cap** (≤8,000).
Both positions reviewed against thesis/kill criteria/fair-value band —
**both HOLD, no further changes.** IARV: no thesis-changing news; T2
complete, 392 RON of satellite-cap room unchanged. TLV: thesis intact, no
kill criterion approached; the position is now capped, so no further add is
possible regardless of price. Portfolio ~27.0% invested at market, cash
reserve ~73.0% — still comfortably above the ≥25–30% floor. Detail:
journal/2026-09.md 2026-09-12 weekly entry.

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
- **2026-09-11: standard 33.00–34.50 T2 band fired and FILLED — broker-confirmed 2026-09-12.** Live quote 34.48/34.50 (BET −9.18% off ATH on a broad market-wide selloff, closest approach yet to the −10% tier). Order placed 62 sh @ limit 34.50, day order; `get_holdings` (2026-09-12 weekly run) confirms **224 sh @ avg cost 35.7005, total cost basis 7,996.92 RON** — 1.83 RON under the ≤8,000 full-position cap, effectively completing the TLV position at cap. Assumption A10 graded **held** (see journal/2026-09.md 2026-09-12 weekly entry): the standard band was deliberately never re-banded upward through a confirmed-good H1 and three-plus weeks of trading above it, and the market eventually came to it via a broad selloff rather than the engine chasing price — the discipline of "waiting for price, not re-banding to meet it" was vindicated, not merely un-falsified. TLV is now at its full-position cap; no further add possible without a cap increase (not contemplated) or a trim elsewhere. Journal: journal/2026-09.md 2026-09-11 and 2026-09-12 entries.
- 2026-08-24 review: **HOLD, no add at 37.56.** H1 confirmed the thesis outright — group net profit 2.5bn RON (+26.8% YoY), cost of risk 0.63% (−20bp), NPL 2.41% (−0.24pp), solvency 21.96%, ROE 21.98%, no guidance cut. No kill criterion hit; credit quality moved the *right* way. Not adding because every visible external valuation anchor (targets 29.9–33.88) sits 10–20% below spot, and ⚠ **the issuer buyback previously recorded as live price support closed 2026-05-22** (BVB report TLV_20260522160244) — there is no issuer bid under this price. See LESSONS.md M-2.
- Thesis (one line): dominant retail/SME bank compounding ~25–30%, 9.9x for the market's quality compounder while rates stay high. Full thesis: WATCHLIST.md.
- Fair-value band: 38–44 RON.  Kill criteria: guidance cut below 4bn; bank tax extended AND raised for 2027; NPL inflection in H1/Q3.
- Expected holding: 1–3+ years.

## AROBS — AROBS Transilvania Software
- Opened: 2026-09-14 (order placed pre-open; broker-confirmed filled 2026-09-15) (journal: journal/2026-09.md entries of 2026-09-14 and 2026-09-15)
- Tranches: T1 3,850 sh @ avg 0.7623 (incl. fees), cost basis 2,934.78 RON — filled in full as a day order at better than the 0.77 limit. ~6.4% of portfolio at cost, well under the 20% single-name cap (no AeRO cap — AROBS is Premium Tier main market).
- Entry gated on a same-day ownership pre-check (Cabrio Investment SRL's stake vs a possible undisclosed step-up toward majority-with-affiliates control): passed on indirect evidence (no BVB threshold-crossing notification since Oct 2024's crossing above 10%), not a freshly reconfirmed exact percentage — see assumption A14 (journal/2026-09.md 2026-09-14). **A14 graded held 2026-09-19** on strengthened indirect evidence (a primary-source H1 2026 read plus a fully-documented, Cabrio-unrelated cause for the ownership-bucket's growth) — no fresh exact Cabrio percentage exists, but nothing found disconfirms the ≤~15% bound. See journal/2026-09.md 2026-09-19 weekly entry.
- Thesis (one line): Romania's largest BVB-listed IT/software company, real ~66% adjusted / ~21% organic profit growth (not the flattered +121% headline), small/mid-cap access edge. Full thesis: WATCHLIST.md.
- Fair-value band: entry band ≤0.78 (see WATCHLIST.md for the full valuation derivation). Kill criteria: a Cabrio/Oprean-side threshold crossing confirming a material step-up in control concentration; organic growth reverting sharply toward the FX-inflated headline pace once diligenced; governance action hostile to minorities.
- Expected holding: 1–3 years, reviewed each earnings.
