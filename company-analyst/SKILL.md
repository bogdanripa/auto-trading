---
name: company-analyst
description: Fundamental deep dive on a specific BVB-listed company using concrete sources — BVB issuer page for official filings and dividend history, Yahoo Finance for valuation metrics, stockanalysis.com for financial statements, and WebSearch for analyst coverage, earnings commentary, and catalyst context. Trigger when market-scanner flags a stock as A or B setup (validate fundamentals before entry), when material news breaks on a holding (reassess), when a known catalyst is approaching (prepare thesis), or on routine 2-week holding reviews.
---

# Company Analyst

Produces a single structured scorecard for one symbol per invocation. Runs on demand, not every pipeline pass.

## Inputs

- `symbol` — BVB ticker (e.g. `SNG`)
- `reason` — why we're analyzing it (new setup from scanner | news-driven reassessment | holding review | user request)

## Data Sources (in priority order)

### 1. BVB issuer page (authoritative for filings/events)
```
https://bvb.ro/FinancialInstruments/Details/FinancialInstrumentsDetails.aspx?s=<SYMBOL>
```
Extract via WebFetch:
- Recent current reports (material announcements)
- Upcoming corporate events (AGM, earnings, ex-dividend, payment dates)
- Historical dividend payments (usually 5+ years visible)
- Share capital, ISIN, free float if published

### 2. Yahoo Finance (price & basic metrics)
```
https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>.RO?interval=1d&range=1y
```
For price, 52-week range, market cap (from meta), and trailing dividend yield.

Also useful: `https://finance.yahoo.com/quote/<SYMBOL>.RO/key-statistics` via WebFetch — pulls P/E, P/B, profit margin, ROE, debt ratios when available.

### 3. StockAnalysis.com (financial statements)
```
https://stockanalysis.com/quote/bvb/<SYMBOL>/financials/
https://stockanalysis.com/quote/bvb/<SYMBOL>/financials/balance-sheet/
https://stockanalysis.com/quote/bvb/<SYMBOL>/financials/cash-flow-statement/
https://stockanalysis.com/quote/bvb/<SYMBOL>/market-cap/
```
WebFetch each with a targeted prompt. These give multi-year financials as tables — revenue, net income, EBITDA, free cash flow, net debt, ROE, ROA.

### 4. Targeted WebSearch (analyst views, context, catalysts)
```
WebSearch: "<company full name> Q<N> <year> earnings results"
WebSearch: "<company full name> dividend <year>"
WebSearch: "<SYMBOL> BVB analyst target price"
WebSearch: "<sector> Romania outlook <current month year>"
```

### 5. ASF / regulatory (only if relevant)
WebSearch for `ASF [company] sanctiuni | investigatie` — catches regulatory actions.

## Analysis Checklist

### Liquidity Gate (run first, before any fundamental work)

BVB is small — liquidity norms here are not NASDAQ norms. A US large-cap trades its whole float in hours; BVB mid-caps can go a full session with a few hundred thousand RON changing hands. Before investing analysis effort, re-verify the symbol clears our liquidity bar at the current price level (the universe was screened at index-composition time; a name can become illiquid between reshuffles).

```
node scripts/indicators.mjs --format=json <SYMBOL>
```

From the result, read `adv20_ron` (20-day average daily value traded, RON). BVB-calibrated bands:

| Band | `adv20_ron` | Verdict | Sizing guidance |
|---|---|---|---|
| **Tradeable** | ≥ 500,000 RON | OK for any trade type | Standard sizing; normal stops |
| **Thin** | 100,000 – 500,000 RON | OK with caveats | Cap position at min(15% of portfolio, 10% of ADV). Passive limits only (never cross the spread). Prefer swing/trend over event-driven (exit flexibility matters on catalysts). |
| **Marginal** | 50,000 – 100,000 RON | Requires explicit conviction ≥ 8/10 | Cap position at min(5% of portfolio, 5% of ADV). Flag liquidity risk in thesis. No trend rides — 1-3 month holds are exposed to ADV deterioration we can't forecast. |
| **Reject** | < 50,000 RON | STOP — do not proceed | PROJECT.md rule. Emit the scorecard with `TRADING RECOMMENDATION → Watch (illiquid)` and skip valuation work. |

Also note the **Summer liquidity collapse window** (Jul 15 – Aug 20, rule `CAL-2`): historical ADV drops 30–50% across BVB in this window. If analysis is run inside this window, tighten each band one step (e.g. a stock normally in "Thin" is treated as "Marginal"). The 20-day window will catch this automatically, but the regime-shift is gradual enough that the raw ADV number understates the problem at the edges of the window.

Include the raw `adv20_ron` number and the band verdict in the scorecard's SNAPSHOT section. If rejected, stop here.

### Financial Performance (from stockanalysis.com + Yahoo)
- Revenue: 3-year CAGR, YoY trend
- Net income: margin trend, earnings quality (is growth real or one-off?)
- EBITDA / operating margin: direction
- Free cash flow: positive, consistent, growing?
- Net debt / EBITDA: leverage check
- ROE and ROA: recent trend, vs sector

### Valuation (Yahoo + stockanalysis + peers)
- P/E trailing and forward (if available)
- P/B — especially for banks (TLV, BRD) where book value is the anchor
- EV/EBITDA — for capital-intensive energy/utilities (SNN, H2O, SNP, SNG, TGN, TEL)
- Dividend yield vs 5-year average
- Compare to: CEE peers (Polish WIG, Czech PSE), Western EU sector averages

### Dividend Profile (BVB issuer page + search)
- Last 5 years of dividends: amount, yield at pay date, payout ratio
- Stated dividend policy (percentage of profit or explicit floor)
- Next expected: ex-date, record date, payment date, amount
- Special dividends: SNN, SNG, and SNP have paid specials from windfall profits — flag if likely

### Ownership & Insider Activity (WebSearch + BVB issuer page)
- Major shareholders; state ownership flag (common on BVB)
- Free float percentage — low float = harder to trade cleanly
- Recent significant holding changes (>5% threshold crossings)
- Insider buys/sells in the last 90 days

### Business Quality
- Market position (monopoly / oligopoly / competitive)
- Regulatory environment — especially heavy for energy and banking
- Commodity / FX exposure
- Growth drivers: capacity expansion, new projects, M&A
- Visible risks: price caps, windfall taxes, FX, refinancing

### Upcoming Catalysts (BVB issuer page calendar + bvb-news)
- Next earnings release (with expected direction if analyst estimates available)
- Next AGM and proposed resolutions
- Ex-dividend date
- Sector-specific regulatory events (BNR rate decisions for banks, energy price reviews for utilities)

## Output: Scorecard

```
COMPANY: [Full name] ([SYMBOL])
SECTOR: [Energy / Banking / Utilities / Real Estate / Consumer / Industrial / Tech-Telecom]
AS OF: [timestamp]

SNAPSHOT
  Price: [X] RON   52w: [lo] – [hi]   YTD: [±%]
  Market cap: [X] B RON   Free float: [X]%
  Div yield (TTM): [X]%   P/E: [X]   P/B: [X]   EV/EBITDA: [X]
  Liquidity: ADV20 [X] RON — [Tradeable | Thin | Marginal | Reject]

FUNDAMENTAL SCORE: [1-10]
  Financial health:    [1-10]  — [1 line reasoning]
  Valuation:           [1-10]  — [cheap=10, expensive=1]
  Dividend:            [1-10]  — [yield + reliability]
  Growth prospects:    [1-10]  — [driver or lack of]
  Management quality:  [1-10]  — [execution track record]

CATALYST TIMELINE (next 90 days)
  [DD.MM.YYYY]  [Event]  — expected impact: [+/-/uncertain]

THEMATIC FIT (cross-reference THEMES.md)
  [Theme name]: [how this company maps to it, if any]

THESIS
  [2-3 sentences on why to buy / hold / sell right now]

RISKS
  1. [Top risk]
  2. [...]
  3. [...]

FAIR VALUE ESTIMATE
  [range] RON   (current: [X] RON   upside/downside: [±%])
  Method: [peer multiples | DCF | asset-based]

TRADING RECOMMENDATION
  Action:        Buy | Hold | Sell | Watch
  Trade type:    Swing (3-15d) | Event-driven (2-8w) | Trend ride (1-3m)
  Entry zone:    [price range]
  Size:          [% of portfolio, respecting allocation limits AND the liquidity band's ADV cap]
  Stop-loss:     [price] (-X%)
  Target:        [price] (+X%)
  Time horizon:  [days/weeks/months]
  Catalyst date: [if event-driven]
  Liquidity note: [blank if Tradeable; else the band + the tighter cap actually applied]
```

## Sector-Specific Cheat Sheets

### Energy (SNN, H2O, SNP, SNG, TGN, COTE, EL, TEL)
- Revenue tied to commodity prices AND regulated tariffs (ANRE)
- State ownership → dividend policy can be influenced by budget needs
- Windfall taxes and price caps are recurring regulatory risks — flag on every review
- Green transition: Hidroelectrica and Nuclearelectrica benefit, thermal generators face stranded-asset risk
- Reference: `bnr.ro` for macro context, `anre.ro` for regulatory decisions (via WebSearch)

### Banking (TLV, BRD)
- NIM is the driver → directly linked to BNR policy rate
- Asset quality (NPL ratio, cost of risk) matters in downturns
- CET1 capital ratio floor — BVB banks tend to run well above minimum
- Dividend payouts capped by BNR recommendations — don't extrapolate past specials

### Real Estate / Developers (ONE, IMP)
- Cyclical; sensitive to interest rates and consumer confidence
- Pre-sales pipeline and delivery schedule are leading indicators
- Land bank valuation can hide problems — cross-check with cash flow

### Consumer / Services (SFG, AQ, M, WINE, DIGI)
- Growth tied to Romanian consumer spending (proxy: retail sales data)
- Geographic and M&A expansion drive re-ratings
- Margins under pressure from labor costs and food/energy input

### SIF / Investment funds (FP, SIF1, SIF3, SIF5, EVER, TRANSI)
- Trade at persistent discount to NAV; the NAV itself is what matters
- Dividend policy driven by realized gains, can be lumpy
- Structural catalysts: buybacks, dividend increases, or NAV crystallization events

## Integrity Rules

- Every numeric claim must come from one of the cited sources. Do not estimate P/E by eyeballing price.
- If a data source is unavailable (e.g., stockanalysis.com down), note it — don't fabricate.
- Always note the `AS OF` timestamp; financials are stale between reporting periods.
- Fair value is an estimate, not a prediction. Show the method.
