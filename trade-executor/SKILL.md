---
name: trade-executor
description: Execute trades. While the engine is in simulation mode, this skill places orders against a local simulated portfolio using real BVB market prices — no IBKR connection required. When we eventually cut over to live trading, the same skill will wrap the IBKR gateway behind the same interface. Trigger whenever the synthesis step decides to place, modify, or cancel an order, or when current positions and fills need to be reconciled with market reality.
---

# Trade Executor

Two execution backends sharing one interface: **simulation** (default, no external account) and **ibkr-live** (future). The skill's contract is identical either way — orders in, fills out, state in `portfolio/state.json`.

Current mode: **simulation**. Switch by setting `EXECUTION_MODE=ibkr` in the routine environment (not wired yet).

## Simulation Backend

### State files (all committed to git)
```
portfolio/
├── state.json        — current cash, positions, last-updated timestamp
├── orders.jsonl      — open orders awaiting fill
└── fills.jsonl       — historical fills (append-only, mirrors real exchange fills)
```

### Simulation rules
- **Price source:** Yahoo Finance OHLCV, `https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>.RO?interval=1d`. See "BVB Symbol Mapping" below.
- **Fill model:** At each run, for every open order in `orders.jsonl`, check the day's OHLC.
  - BUY limit at `P`: fills if `daily_low ≤ P`. Fill price = `min(P, daily_open)` — conservative; assumes you got no better than the open if it gapped through your limit.
  - SELL limit at `P`: fills if `daily_high ≥ P`. Fill price = `max(P, daily_open)`.
  - Orders that don't fill: stay open if `tif=GTC`, cancelled if `tif=DAY` and the day has closed.
- **Commission:** 0.1% of trade value, min 1 RON. This approximates IBKR's BVB commission tier.
- **Slippage:** baked into the open-price rule above. No additional slippage.
- **Partial fills:** not simulated. Orders either fully fill or stay open.
- **No shorting:** SELL orders require an existing long position of ≥ quantity.
- **Cash reservations:** BUY orders reserve cash at submission. Cancelled/expired orders release it.

### Simulation workflow on every run

1. **Mark to market** — fetch latest close for every symbol in `state.json.positions`; update `state.json.positions[*].last_price` and `last_updated`.
2. **Settle open orders** — for each order in `orders.jsonl` created before today, check today's OHLC. Apply fills per the rules above. Write fill records to `fills.jsonl`, update `state.json`, remove filled/expired orders from `orders.jsonl`.
3. **Report closed positions** — any symbol whose quantity dropped to 0 this run is a closed trade. Surface these to `portfolio-manager` so it triggers `trade-journal` exit records.
4. **Place new orders** — for each order the synthesis step decided on, validate (cash available, within allocation limits), write to `orders.jsonl`, reserve cash.

### Order record schema (in orders.jsonl)
```json
{
  "order_id": "2026-04-19-SNG-buy-01",
  "placed_at": "2026-04-19T07:45:00+03:00",
  "symbol": "SNG",
  "action": "BUY",
  "quantity": 10,
  "order_type": "LMT",
  "limit_price": 48.50,
  "tif": "DAY",
  "trade_type": "swing",
  "trade_id": "2026-04-19-SNG-01",
  "cash_reserved_ron": 485.49
}
```

### Fill record schema (in fills.jsonl)
```json
{
  "fill_id": "2026-04-19-SNG-buy-01-fill",
  "order_id": "2026-04-19-SNG-buy-01",
  "filled_at": "2026-04-19T09:15:00+03:00",
  "symbol": "SNG",
  "action": "BUY",
  "quantity": 10,
  "fill_price": 48.45,
  "commission_ron": 0.48,
  "total_ron": 484.98
}
```

### state.json schema
```json
{
  "mode": "simulation",
  "as_of": "2026-04-19T17:30:00+03:00",
  "cash_ron": 515.02,
  "positions": [
    {
      "symbol": "SNG",
      "quantity": 10,
      "avg_cost": 48.45,
      "last_price": 49.20,
      "last_updated": "2026-04-19T17:30:00+03:00",
      "trade_type": "swing",
      "trade_id": "2026-04-19-SNG-01",
      "opened_at": "2026-04-19T09:15:00+03:00"
    }
  ],
  "totals": {
    "position_value_ron": 492.00,
    "total_value_ron": 1007.02,
    "unrealized_pnl_ron": 7.50,
    "unrealized_pnl_pct": 0.75
  }
}
```

## BVB Symbol Mapping

Yahoo Finance uses the BVB ticker + `.RO` suffix. A working subset of BET-Plus names:

| BVB symbol | Yahoo symbol | Company |
|------------|--------------|---------|
| SNG | SNG.RO | Romgaz |
| TLV | TLV.RO | Banca Transilvania |
| BRD | BRD.RO | BRD-GSG |
| FP  | FP.RO  | Fondul Proprietatea |
| H2O | H2O.RO | Aquila Part Prod Com |
| EL  | EL.RO  | Electrica |
| SNP | SNP.RO | OMV Petrom |
| TGN | TGN.RO | Transgaz |
| TEL | TEL.RO | Transelectrica |
| M   | M.RO   | MedLife |

If a symbol fails on Yahoo: fallback to `https://stooq.com/q/d/l/?s=<symbol>.ro&i=d` (CSV). If both fail: log the symbol, skip it for this run, and alert via Telegram — don't silently drop.

## Fetching prices (pseudo-curl)

```bash
# Latest daily OHLC for SNG
curl -s 'https://query1.finance.yahoo.com/v8/finance/chart/SNG.RO?interval=1d&range=5d' \
  -H 'User-Agent: Mozilla/5.0'
```

Yahoo rate limits are generous but not infinite. Batch by fetching one symbol at a time with small delays, or use `?symbols=SNG.RO,TLV.RO,BRD.RO` on the quote endpoint for multi-symbol snapshots.

## Pre-trade checks (enforced by this skill before writing an order)

1. Cash available ≥ order value + commission + 10% cash reserve minimum
2. Quantity > 0
3. Limit price within ±10% of current market (guards against fat-finger)
4. Symbol resolves on the price feed
5. Allocation limits from `portfolio-manager` not breached

If any check fails, reject the order, log the reason, do not write to `orders.jsonl`.

## Output format

After each batch of order actions:

```
EXECUTION REPORT [DATETIME]

Orders placed:
  BUY  10 SNG @ 48.50 LMT DAY  → order_id 2026-04-19-SNG-buy-01

Fills settled (from previous run):
  BUY  10 TLV @ 23.80 filled @ 23.75  commission 0.24 RON

Orders expired/cancelled:
  BUY  20 H2O @ 12.00 — no fill, DAY expired

Portfolio after this run:
  Cash: 515.02 RON | Positions: 1 (SNG) | Total: 1007.02 RON
```

## IBKR Live Backend (not active)

When we cut over, the live backend will:
1. Connect to an IB Gateway (Client Portal or TWS) — separate setup
2. Translate the same order schema into IBKR API calls
3. Write the same `fills.jsonl` and update the same `state.json`

Everything else — journal, retrospective, portfolio rules — stays identical. That's the point of keeping the interface stable now.
