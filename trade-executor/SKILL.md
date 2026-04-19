---
name: trade-executor
description: Interface with the IBKR API to execute trading orders on BVB. Use this skill when the synthesis step has decided to place, modify, or cancel orders. It handles order construction, submission, status checking, and fill confirmation. Also use to query account data (positions, cash, open orders) from IBKR. This skill manages the technical connection to IBKR — all other skills work with portfolio data through this interface. Trigger whenever orders need to be placed or IBKR account data is needed.
---

# Trade Executor

Execute trades on BVB through the Interactive Brokers API.

## IBKR Connection

### Architecture
The IBKR API requires an authenticated gateway session. The connection is maintained by a lightweight service running on a VPS that exposes endpoints for the Claude scheduled task to call.

### Gateway Service Endpoints
The VPS runs an IBKR gateway wrapper that exposes these REST endpoints:

```
Base URL: https://[VPS_HOST]:[PORT]/api/v1

Authentication: Bearer token in header

GET  /account          — Account summary (cash, portfolio value)
GET  /positions        — Current positions
GET  /orders           — Open orders
POST /orders           — Place new order
PUT  /orders/{id}      — Modify order
DELETE /orders/{id}    — Cancel order
GET  /orders/{id}      — Order status
GET  /executions       — Today's fills
GET  /market-data/{symbol} — Current quote for a symbol
```

### Order Construction

All BVB orders must use these parameters:

```json
{
  "symbol": "SNG",
  "exchange": "BVB",
  "currency": "RON",
  "action": "BUY" | "SELL",
  "quantity": 10,
  "order_type": "LMT",
  "limit_price": 48.50,
  "tif": "DAY",
  "outside_rth": false
}
```

Rules:
- ALWAYS use limit orders on BVB. Market orders get terrible fills due to wide spreads.
- Set limit price at or slightly above ask (for buys) or at or slightly below bid (for sells)
- For urgent exits, set limit price 1-2% beyond current price to ensure fill
- Time-in-force: DAY for swing trades, GTC for trend ride entries at support levels
- Minimum order value on IBKR: check current minimums, usually ~€/$10 equivalent

### BVB-Specific Symbol Mapping
IBKR uses specific contract IDs for BVB stocks. The symbol mapping:
- Exchange: `BVB` 
- Currency: `RON`
- Security type: `STK`
- Some stocks may need the full ISIN or contract ID — verify on first use

### Order Workflow

1. **Pre-check**: Verify with portfolio-manager that the trade fits within limits
2. **Construct**: Build the order with proper parameters
3. **Submit**: POST to gateway
4. **Confirm**: Log the order ID and expected fill
5. **Monitor**: Check order status — filled, partial, open, cancelled
6. **Report**: Feed fill data to portfolio-manager and tax-tracker

### Error Handling
- If order is rejected: Log reason, notify via Telegram, do not retry automatically
- If gateway is unreachable: Log error, send Telegram alert, skip trading for this run
- If partial fill: Log partial, keep remaining order active unless strategy says cancel
- If price moved significantly since signal: Cancel and re-evaluate (>3% from intended entry)

## Paper Trading Mode

Before IBKR is live, simulate execution:
- Use actual BVB prices from web search
- Assume fills at limit price if the price touched the limit during the session
- Apply realistic commission: 0.1% of trade value (IBKR's approximate BVB commission)
- Track as if real — same logging, same portfolio updates

## VPS Setup Requirements

When setting up the VPS gateway service, it needs:
1. IBKR TWS or IB Gateway installed
2. Python wrapper (ib_insync library recommended)
3. Flask/FastAPI REST server exposing the endpoints above
4. SSL certificate for HTTPS
5. Authentication token for Claude to use
6. Auto-restart on failure (systemd service)
7. Logging of all API calls and responses

## Output Format

After each execution attempt:
```
ORDER RESULT:
  Action: BUY/SELL
  Symbol: [SYMBOL]
  Quantity: [N]
  Limit Price: [X] RON
  Status: FILLED / PARTIAL / OPEN / REJECTED / CANCELLED
  Fill Price: [X] RON (if filled)
  Commission: [X] RON
  Order ID: [IBKR order ID]
  Timestamp: [datetime]
```
