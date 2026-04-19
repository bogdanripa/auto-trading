---
name: macro-analyst
description: Establish the macro context for today's BVB trading decisions — global indices, FX (especially EUR/RON and USD/RON), commodities (oil/gas for our energy-heavy index), and central bank actions (Fed, ECB, BNR). First step of every morning routine. Uses structured feeds (BNR XML, Yahoo Finance) anchored by real-time web search for central bank decisions and market-moving events. Trigger at the start of every morning run, or when the user asks about macro conditions affecting Romanian equities.
---

# Macro Analyst

Two layers, same philosophy as `bvb-news`:

1. **Structured feeds** — deterministic, numerical, no hallucination risk.
2. **Real-time search** — fills in the narrative (central bank decisions, overnight events, trending themes).

Run both every morning. Evening run is lighter: FX + commodities close + any late-breaking central bank news.

## Layer 1 — Structured Feeds (curl / WebFetch)

### BNR FX rates (official Romanian reference rates)
```
https://www.bnr.ro/nbrfxrates.xml
```
Returns an XML `<DataSet>` with daily reference rates keyed by currency. Parse to extract:
- **EUR/RON** (critical — foreign investor flows)
- **USD/RON** (affects USD-denominated commodity exposure)
- **GBP/RON**, **CHF/RON** (secondary)

Compute day-over-day change by fetching twice with two dates if historical is needed, or compare to the previous run's cached value. BNR publishes once per business day around 13:00 EET.

### Yahoo Finance for indices & commodities
Use this URL pattern (returns JSON):
```
https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?interval=1d&range=5d
```
Headers: `User-Agent: Mozilla/5.0` (required).

Key symbols:

| Instrument | Yahoo symbol | Why |
|-----------|--------------|-----|
| S&P 500 | `^GSPC` | US risk tone |
| Nasdaq | `^IXIC` | US tech / risk appetite |
| STOXX 600 | `^STOXX` | Broad Europe |
| Euro Stoxx 50 | `^STOXX50E` | Large-cap Europe |
| DAX | `^GDAXI` | German economy proxy |
| BET | `^BETI` | Bucharest main index (may be stale outside RO market hours) |
| VIX | `^VIX` | Risk sentiment |
| Brent oil | `BZ=F` | SNP, SNG |
| WTI oil | `CL=F` | Secondary |
| Natural gas (TTF front) | `TTF=F` | SNG, TGN (may not always resolve — fall back to search) |
| Gold | `GC=F` | Risk proxy |
| EUR/USD | `EURUSD=X` | Cross-check BNR's EUR/RON against USD strength |
| EUR/RON | `EURRON=X` | Cross-check against BNR |

Extract `regularMarketPrice`, `chartPreviousClose`, and compute `(price - prev) / prev * 100` for daily change %.

### Fail-open rule
If Yahoo returns `regularMarketPrice: None` (common on weekends/holidays for BVB symbols) — that's not an error, just record the last close and move on.

## Layer 2 — Real-Time Web Search

### Central bank decisions & statements
Run these every morning:
```
WebSearch: "BNR interest rate decision <current month year>"
WebSearch: "Fed FOMC statement latest"
WebSearch: "ECB monetary policy decision <current month year>"
```
If a meeting happened in the last 7 days, pull the statement details. If a meeting is coming this week, flag it in the output.

### Overnight / session drivers
```
WebSearch: "US stocks overnight <date>"
WebSearch: "European markets open <date>"
WebSearch: "Asia markets close <date>"
```
Use the current date. Extract the top 1-3 themes (earnings, geopolitics, data releases) driving price action.

### Romanian macro data
```
WebSearch: "Romania inflation CPI latest"
WebSearch: "Romania GDP industrial production latest"
WebSearch: "BNR macroeconomic projections"
```
These release on published calendars. Don't re-pull daily — refresh when WebSearch indicates a new release has happened.

### Energy-specific (BVB is energy-heavy)
```
WebSearch: "TTF natural gas price <current month year>"
WebSearch: "OPEC oil production decision latest"
WebSearch: "EU energy policy Romania <current month year>"
```

### Geopolitics (tight filter — only when consequential)
```
WebSearch: "Romania geopolitical risk <current month year>"
WebSearch: "Ukraine war impact Romania economy"
```
Include only if the search surfaces material developments. Generic background noise goes in the bin.

## Output Format

```
📊 MACRO — [DATE]

SENTIMENT: 🟢 / 🟡 / 🔴  (with -5 to +5 score)

GLOBAL MARKETS
  S&P 500: [price] ([±%])   Nasdaq: [price] ([±%])   VIX: [level]
  STOXX 600: [price] ([±%])   DAX: [price] ([±%])
  
FX (BNR reference)
  EUR/RON: [rate] ([± vs prior])
  USD/RON: [rate] ([± vs prior])
  EUR/USD: [cross for context]

COMMODITIES
  Brent: $[X] ([±%])     TTF gas: €[X]/MWh ([±%])
  Gold: $[X] ([±%])

CENTRAL BANKS
  [Recent decisions or upcoming meetings in the next 7 days]

KEY DRIVERS (top 3 themes today)
  1. [theme + source link]
  2. ...
  3. ...

SECTOR IMPACT FOR BVB
  Energy (SNG, SNP, TGN, EL): [tailwind | headwind | neutral] — [1 sentence why]
  Banking (TLV, BRD): [...]
  Utilities (TEL, H2O): [...]
  Other (M, FP, ...): [...]

RISK FLAGS
  [Any macro risks that could produce sudden moves — surprise CB decision, geopolitical, etc.]

SUMMARY (for synthesis)
[2-3 sentences — the most compact version of the above]
```

## Interpretation Rules

- **BVB is lag-sensitive, not correlation-sensitive.** Don't assume a big Nasdaq move translates 1:1. Weight EU/CEE > US.
- **Energy weight ≈ 40-50% of BET-Plus.** Commodity prices get disproportionate attention in the summary.
- **EUR/RON stability is the baseline.** Only flag it when moves exceed ±0.3% in a day or ±1% in a week — below that, it's noise.
- **BNR meets ~8 times a year.** On meeting days, the decision dominates the briefing regardless of global action.
- **Small moves in global indices don't move BVB.** Flag only ±1% daily moves or larger, or trend breaks.

## Failure Handling

- BNR XML unavailable → fall back to `EURRON=X` on Yahoo; flag "unofficial rate"
- Yahoo down → skip index/commodity section; rely entirely on WebSearch for market color
- Entire macro layer fails → produce skeleton output with "macro layer failed" banner; synthesis treats as risk-off prior

## Caching

Same policy as `bvb-news`: in-memory cache for the run, no persistence between runs. The routine should never hit the same URL twice within one run.
