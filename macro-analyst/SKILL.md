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

THEME UPDATES (from THEMES.md active list)
  [Theme name]: [reinforced | contradicted | unchanged] — [1 line why]
  ...
  Proposed changes: [count] (see THEMES.md bottom for details) — or "none"

SUMMARY (for synthesis)
[2-3 sentences — the most compact version of the above, flagging any theme-tagged names worth a closer scanner look today]
```

## Theme Layer (structural bias tracking)

News tells you what happened yesterday. Themes tell you what structural shift is underway and how to position. This layer runs *after* the daily news/macro gather and is the bridge from global-macro to BVB-ticker.

### Every morning: read THEMES.md
Load the file, extract `[active]` themes and their BVB ticker mappings. This goes into the synthesis step as a conviction bias (see THEMES.md "How themes affect decisions" section).

### Every morning: scan for theme-relevant news
For each `[active]` theme, run a targeted search using its "Signals to track" list. Example — for the AI/datacenter theme:
```
WebSearch: "datacenter Romania announcement <current month year>"
WebSearch: "EU electricity market reform"
WebSearch: "ANRE tariff decision <current month year>"
```
Note any hits in the macro output under a "THEME UPDATES" section — which themes got reinforcing or contradicting signals today.

### Weekly (Friday morning): theme discovery
In addition to the normal gather, run broader structural scans:
```
WebSearch: "emerging investment theme <current month year>"
WebSearch: "structural shift markets <current month year>"
WebSearch: "CEE Romania investment thesis <current year>"
```
Plus reflect: are there narratives *not* in THEMES.md that showed up repeatedly in this week's news? Common triggers:
- A new geopolitical event creating a commodity / sector dislocation
- A technology inflection (like AI in late 2022) creating new demand categories
- A regulatory shift (EU taxonomy, carbon border adjustment, etc.) reallocating capital
- A macro regime change (rate pivot, currency crisis, inflation breakout)

### Propose new themes (never promote autonomously)

When a structural pattern appears 3+ times across different sources in a week AND has a plausible BVB mapping, append a proposal to the "Proposed New Themes / Status Changes" section at the bottom of THEMES.md:

```markdown
### Proposed: [candidate] <Theme name>
**Narrative:** <2-3 sentences on the structural shift>
**Evidence:** <sources and dates>
**BVB mapping (or "no direct BVB play"):**
- TICKER — why it benefits/suffers
**Signals to track:** <queries or datapoints>
**Recommended action:** add as [candidate] | upgrade existing theme | retire existing theme
```

The user reviews these weekly and decides whether to accept the change. The engine never edits the `[active]` or `[candidate]` sections of THEMES.md directly.

### Propose theme retirement
A theme becomes a retirement candidate when:
- The signals it tracks are no longer generating hits (narrative has gone quiet)
- The mapped BVB tickers have outperformed by >30% since the theme was marked active (priced in)
- A counter-narrative has emerged with stronger evidence

If so, propose retirement in the same "Proposed" section. Don't retire autonomously.

### BVB-or-bust filter
Before proposing any theme, ask: *can we express this view on BVB*? Examples:
- "AI chip demand" → if the only beneficiaries are US/Taiwan names, it's context-only, not a theme for us
- "AI datacenter POWER demand" → yes, BVB has utilities exposure — actionable theme
- "Iran oil shock" → yes, SNG/SNP benefit — actionable theme
- "US housing cycle" → no direct BVB play — context only

If a theme has no BVB mapping, note it in the macro summary for awareness but don't add it to THEMES.md.

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
