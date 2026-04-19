# BVB Autonomous Trading Engine

## Overview
This project is a fully autonomous swing trading engine for the Bucharest Stock Exchange (BVB), operating through an Interactive Brokers (IBKR) account. It runs as scheduled Claude tasks — a morning pre-market session and an evening post-close session — that analyze markets, make trading decisions, execute orders, and report via Telegram.

## Strategy Framework

### Universe
BET-Plus index constituents (~40 stocks). Focus on liquid names that can be entered and exited cleanly. Ignore anything with average daily volume below 50,000 RON.

### Trade Types
Three distinct timeframes, managed concurrently:

**Swing trades (3–15 days):** Technical momentum setups confirmed by volume. Entry via RSI oversold within uptrend or breakout above resistance with volume surge. Tight stops at 10%.

**Event-driven trades (2–8 weeks):** Positioned ahead of known catalysts — earnings, dividend ex-dates, corporate actions, regulatory decisions. Entry based on fundamental analysis of the catalyst's likely impact. Looser stops because we're holding through expected volatility.

**Trend rides (1–3 months):** Stocks in strong uptrends with fundamental support (sector tailwinds, improving financials, favorable macro). Entered on pullbacks within the trend. Managed with trailing stops at 7% from peak.

### Position Management
- 3–5 concurrent positions (2–3 early when portfolio is small)
- Max 30% of portfolio in a single stock
- Max 60% in a single sector
- Min 10% cash reserve at all times
- Never deploy more than 50% of available cash in a single day

### Risk Rules
- Hard stop-loss at 10% per position (can be overridden by analysis — see below)
- Trailing stop at 7% from peak for trend rides
- Take profit at +15–20% for swing trades unless momentum is accelerating
- Event-driven exits are discretionary based on post-event analysis

### Override Authority
The analysis layer CAN override mechanical stop-loss rules when it has strong conviction. Every override MUST be:
1. Explicitly flagged in the Telegram briefing
2. Accompanied by full reasoning
3. Include a revised exit plan (new stop level or time-based exit)

Example: "OVERRIDE: SNG hit -10% stop but holding. Reason: market-wide selloff on NBR rate surprise, not company-specific. SNG fundamentals unchanged, dividend yield now 9%. New stop: -15% or 5 sessions, whichever comes first."

### Cash Management
- Cash is a valid position. No forced trades when nothing looks good.
- Budget is variable — the owner wires money irregularly. Some days 100 RON, some days much more, some days nothing.
- The engine works with whatever cash is available in the IBKR account each morning.
- Cash accumulates until a good setup appears, then deploys a properly sized position.

### Capital Allocation Logic
When multiple setups compete for limited capital:
1. Rank by conviction score (0–10, combining fundamental + technical + news signals)
2. Prioritize event-driven trades with near-term catalysts over pure technical setups
3. Prefer adding to winning positions over opening new ones (pyramiding)
4. Never chase — if a stock has moved >3% since the signal, skip it

## Daily Workflow

### Morning Run (7:30 AM EET)
Execute skills in this order:
1. Read `LESSONS.md` — load active lessons into working context before analysis
2. `macro-analyst` — Global overnight context
3. `bvb-news` — BVB announcements, Romanian news
4. `market-scanner` — Technical scan of BET-Plus universe
5. `company-analyst` — Deep dive on any flagged stocks
6. `portfolio-manager` — Current state, cash available, position review
7. `risk-monitor` — Check stops, exposure, override conditions
8. **Synthesis** — Weigh all inputs against active lessons, decide today's actions
9. `trade-executor` — Place orders via IBKR
10. `trade-journal` — Append entry record for every new fill (thesis + context)
11. `telegram-reporter` — Send morning briefing

### Evening Run (5:30 PM EET)
Execute skills in this order:
1. `portfolio-manager` — What filled, P&L update, detect closed positions
2. `bvb-news` — Late-breaking news
3. `risk-monitor` — End-of-day risk check
4. `trade-journal` — Append exit record for every closed position (outcome + verdict + lessons)
5. `tax-tracker` — Log any completed trades
6. `retrospective` — On Fridays only: mine the journal, update `LESSONS.md`
7. `telegram-reporter` — Send evening briefing (include retrospective summary on Fridays)

## Learning Loop

The engine learns from its own history through three pieces:

1. **`journal/trades.jsonl`** — every trade is recorded at entry (thesis, context, exit plan) and at exit (outcome, verdict, lessons). Append-only, committed to git. Written by the `trade-journal` skill.

2. **`LESSONS.md`** — distilled patterns from the journal, grouped as `[active]` (drives daily decisions), `[candidate]` (observed but not yet conclusive), and `[retired]` (contradicted by later data). Updated weekly by the `retrospective` skill.

3. **Morning synthesis** — the first step of every morning run is to read `LESSONS.md` and carry active lessons into the analysis. A lesson like "widen stop for financials swing trades to 12%" overrides the default rule in this document *for that specific case*.

### Rule changes to PROJECT.md
`PROJECT.md` is the stable strategy foundation. The engine never edits it autonomously. When a lesson becomes `[active]` and conflicts with a rule here, the `retrospective` skill appends a proposed edit to the bottom of `LESSONS.md` and flags it in the weekly Telegram briefing. The user reviews and applies changes manually.

## Telegram Briefing Format

### Morning Briefing
```
🌅 BVB ENGINE — Morning Analysis [DATE]

📊 MACRO CONTEXT
[2-3 sentences on global/local macro]

📰 NEWS HIGHLIGHTS
[Key BVB/company news affecting our universe]

📈 PORTFOLIO STATUS
Cash: X RON | Invested: Y RON | Total: Z RON
Positions: [list with current P&L %]

🎯 TODAY'S ACTIONS
[Orders being placed with reasoning]

⚠️ OVERRIDES (if any)
[Full explanation of any rule overrides]

🧠 CONVICTION SCORES
[Top 3 opportunities with scores]
```

### Evening Briefing
```
🌙 BVB ENGINE — Evening Update [DATE]

✅ EXECUTED TODAY
[What filled, at what price]

📊 PORTFOLIO EOD
[Updated positions and P&L]

📰 LATE NEWS
[Anything relevant that came in during the day]

🔮 TOMORROW'S WATCH
[Stocks/events to monitor]
```

## IBKR Configuration
- Account type: Paper trading (switch to live when strategy proves itself)
- Market: BVB (Budapest gateway for CEE stocks)
- Order types: Limit orders only (no market orders on BVB — spreads too wide)
- Currency: RON

## Tax Tracking (Declarația Unică)
Every trade is logged with: date, symbol, direction, quantity, price, commission, RON value. At year-end, the tax-tracker skill generates the data needed for the DU filing.
