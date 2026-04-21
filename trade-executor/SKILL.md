---
name: trade-executor
description: Execute trades AND answer any question about the brokerage account itself — current cash balance, positions, open orders, recent fills. Routes to one of three backends based on EXECUTION_MODE — a local simulation (default, no broker contact), BT Trade demo (paper trading via real BT Trade API), or BT Trade live (real RON). The skill's interface is identical across all three. Trigger whenever the synthesis step decides to place, modify, or cancel an order, whenever current positions and fills need to be reconciled with market reality, OR whenever the user asks anything about their trading account (e.g. "how much cash do I have", "what do I own", "what orders are open", "show me my portfolio").
---

# Trade Executor

Three execution backends, one interface. The skill's contract is identical either way — orders in, fills out, state tracked via the executor script for the active mode.

| `EXECUTION_MODE` | Backend | Broker contact | Real money |
|---|---|---|---|
| `demo` (**current active mode**) | `scripts/bt_executor.mjs` (`demo: true`) | BT Trade demo environment | No (paper) |
| `live` | `scripts/bt_executor.mjs` (`--live`) | BT Trade live environment | **Yes — real RON** |
| `simulation` (legacy; dev-only) | `scripts/sim_executor.mjs` | None — Yahoo/stooq prices only | No |

Read `EXECUTION_MODE` from the environment at the start of each run. **The routine runs in `demo`.** `simulation` is retained for offline development (no BT creds needed) but must not be used for scheduled routine runs — it gives fake fills that pollute the journal. If `EXECUTION_MODE` is unset, default to `simulation` only to prevent accidentally hitting a real broker when running ad-hoc scripts locally; the routine always sets it explicitly. Never upgrade modes implicitly — the routine's env is the only switch.

### ⚠️ Cash and holdings are NEVER read from a file

Cash balances, position quantities, open orders, and recent fills change asynchronously — a manual trade on the broker, a fill between the last `settle` and now, an intraday price move. Any file or Firestore doc holding these values is a *snapshot*, not the truth.

**Hard rule for every skill (including this one, including ad-hoc user questions):**
- To answer "how much cash do I have" / "what do I own" / "what orders are open" — **run the executor script for the active EXECUTION_MODE and parse its fresh output**. Never `cat`/`grep`/`jq` `portfolio/state.json`, never read `portfolio_state/current` directly, never read `portfolio/state.seed.json` (that's a bootstrap template, not current state).
- The single correct command is:
  - `simulation` → `node scripts/sim_executor.mjs status`
  - `demo` / `live` → `node scripts/bt_executor.mjs status` (add `--live` only when `EXECUTION_MODE=live`)
- These scripts re-fetch from the source of truth (Yahoo + stored sim state; or BT Trade's live API) and emit JSON. Parse that JSON. That is the only authoritative cash/holdings number.

If an executor run fails, report the failure — do not fall back to reading the stored state, and do not answer with stale numbers.

### Prerequisite: `npm install` before any executor call

The executor scripts depend on `@google-cloud/firestore` (Firestore backend for `scripts/store.mjs`). The routine's sandbox is ephemeral — `node_modules/` does not survive between runs — so **every run must execute `npm install` at the repo root before invoking `sim_executor.mjs` or `bt_executor.mjs`**. See `PROJECT.md` § Daily Workflow → Step 0.

If the SDK is missing, `openStore()` silently falls back to `LocalStore` (local JSONL files under `portfolio/` + `journal/`), which *also* don't survive sandbox recycling — so portfolio snapshots come back wrong.

**Why BT Trade** (Banca Transilvania's retail platform, not IBKR): it has native BVB access with RON-native cash and the symbols our skills already use, and the HTTP API (via the vendored `@bogdanripa/bt-trade` client at `vendor/bt-trade/`) works without the GUI-automation plumbing IBKR's Gateway requires. One trade-off: BT's demo and live APIs both require OTP via SMS — the library bridges this to ntfy.sh, which must have a running phone Shortcut forwarding BT's SMS codes to the configured topic.

## Simulation Backend

### State storage (Firestore)

All persistent state lives in Firestore (`europe-west3`, project `auto-trader-493814`) via `scripts/store.mjs`:

| Collection / doc | Contents |
|---|---|
| `portfolio_state/current` | cash, positions, totals, mode, as_of |
| `orders/open` | array doc of open orders awaiting fill |
| `fills/*` | one doc per historical fill (append-only) |
| `trades_journal/*` | entry/exit journal (feeds retrospective) |
| `bt_session/current` | BT Trade token snapshot |

Git-tracked `portfolio/state.seed.json` is the one-shot fixture used to bootstrap a fresh Firestore database. Run once after creating the DB:

```
FIRESTORE_PROJECT=auto-trader-493814 node scripts/seed_state.mjs portfolio/state.seed.json
```

Thereafter `sim_executor.mjs` owns the state and writes every change back to Firestore. In dev (no `FIRESTORE_PROJECT`), the same script transparently falls back to local files under `portfolio/` + `journal/` so you can run scripts locally against a throwaway dataset.

### Simulation rules
- **Price source:** Yahoo Finance OHLCV, `https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>.RO?interval=1d`. See "BVB Symbol Mapping" below.
- **Fill model:** At each run, for every open order in `orders/open`, check the day's OHLC.
  - BUY limit at `P`: fills if `daily_low ≤ P`. Fill price = `min(P, daily_open)` — conservative; assumes you got no better than the open if it gapped through your limit.
  - SELL limit at `P`: fills if `daily_high ≥ P`. Fill price = `max(P, daily_open)`.
  - Orders that don't fill: stay open if `tif=GTC`, cancelled if `tif=DAY` and the day has closed.
- **Commission:** 0.1% of trade value, min 1 RON. Approximates BT Trade's BVB commission tier.
- **Slippage:** baked into the open-price rule above. No additional slippage.
- **Partial fills:** not simulated. Orders either fully fill or stay open.
- **No shorting:** SELL orders require an existing long position of ≥ quantity.
- **Cash reservations:** BUY orders reserve cash at submission. Cancelled/expired orders release it.

### Simulation workflow on every run

`sim_executor.mjs` owns portfolio state in the Firestore store (or local-files fallback in dev) and enforces every rule in this document:

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
6. Write `portfolio_state/current` and replace `orders/open` atomically; each new fill is appended as a doc in `fills/*`

**What `place` does:**
1. Pre-trade checks (all enforced, script rejects with non-zero exit if any fails):
   - quantity > 0 and limit > 0
   - limit within ±10% of current market price (fat-finger guard)
   - available cash ≥ notional + commission after keeping the 10% reserve
   - 30% single-stock cap not breached
   - 50% daily deployment cap not breached
   - 5 concurrent positions not exceeded
2. Append the order to `orders/open` with a reservation on the cash

Returns JSON describing the accepted order (or the rejection reason on stderr + exit code 1).

### Order record schema (stored under `orders/open`)
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

### Fill record schema (one doc per fill under `fills/*`)
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

### Portfolio state schema (singleton `portfolio_state/current`)
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

If any check fails, reject the order, log the reason, do not write to `orders/open`.

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

Script: `scripts/bt_executor.mjs`. Calls the **bt-gateway** REST API — no
direct BT Trade client, no OTP handling, no session management. The gateway
(a Cloud Run service) owns the BT Trade session and keeps tokens fresh via
its own 45-minute cron.

### Required environment variables

| Var | Purpose |
|---|---|
| `BT_GATEWAY_API_KEY` | API key from bt-gateway Settings → Access. Prefix encodes mode: `bvb_demo_...` or `bvb_live_...` |
| `EXECUTION_MODE` | `simulation` \| `demo` \| `live` — selects backend |

No `BT_USER`, `BT_PASS`, or `BT_NTFY_TOPIC` needed — the gateway handles credentials and OTP.

When `EXECUTION_MODE=live`, trade-executor passes `--live` to every `bt_executor.mjs` invocation. The script cross-checks that the API key starts with `bvb_live_` and aborts if it doesn't, preventing accidental mode mismatches.

### CLI surface

All commands print JSON to stdout on exit 0, an error message to stderr
on exit 1/2/3. **Do not hardcode expectations about the JSON shape.**
BT Trade's API passes through raw broker responses whose field names,
casing, and nesting can change between demo/live and across BT releases.
The contract is only that the output is valid JSON and that stdout-vs-stderr
separates "success payload" from "error message". Run the command, parse
the JSON, then inspect the structure and extract what you need.

If you can't find a field by its obvious name, **print the raw JSON and
look at what's actually there** — don't guess. Examples: a cash field
might be `available`, `availableAmount`, `availableCash`, or nested under
`balances.RON`. A position quantity might be `quantity`, `qty`, `Quantity`,
or `Shares`. Orders might come back as a flat array, or wrapped in
`{ Items: [...] }`, or under `items`. Adapt to what's in front of you.

| Command | Purpose |
|---|---|
| `status` | Cash + holdings snapshot. Also writes `portfolio_state/current` as a side-effect so downstream skills keep working. |
| `place` | Submit a limit order. Required flags: `--symbol`, `--action` (BUY\|SELL), `--quantity`, `--limit`, `--tif` (DAY\|GTC), `--trade-id`. |
| `orders` | Recent/open orders. |
| `holdings` | Current positions only. |
| `refresh` | Nudge the gateway to rotate the BT session. Rarely needed — the gateway's 45-min cron handles it. |

Pass `--live` (only) when `EXECUTION_MODE=live`; the script cross-checks
this against the API key prefix and aborts on mismatch.

Example invocation:
```bash
node scripts/bt_executor.mjs status
node scripts/bt_executor.mjs place \
    --symbol TGN --action BUY --quantity 2 --limit 89.00 --tif DAY \
    --trade-id 2026-04-19-TGN-01
```

For `place`, success vs rejection is encoded somewhere in the response —
look for an `errorMessages` / `errors` / `result` / `status` field and
check whether it indicates the broker accepted the order. Log the raw
response either way so the journal has the full picture.

---

### Session and OTP

Session lifecycle is fully delegated to bt-gateway:
- The gateway stores encrypted BT credentials in Firestore (KMS-encrypted).
- On the first call, if no live session exists, the gateway triggers a fresh
  BT login and delivers the SMS OTP via ntfy to your phone. No action needed
  from this script.
- The gateway's own 45-minute Cloud Scheduler cron keeps the session alive.
  This script's `refresh` command is an explicit nudge if needed but is no
  longer part of the routine's keepalive path.

### Differences from simulation

| Behavior | `simulation` | `demo` / `live` |
|---|---|---|
| Fill model | Deterministic: BUY at `min(limit, open)` if `low ≤ limit` | Real market — limit orders rest on BT's book |
| Settlement | `sim_executor.mjs settle` marks to market against Yahoo OHLC | BT fills asynchronously; we poll via `orders` command |
| Commission | Modeled as 0.1% min 1 RON | Real BT commission returned by the gateway |
| State source of truth | `portfolio_state/current` in Firestore | BT Trade server (fetched via gateway) |
| Firestore state role | Authoritative | Local snapshot/cache for downstream skills |
| Session management | N/A | bt-gateway Cloud Run service |

**Downstream skills** (portfolio-manager, risk-monitor, retrospective) read `portfolio_state/current`. In `demo`/`live` mode, `bt_executor.mjs status` writes a refreshed snapshot as a side-effect so those skills keep working unchanged.
