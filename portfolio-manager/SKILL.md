---
name: portfolio-manager
description: Track and manage the trading portfolio — positions, cash, P&L, allocation, and performance metrics. Use this skill in every daily trading run to understand current portfolio state before making decisions. It reads portfolio data from IBKR (or from the paper trading simulation), calculates performance, checks allocation limits, and determines available capital for new trades. Trigger whenever you need to know the current portfolio state, check if a trade fits within risk limits, or review historical performance.
---

# Portfolio Manager

Track portfolio state, enforce allocation rules, and provide the decision-making layer with accurate position data.

## Data Sources

### Live/Paper Trading (IBKR)
When IBKR is connected, read portfolio data via the trade-executor skill's API connection:
- Current positions (symbol, quantity, average cost, current value)
- Cash balance (RON)
- Open orders
- Today's fills

### Paper Trading Simulation (Pre-IBKR)
Before IBKR is live, maintain a simulated portfolio using persistent storage. Track:
- Virtual cash balance
- Virtual positions with entry prices and dates
- Simulated fills based on actual BVB prices

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

At the start of each evening run, diff today's IBKR holdings against yesterday's snapshot. Any symbol that was held yesterday and is not held (or is held with a smaller quantity) today is a closed (or partially closed) position. For each one, hand off to:
- `trade-journal` — append an exit record with outcome narrative and thesis verdict
- `tax-tracker` — log the numeric record for Declarația Unică

These two are complementary, not redundant: tax-tracker captures the legal/numerical record, trade-journal captures the *why* and *what we learned*.

## Rules This Skill Enforces
- Never approve a trade that breaks allocation limits without explicit override
- Always report accurate P&L — no rounding or hiding losses
- Track every trade for tax purposes (feed to tax-tracker)
- Track every trade's narrative (feed to trade-journal on entry and on exit)
- Flag any position that has been held longer than its intended timeframe
- Flag any position approaching its stop-loss level
