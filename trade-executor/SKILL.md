---
name: trade-executor
description: Execute trades. Routes orders to one of three backends based on EXECUTION_MODE — a local simulation (default, no broker contact), BT Trade demo (paper trading via real BT Trade API), or BT Trade live (real RON). The skill's interface is identical across all three. Trigger whenever the synthesis step decides to place, modify, or cancel an order, or when current positions and fills need to be reconciled with market reality.
---

# Trade Executor

Three execution backends, one interface. The skill's contract is identical either way — orders in, fills out, state tracked via the executor script for the active mode.

| `EXECUTION_MODE` | Backend | Broker contact | Real money |
|---|---|---|---|
| `simulation` (default) | `scripts/sim_executor.py` | None — Yahoo/stooq prices only | No |
| `demo` | `scripts/bt_executor.mjs` (`demo: true`) | BT Trade demo environment | No (paper) |
| `live` | `scripts/bt_executor.mjs` (`--live`) | BT Trade live environment | **Yes — real RON** |

Read `EXECUTION_MODE` from the environment at the start of each run. If unset, default to `simulation`. Never upgrade modes implicitly — the routine's env is the only switch.

**Why BT Trade** (Banca Transilvania's retail platform, not IBKR): it has native BVB access with RON-native cash and the symbols our skills already use, and the HTTP API (via the vendored `@bogdanripa/bt-trade` client at `vendor/bt-trade/`) works without the GUI-automation plumbing IBKR's Gateway requires. One trade-off: BT's demo and live APIs both require OTP via SMS — the library bridges this to ntfy.sh, which must have a running phone Shortcut forwarding BT's SMS codes to the configured topic.

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

Use the committed script, which owns the state files and enforces every rule in this document:

```
# 1. Mark to market + settle yesterday's eligible orders
node scripts/sim_executor.mjs settle

# 2. Place any new orders the synthesis step decided on (one call per order)
node scripts/sim_executor.mjs place \
    --symbol TGN --action BUY --quantity 2 --limit 89.00 --tif DAY \
    --trade-type swing --trade-id 2026-04-19-TGN-01 \
    --theme-tag nbr_first_cut_pivot \
    --invalidation "NBR holds rates in May; or EUR/RON > 5.10"

# 3. Snapshot for diagnostics
node scripts/sim_executor.mjs status
```

**Optional flags on `place` that feed the journal / retrospective:**
- `--theme-tag <slug>` — ties the order to a theme from `THEMES.md` (e.g. `nbr_first_cut_pivot`, `msci_em_review`). When the position later closes, the retrospective groups P&L by theme to detect which macro setups actually paid.
- `--invalidation "<text>"` — the explicit condition under which this trade's thesis is wrong. Stored on the position and surfaced by `risk-monitor` alongside the mechanical stop. Forces the synthesis step to write down a pre-mortem instead of relying on the -10% hard stop alone.
- `--rule-id <id>` — if the trade was triggered by a specific rulebook rule (`COM-1`, `RAT-3`, …), tag it for the weekly retrospective's rule-fire attribution.

**What `settle` does, in order:**
1. Mark to market every held symbol (Yahoo last bar → `last_price` + `peak_since_entry`)
2. For each open order placed before today's bar date: check the bar's OHLC, apply the BUY-at-low/SELL-at-high fill rule, compute commission, write fill
3. Apply fills to positions (weighted-average cost on BUY; FIFO-less quantity-deduction on SELL — detailed FIFO matching is the tax-tracker's job)
4. Detect closed positions (quantity dropped to 0) and emit them in the report for `trade-journal` to pick up
5. Rebuild `totals` from current positions
6. Write state.json atomically, rewrite orders.jsonl without filled/expired orders

**What `place` does:**
1. Pre-trade checks (all enforced, script rejects with non-zero exit if any fails):
   - quantity > 0 and limit > 0
   - limit within ±10% of current market price (fat-finger guard)
   - available cash ≥ notional + commission after keeping the 10% reserve
   - 30% single-stock cap not breached
   - 50% daily deployment cap not breached
   - 5 concurrent positions not exceeded
2. Write the order to orders.jsonl with a reservation on the cash

Returns JSON describing the accepted order (or the rejection reason on stderr + exit code 1).

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

## BT Trade Backend (`demo` and `live`)

Script: `scripts/bt_executor.mjs`. Vendored library: `vendor/bt-trade/` (`@bogdanripa/bt-trade`, no external npm install — zero runtime deps).

### Required environment variables

| Var | Purpose |
|---|---|
| `BT_USER` | BT Trade username |
| `BT_PASS` | BT Trade password |
| `BT_NTFY_TOPIC` | ntfy.sh topic where BT's SMS OTPs are forwarded (the phone Shortcut you already run) |
| `EXECUTION_MODE` | `simulation` \| `demo` \| `live` — selects backend |

When `EXECUTION_MODE=live`, trade-executor passes `--live` to every `bt_executor.mjs` invocation. Without that flag the executor defaults to BT's demo/paper environment.

### CLI surface

```
# Account + cash + holdings snapshot
node scripts/bt_executor.mjs status

# Place an order (demo or live based on --live flag)
node scripts/bt_executor.mjs place \
    --symbol TGN --action BUY --quantity 2 --limit 89.00 --tif DAY \
    --trade-id 2026-04-19-TGN-01

# Open/recent orders
node scripts/bt_executor.mjs orders

# Current positions
node scripts/bt_executor.mjs holdings
```

### Single-session discipline

**One `login()` per process.** The executor creates the `BTTradeClient` once at startup and reuses it for every operation in that invocation. BT's fraud heuristics flag repeated logins from the same account. This is why the skill should batch all its BT work into a single `bt_executor.mjs` call rather than calling once per order — see "Per-run invocation pattern" below.

### OTP delivery

On login, BT sends an SMS. Your phone's Shortcut forwards the SMS body to the ntfy.sh topic named by `BT_NTFY_TOPIC`. `bt_executor.mjs` waits on that topic for up to 2 minutes, parses the code, and submits it. No human in the loop if the forwarding is working.

### Session persistence (planned)

Scheduled routines get a fresh filesystem each run, so a naïve "one login per run" design burns OTPs at every cron fire. A follow-up change persists `client.toSnapshot()` to GCS (`gs://auto-trader-493814-bt-session/bt_session.json`) and adds a 45-minute scheduled keeper that refreshes the tokens. While the keeper is running, trading routines restore the snapshot and skip OTP entirely; if the keeper ever misses more than ~1 hour the next run falls back to a fresh login (one OTP). Not yet wired — until it lands, expect one OTP per morning + evening run.

### Per-run invocation pattern

Because of the single-session rule, the morning/evening flow calls `bt_executor.mjs` **once** with all the work batched. The skill's planner writes an intent JSON (orders to place, cancel, etc.), passes it on stdin, and reads back a decision JSON on stdout. CLI commands above are for ad-hoc / diagnostic use.

### Differences from simulation

| Behavior | `simulation` | `demo` / `live` |
|---|---|---|
| Fill model | Deterministic: BUY at `min(limit, open)` if `low ≤ limit` | Real market — limit orders rest on BT's book |
| Settlement | `sim_executor.mjs settle` marks to market against Yahoo OHLC | BT fills asynchronously; we poll `orders.search` |
| Commission | Modeled as 0.1% min 1 RON | Real BT commission surfaced via `orders.preview` |
| State source of truth | `portfolio/state.json` (committed) | BT Trade server (fetched via `portfolio.getHoldings`) |
| `state.json` role | Authoritative | Local snapshot/cache for diagnostics only |

**Implication for downstream skills:** portfolio-manager, risk-monitor, and retrospective read `portfolio/state.json` today. In `demo`/`live` mode, `bt_executor.mjs status` writes a refreshed `state.json` snapshot at the start of every run so those skills keep working unchanged. The `mode` field in state.json reflects the current EXECUTION_MODE so the retrospective can separate simulated vs. real P&L.
