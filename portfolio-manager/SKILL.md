---
name: portfolio-manager
description: Track and manage the trading portfolio — positions, cash, P&L, allocation, and performance metrics. Use this skill in every daily trading run to understand current portfolio state before making decisions. It reads portfolio data via `trade-executor` (BT Trade demo or live, via bt-gateway), calculates performance, checks allocation limits, and determines available capital for new trades. Trigger whenever you need to know the current portfolio state, check if a trade fits within risk limits, or review historical performance.
---

# Portfolio Manager

Track portfolio state, enforce allocation rules, and provide the decision-making layer with accurate position data.

## Data Sources

**Always refresh via `trade-executor`. Never read cash/holdings from a file or Firestore doc directly.**

Cash, positions, open orders, and fills change asynchronously (broker fills, manual trades, intraday price moves). The authoritative snapshot for any run comes from:

- demo mode → `node scripts/bt_executor.mjs status`
- live mode → `node scripts/bt_executor.mjs status --live`

Mode is encoded in the `BT_GATEWAY_API_KEY` prefix (`bvb_demo_...` / `bvb_live_...`); `--live` must be passed explicitly when using a live key, or the script aborts.

Each command re-fetches live data from BT Trade via bt-gateway and writes a refreshed portfolio snapshot back to the gateway's `/api/v1/state/portfolio` cache **as a side-effect**. That cached state is for downstream skills that don't need sub-second freshness — it is *not* a primary source. If an analysis skill only needs the morning's snapshot for context, it may read `store.getState()`; if anyone is answering a question about *current* cash or holdings, they MUST run the executor.

Storage is gateway-only — there is no Firestore access from this side and no local-file fallback. `scripts/store.mjs` is a thin HTTP client; every read and write lands behind `/api/v1/state|fills|journal|considered|snapshots` on bt-gateway.

At the start of every run, execute `status`. If the returned `mode` does not match what you expect from the API key prefix, halt — don't trade across mode boundaries.

## Portfolio State Calculation

Every run, compute and report:

### Position Summary
For each holding:
```
SYMBOL | QTY | AVG COST | CURRENT | P&L % | P&L RON | WEIGHT % | DAYS HELD | TRADE TYPE
```

### Portfolio Metrics
- **Total value**: Cash + positions at market value
- **Cash**: Available RON
- **Invested**: Total position value
- **Cash ratio**: Cash / Total value (must stay above 10%)
- **Daily P&L**: Today's change in total value
- **Total P&L**: Since inception, in RON and %
- **Win rate**: Closed profitable trades / total closed trades
- **Average win vs average loss**: Risk/reward realized

### Allocation Check
Before any new trade, verify:
1. Single stock limit: Position would not exceed 30% of portfolio
2. Sector limit: Sector exposure would not exceed 60%
3. Cash reserve: At least 10% cash remains after the trade
4. Daily deployment limit: Not deploying more than 50% of available cash today
5. Maximum concurrent positions: Not exceeding 5 open positions

If any limit would be breached, flag it and suggest an alternative sizing.

## Position Sizing Logic

Given a trade signal with entry price and stop-loss:

```
Risk per trade = 10% of position value (our max loss tolerance)
Position size = Available capital for this trade / Entry price
Max position by allocation = 30% of portfolio / Entry price
Final size = minimum of (position size, max position by allocation)
```

Early portfolio (< 2,000 RON total):
- Accept concentrated positions (fewer, larger relative positions)
- Minimum trade size: Must be above BT Trade's minimum order value
- May only hold 1-2 positions — that's OK

Growing portfolio (2,000 - 10,000 RON):
- Target 3-4 positions
- Begin diversifying across sectors

Mature portfolio (> 10,000 RON):
- Target 4-5 positions
- Full diversification rules apply

## Performance Tracking

Maintain running records of:
- Every trade: entry date, exit date, symbol, direction, entry price, exit price, P&L, trade type
- Daily portfolio value snapshots
- Monthly return calculation
- Drawdown tracking (peak to trough)
- Sharpe-like ratio (return vs volatility of returns)

## Output Format

```
📊 PORTFOLIO STATUS — [DATE]

💰 CASH: [X] RON ([Y]% of portfolio)
📈 INVESTED: [X] RON ([Y]% of portfolio)
🏦 TOTAL VALUE: [X] RON

POSITIONS:
[Table of current holdings]

TODAY'S ACTIVITY:
[Fills, new orders, cancelled orders]

ALLOCATION CAPACITY:
- Can deploy up to [X] RON today (50% daily limit)
- Sectors with room: [list]
- Sectors near limit: [list]

PERFORMANCE:
- Today: [+/-X%]
- This week: [+/-X%]
- This month: [+/-X%]
- Total (since inception): [+/-X%]
- Win rate: [X]% ([N] trades)
```

## Closed Position Detection

Diff today's BT Trade holdings against the previous run's cached portfolio state (`store.getState()`). Any symbol held previously that is absent today (or held at a smaller quantity) is a closed (or partially closed) position. Reconstruct the exit P&L from the matching records in the `fills` collection (`store.listFills({ since: ... })`).

For each closed position, hand off to:
- `trade-journal` — append an exit record with outcome narrative and thesis verdict, carrying forward the `theme_tag`, `rule_id`, and `invalidation` so the retrospective can attribute P&L to the originating theme or rule
- `tax-tracker` — log the numeric record for Declarația Unică (uses `scripts/tax_fifo.mjs` reading fills via the gateway for FIFO matching; cash flows are in RON, no FX adjustment needed)

These two are complementary, not redundant: tax-tracker captures the legal/numerical record, trade-journal captures the *why* and *what we learned*.

## Considered-but-Rejected Candidates (Learning Signal)

Every candidate the decision layer looks at but does **not** trade — either rejected by allocation limits, deferred by a rule, or skipped for a macro reason — must be logged to the `considered` collection. Without this log, the retrospective can only learn from what we *did* do, never from what we wisely skipped or what we wrongly avoided.

Write via `scripts/store.mjs`:

```js
import { openStore } from './scripts/store.mjs';
const store = await openStore();
await store.appendConsidered({
  date: '2026-04-21',
  symbol: 'TLV',
  decision: 'rejected',            // 'rejected' | 'deferred' | 'skipped'
  reason: 'sector cap (Banking at 58%)',
  theme_tag: 'BNR higher-for-longer',
  rule_id: 'risk-on-banking',
  conviction: 7,
  entry_price_considered: 38.40,
  stop_considered: 35.00,
  target_considered: 42.00,
});
```

Backend: the gateway's `/api/v1/considered` endpoint, tenant+mode-scoped. The retrospective pulls this in its post-mortem: "of N rejected candidates in the window, M would have been winners — is a rule too restrictive?"

## Rules This Skill Enforces
- Never approve a trade that breaks allocation limits without explicit override
- Always report accurate P&L — no rounding or hiding losses
- Track every trade for tax purposes (feed to tax-tracker)
- Track every trade's narrative (feed to trade-journal on entry and on exit)
- Flag any position that has been held longer than its intended timeframe
- Flag any position approaching its stop-loss level
