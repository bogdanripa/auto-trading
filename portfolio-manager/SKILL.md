---
name: portfolio-manager
description: Track and manage the trading portfolio — positions, cash, P&L, allocation, and performance metrics. Use this skill in every daily trading run to understand current portfolio state before making decisions. It reads portfolio data from IBKR (or from the paper trading simulation), calculates performance, checks allocation limits, and determines available capital for new trades. Trigger whenever you need to know the current portfolio state, check if a trade fits within risk limits, or review historical performance.
---

# Portfolio Manager

Track portfolio state, enforce allocation rules, and provide the decision-making layer with accurate position data.

## Data Sources

Portfolio state lives in three git-tracked files, maintained by `trade-executor`:
- `portfolio/state.json` — current cash, positions, totals
- `portfolio/orders.jsonl` — open orders awaiting fill
- `portfolio/fills.jsonl` — historical fills (append-only)

**Simulation mode (current):** state.json is the source of truth. `trade-executor` fetches real BVB prices each run and updates positions.

**IBKR live mode (future):** same files, but `trade-executor` reconciles them against IBKR's actual account state at the start of each run before this skill reads them. From the perspective of this skill, nothing changes — read the same files.

Read `state.json` at the start of every run. If `mode` does not match the routine's `EXECUTION_MODE` env var (or if the file is older than the last run), flag it and halt — don't trade on stale state.

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
- Minimum trade size: Must be above IBKR's minimum order value
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

The detection mechanism differs by execution mode, but the downstream hand-off is identical.

**Simulation mode (`EXECUTION_MODE=simulation`):**
The `settle` step of `scripts/sim_executor.py` is the authoritative source. When a BUY/SELL sequence drives a position's quantity to zero, `sim_executor` emits the close in its report under a `closed_positions` list with entry price, exit price, quantity, and trade metadata (`trade_type`, `trade_id`, `theme_tag`, `rule_id`, `invalidation`). Read that list verbatim at the start of each evening run — do not try to recompute from fills, the script has already reconciled cash and commissions.

**IBKR live mode (future):**
Diff today's IBKR holdings against yesterday's `state.json` snapshot. Any symbol held yesterday that is absent today (or held at a smaller quantity) is a closed (or partially closed) position. Reconstruct the exit P&L from the matching fill in `fills.jsonl`.

For each closed position, regardless of mode, hand off to:
- `trade-journal` — append an exit record with outcome narrative and thesis verdict, carrying forward the `theme_tag`, `rule_id`, and `invalidation` so the retrospective can attribute P&L to the originating theme or rule
- `tax-tracker` — log the numeric record for Declarația Unică (uses `scripts/tax_fifo.py` on `fills.jsonl` for FIFO matching; cash flows are in RON, no FX adjustment needed)

These two are complementary, not redundant: tax-tracker captures the legal/numerical record, trade-journal captures the *why* and *what we learned*.

## Rules This Skill Enforces
- Never approve a trade that breaks allocation limits without explicit override
- Always report accurate P&L — no rounding or hiding losses
- Track every trade for tax purposes (feed to tax-tracker)
- Track every trade's narrative (feed to trade-journal on entry and on exit)
- Flag any position that has been held longer than its intended timeframe
- Flag any position approaching its stop-loss level
