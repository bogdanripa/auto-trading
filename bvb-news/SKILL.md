---
name: bvb-news
description: Monitor BVB company announcements, Romanian financial press, and corporate actions for anything that could move BET-Plus names. Runs on both morning and evening routines. Uses a mix of structured sources (per-symbol BVB announcement pages) and real-time web search for third-party coverage. Trigger whenever the pipeline needs current BVB news, when evaluating a specific stock, or when the user asks what's happening on the Romanian market.
---

# BVB News

Two layers of sourcing:

1. **Structured (authoritative):** BVB per-symbol announcement pages — gives dates, headlines, upcoming corporate events straight from the issuer.
2. **Real-time search (breadth):** `WebSearch` for each holding and the broader market — catches third-party coverage, analyst notes, sector context the issuer page won't have.

Both layers run every run. The structured layer is the anchor; search fills in the rest.

## Layer 1 — BVB Per-Symbol Pages (WebFetch)

For every symbol in the current portfolio holdings (`store.getState().holdings`) PLUS the BET-Plus watchlist (defined in `trade-executor/SKILL.md`), fetch:

```
https://bvb.ro/FinancialInstruments/Details/FinancialInstrumentsDetails.aspx?s=<SYMBOL>
```

Extract:
- **Recent announcements** (last 30 days) — dates, headlines
- **Upcoming corporate events** — AGM, earnings publication, ex-dividend, coupon payments
- **Trading halts** or **suspensions** if flagged on the page

Example (extracted by WebFetch with prompt: *"List company announcements and upcoming corporate events with dates"*):
```
17.04.2026 — Current report, contract disclosure (Art 234 lit i Reg 5)
16.04.2026 — AGOA held, no decisions adopted
29.04.2026 — AGA Ordinara Anuala scheduled
15.05.2026 — Q1 2026 financial results publication
```

### What to extract / what to skip
- **Keep:** earnings dates, dividend announcements, AGM decisions with material content, share buybacks, rights issues, M&A, management changes, large contracts
- **Skip:** routine "contract disclosure Art 234 lit i" filings unless the WebFetch summary says the contract is material

## Layer 2 — Real-Time Web Search

Run these searches each morning (evening can be lighter — skip per-symbol unless a position moved >3% that day):

### Per-holding search (highest priority)
For each symbol in the current portfolio's positions (`store.getState().positions`):
```
WebSearch: "<company full name> news <current month year>"
WebSearch: "<SYMBOL> BVB news this week"
```
Example: `"Romgaz news April 2026"`, `"SNG BVB news this week"`

### Market-wide search
```
WebSearch: "BVB Bucharest Stock Exchange news today"
WebSearch: "bursa valori bucuresti stiri azi"
WebSearch: "BET index today"
```

### Sector search (on rotating days to stay fresh)
One sector per day, cycling through: Energy, Banking, Utilities, Real Estate, Telecoms/IT, Pharma.
```
WebSearch: "Romania <sector> regulation <current month year>"
```

### Dividend / corporate action calendar
```
WebSearch: "BVB dividende ex-date <current month year>"
WebSearch: "BET-Plus dividend calendar <year>"
```

## Trusted Sources

Prioritize results from these domains when WebSearch returns ambiguous or low-quality hits:
- `bvb.ro` — official
- `zf.ro` — Ziarul Financiar, main Romanian business daily
- `bursa.ro`, `profit.ro`, `economica.net` — business press
- `cursdeguvernare.ro`, `hotnews.ro` (economy section) — general business press
- `reuters.com`, `bloomberg.com`, `tradingview.com` — international coverage for larger names
- `bvbromania.substack.com` — weekly retrospective (Mondays, high signal)
- `asfromania.ro` — regulator (sanctions, investigations)

Flag but treat cautiously: `simplywall.st`, `stockanalysis.com` — algorithmic content, useful for context but not for breaking news.

## Analysis Framework

For each news item that clears the noise filter, produce:

```json
{
  "symbol": "SNG",
  "date": "2026-04-19",
  "headline": "Romgaz proposes 606M RON dividend, reduced from prior year",
  "materiality": "high|medium|low",
  "direction": "positive|negative|neutral",
  "timeframe": "immediate|this_week|this_month",
  "source": "bvb.ro per-symbol page | cursdeguvernare.ro | ...",
  "url": "https://...",
  "actionability": "buy|sell|hold|watch",
  "rationale": "one sentence"
}
```

### Materiality scoring
- **High:** earnings, dividend announcements, ex-dividend/record dates, M&A, management changes at CEO/CFO level, large contract wins, guidance changes, trading halts
- **Medium:** routine shareholder meetings with substantive decisions, insider transactions, analyst rating changes with new data, sector-wide regulatory moves
- **Low:** generic market commentary, price target tweaks with no new info, minor contracts

Drop "low" items from the briefing unless they're the only news on a holding.

## Output Format

```
📰 BVB NEWS — [DATE]

🚨 BREAKING (if any)
[High-materiality items needing immediate attention — trading halts, surprise results]

HOLDINGS
  [SYMBOL]: [headline] — [materiality] [direction] → [action/watch]
  ...

WATCHLIST
  [SYMBOL]: [headline] — [materiality] [direction] → [action/watch]
  ...

UPCOMING EVENTS (next 14 days)
  [DD.MM] [SYMBOL] [event]
  ...

MARKET CONTEXT
[1-2 sentences on broad BVB news flow, index moves, foreign flows]

SENTIMENT SCORE: [-5 to +5]
```

## Failure Handling

- **WebFetch fails on a BVB page:** retry once. Still fails → log "NO_STRUCTURED_DATA for <SYMBOL>" and rely solely on WebSearch for that symbol.
- **WebSearch returns no results for a query:** try one reformulation; if still empty, record "no news found for <SYMBOL>" — don't hallucinate headlines.
- **Every source dark (rare):** produce a skeleton briefing with "news layer failed this run" banner. The synthesis step should treat it as a "hold decisions" signal, not invent missing data.

## Caching

Within a single run, cache all fetched pages and search results. Don't hit the same URL twice (e.g., the same holding appears in multiple search queries). Cache is in-memory for the run; nothing persists between runs.

## Graphiti Sync

Every news item that clears the **materiality filter (`high` or `medium` only)** gets ingested into graphiti as a `News` episode. Low-materiality and dropped items are not ingested — they're noise, the graph doesn't need them.

### Ingest format

For each kept item, call:

```
mcp__graphiti__add_memory(
  name: "News <symbol> <date> — <truncated headline>",
  episode_body: JSON.stringify({
    symbol: "SNG",
    date: "2026-04-19",
    headline: "Romgaz proposes 606M RON dividend, reduced from prior year",
    summary: "<1-3 sentence pre-extracted summary, NOT full article body>",
    materiality: "high",
    direction: "negative",
    timeframe: "immediate",
    source: "bvb.ro",
    url: "https://...",
    rationale: "Dividend down 38% YoY — windfall tax absorption continues"
  }),
  source: "json",
  source_description: "bvb-news item",
  group_id: "auto_trader",
  reference_time: <ISO timestamp of publication, NOT scan time>
)
```

**Critical: `reference_time` is the news publication time, not now.** Graphiti's temporal model needs the event time so retrospectives can correlate "news from 2026-04-19" with "trade opened 2026-04-20."

### What gets extracted

Graphiti's LLM will produce `News`, `Company`, `Catalyst` (for dated events like AGM/earnings), and `MacroEvent` (for regulatory/rate decisions) nodes. The `direction` and `materiality` become attributes on the `News` node so downstream queries can filter.

### Pre-extraction over raw article bodies

Do NOT pass full article text into `episode_body`. Passing the full body:
- Wastes extraction LLM tokens on boilerplate (cookie banners, navigation, footers)
- Produces noisy entities (random people quoted in the article)
- Inflates ingestion latency

Instead, summarize each item to 1-3 sentences during the bvb-news analysis pass (you're already producing the structured JSON above), and pass that. The full URL is preserved for any future retrieval.

### Market context summary as its own episode

At the end of the run, ingest a single rolled-up `MarketContext` episode covering the day's broad news flow:

```
mcp__graphiti__add_memory(
  name: "Market context <date> <morning|evening>",
  episode_body: JSON.stringify({
    date: "2026-04-19",
    session: "morning",
    sentiment_score: 2,
    summary: "Energy names up on TTF strength; BNR holds at 6.50%; foreign flows neutral",
    notable_themes: ["Neptun Deep", "windfall tax watch"],
    regime_signals: ["risk_on"]
  }),
  source: "json",
  source_description: "Daily BVB market context",
  group_id: "auto_trader",
  reference_time: <session start ISO timestamp>
)
```

This lets the next session ask "what was the market mood when we opened ONE?"

### Failure handling

If the graphiti call fails, log to stderr + the Telegram report and continue. Do not abort the news pipeline — the briefing still has to go out.

News items are **not mirrored to bt-gateway** — they exist only in graphiti. An outage during a single news run loses that batch. This is acceptable because:
- The underlying sources (bvb.ro per-symbol pages, WebSearch hits) are still authoritative
- Re-running this skill re-fetches and re-ingests
- News from a few hours ago becoming visible to graphiti a day late is a minor loss of context, not a correctness problem

If a multi-day graphiti outage occurs, manually re-run this skill with a wider lookback to catch up.

### Caching applies to ingestion too

If the same news item appears in both the BVB structured page and a WebSearch hit, ingest it ONCE. Dedupe by `url` within the run.
