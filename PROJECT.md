# BVB Autonomous Trading Engine

## Overview
This project is a fully autonomous swing trading engine for the Bucharest Stock Exchange (BVB), operating through a BT Trade account (Banca Transilvania's retail platform, native BVB access, RON-denominated). IBKR was the originally-planned broker and is still referenced in some historical notes; the live/demo integration is BT Trade. It runs as scheduled Claude tasks — a morning pre-market session and an evening post-close session — that analyze markets, make trading decisions, execute orders, and report via Telegram.

## Strategy Framework

### Universe
BET-Plus index constituents (~40-45 stocks). Current engine coverage is 36 tickers across two liquidity tiers — see `market-scanner/SKILL.md` for the canonical list. Focus on liquid names that can be entered and exited cleanly. Ignore anything with 20-day average daily value traded below 50,000 RON. Expansion into AeRO small caps is off-limits until the portfolio is >10,000 RON — below that, our sizing caps clash with their liquidity.

### Trade Types
Three distinct timeframes, managed concurrently:

**Swing trades (3–15 days):** Technical momentum setups confirmed by volume. Entry via RSI oversold within uptrend or breakout above resistance with volume surge. Tight stops at 10%.

**Event-driven trades (2–8 weeks):** Positioned ahead of known catalysts — earnings, dividend ex-dates, corporate actions, regulatory decisions. Entry based on fundamental analysis of the catalyst's likely impact. Looser stops because we're holding through expected volatility.

**Trend rides (1–3 months):** Stocks in strong uptrends with fundamental support (sector tailwinds, improving financials, favorable macro). Entered on pullbacks within the trend. Managed with trailing stops at 7% from peak.

### Position Management
- 3–5 concurrent positions (2–3 early when portfolio is small)
- Max 30% of portfolio in a single stock
- Max 60% in a single sector
- **Regime-aware cash reserve** (not a single fixed floor):
  - **Default (neutral regime):** 10% minimum, 30% typical
  - **Risk-off regime (`REGIME-1` fires in `rules/bvb_rules.json`):** 60% minimum cash floor
  - **Risk-on regime (`REGIME-2` fires):** cash ceiling at 20%, permitted to deploy aggressively
  - **Rating-downgrade tripwire (`RATAG-2` fires):** longs capped at 20% of portfolio regardless of other signals; the rest stays in cash until the downgrade is reversed or the tripwire clears
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
1. Read `LESSONS.md`, `THEMES.md`, and `macro-analyst/references/bvb-historical-patterns.md` — load active lessons, active themes, and the historical playbook before analysis
2. `macro-analyst` — Populates `rules/market_snapshot.json` from live feeds, runs `scripts/evaluate_rules.mjs` against `rules/bvb_rules.json`, emits the firing rules + REGIME score + narrative context
3. `bvb-news` — BVB announcements, Romanian news
4. `market-scanner` — Technical scan of BET-Plus universe
5. `company-analyst` — Deep dive on any flagged stocks
6. `portfolio-manager` — Current state, cash available, position review
7. `risk-monitor` — Check stops, exposure, override conditions
8. **Synthesis** — Weigh all inputs against active lessons + active themes, decide today's actions
9. `trade-executor` — Place orders (simulation mode appends to `orders/open` in the Firestore store)
10. `trade-journal` — Append entry record for every new fill (thesis + context, tag with theme if applicable)
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

1. **`trades_journal/*` in the Firestore store** — every trade is recorded at entry (thesis, context, exit plan) and at exit (outcome, verdict, lessons). Append-only. Written by the `trade-journal` skill via `store.appendJournal()`; dev fallback writes `journal/trades.jsonl`.

2. **`LESSONS.md`** — distilled patterns from the journal, grouped as `[active]` (drives daily decisions), `[candidate]` (observed but not yet conclusive), and `[retired]` (contradicted by later data). Updated weekly by the `retrospective` skill.

3. **Morning synthesis** — the first step of every morning run is to read `LESSONS.md` and carry active lessons into the analysis. A lesson like "widen stop for financials swing trades to 12%" overrides the default rule in this document *for that specific case*.

### Rule changes to PROJECT.md
`PROJECT.md` is the stable strategy foundation. The engine never edits it autonomously. When a lesson becomes `[active]` and conflicts with a rule here, the `retrospective` skill appends a proposed edit to the bottom of `LESSONS.md` and flags it in the weekly Telegram briefing. The user reviews and applies changes manually.

## Rulebook and Regime Score

The engine consults two complementary artifacts every run:

- **`rules/bvb_rules.json`** — 30 encodable trading rules derived from a decade of BET drivers (FX, international, commodity, rates, political, calendar, rating, index, geopolitical, regime). Each rule has a machine-checkable trigger, direction, horizon, expected magnitude band, and exit condition. Source of truth for *what to do when a specific condition holds*.
- **`rules/market_snapshot.json`** — populated each morning by `macro-analyst` from live feeds. Source of truth for *what the world looks like right now*.

`scripts/evaluate_rules.mjs` joins these and emits (a) firing rules, (b) `REGIME-1` / `REGIME-2` weighted scores, (c) a recommended posture. Synthesis consumes this as structured input, not prose.

The **reference anchor** for the rulebook is `macro-analyst/references/bvb-historical-patterns.md` — a 2015-2026 BET event catalog, sector playbook, and regime-break notes. When thresholds are debated or new rules proposed, they must be justified against this document or explicitly flagged as extrapolating beyond it.

### Regime caveat (April 2026)
After the 70% YoY rally to ATH (~28,900), the reference doc flags: **"bias toward mean-reversion over trend-following at current levels."** Synthesis should surface this in the daily briefing, weight relief-rally triggers (`POL-3`, `RATAG-3`) more heavily, and treat fresh breakout setups with extra skepticism.

### Downgrade-to-junk discipline
The 2024-2026 rating configuration (all three agencies BBB-/Baa3 Negative, 8.6% of GDP deficit 2024, EDP escalated, PNRR partially suspended) is flagged in the reference doc as **the highest-risk configuration in the entire decade-long dataset** for a discontinuous downgrade to junk. This is not a maybe — it is a live tripwire. `RATAG-2` firing halts new longs and caps existing longs at 20% of portfolio. This takes precedence over any other signal, including an active theme.

## Thematic Bias

Alongside the tactical rulebook, the engine tracks **structural themes** in `THEMES.md` — macro narratives mapped to specific BVB tickers. Themes are the narrative context; rules are the operational triggers.

### How themes affect decisions
- **At entry:** a setup in a ticker that maps to an `[active]` theme gets a conviction bump (+1 on the 0-10 scale). A setup that runs against an active theme requires an extra confirmation before entry.
- **At tracking:** every morning `macro-analyst` refreshes the theme layer — which themes got reinforcing or contradicting signals today.
- **At review:** the retrospective step computes win rate per theme. Themes with persistent 0% hit rate across 5+ tagged trades become retirement candidates.

### Theme governance
Same gate as LESSONS: the engine **proposes** new themes or status changes at the bottom of `THEMES.md` when signals cross the threshold. The user reviews weekly and accepts or rejects. The engine never edits the `[active]` / `[candidate]` / `[retired]` sections autonomously.

### BVB-or-bust rule
Every theme must map to at least one BVB ticker. Context-only observations (e.g., "US housing cycle turning") belong in the macro briefing, not in THEMES.md — because we can't act on them.

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

## Human-in-the-Loop Reconciliation (live mode only)

The user may place manual trades via IBKR at any point. The engine must tolerate this without conflict.

### On every live run, reconcile with IBKR first
Before any analysis or ordering, fetch IBKR account state (cash, positions, open orders, today's fills) and diff against `portfolio_state/current`:
- **Unknown position on IBKR** → user bought manually. Import into `portfolio_state/current` with `engine_managed: false`. Append a `backfilled` entry to `trades_journal/*` with minimal metadata so the position is not invisible to analytics.
- **Position missing from IBKR** → user sold manually. Close in `portfolio_state/current`. Append an exit record with `exit_reason: manual` and `thesis_verdict: inconclusive`.
- **Quantity delta on an existing position** → partial manual trade. Adjust and log the delta. Do not change user-editable fields (`theme_tag`, `stop_loss`, `catalyst`).
- **Cash delta only** → deposit or withdrawal. Update cash. No journal entry.

### Hard rule: the engine never touches what you placed
The engine **never** cancels, modifies, or resizes an order the user placed manually. It **never** overrides a position the user opened manually.

Every order the engine places is tagged `engine_managed: true`. The engine may only close/cancel orders carrying that tag. If an IBKR order has no tag (or a tag it doesn't recognize), it treats it as manual — read-only.

If the engine would like to act on a manually-opened position (e.g. apply its stop-loss logic), that is opt-in per position via `engine_managed: true`, set by the user manually on the position inside `portfolio_state/current`.

### Surface all reconciliation findings in the morning briefing
Every manual-activity detection goes into the Telegram briefing under a "RECONCILED" section: what was imported, what was closed, what the P&L was. This gives the user a chance to retroactively tag a thesis / theme if useful.

### Simulation mode
Does not reconcile anything. Simulation state is the only source of truth. This section activates only when `EXECUTION_MODE=ibkr`.

## Execution Mode

Controlled by the `EXECUTION_MODE` env var on the routine.

**`simulation` (current):** `trade-executor` maintains a simulated portfolio in `portfolio_state/current` (Firestore store), using real BVB prices from Yahoo Finance. No broker account required. Fills are computed against the day's OHLC range. Commission modeled at 0.1% (min 1 RON) to match IBKR's BVB tier.

**`demo` / `live`:** `trade-executor` calls BT Trade via the vendored `@bogdanripa/bt-trade` client. `demo` is BT Trade's paper environment; `live` moves real RON. Both share the same order schema and rules as `simulation`. See `trade-executor/SKILL.md` for the full backend matrix. (Legacy references to "ibkr" mode elsewhere in this repo are historical — IBKR was the originally-planned broker but was never integrated.)

### Order rules (both modes)
- Market: BVB
- Order types: Limit orders only (no market orders on BVB — spreads too wide)
- Currency: RON

## Tax Tracking (Declarația Unică)
Every trade is logged with: date, symbol, direction, quantity, price, commission, RON value. At year-end, the tax-tracker skill generates the data needed for the DU filing.
