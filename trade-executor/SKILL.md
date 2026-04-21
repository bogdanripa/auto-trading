---
name: trade-executor
description: Execute trades AND answer any question about the brokerage account itself — current cash balance, positions, open orders, recent fills. Talks to BT Trade (demo or live) via the bt-gateway REST API. Trigger whenever the synthesis step decides to place, modify, or cancel an order, whenever current positions and fills need to be reconciled with market reality, OR whenever the user asks anything about their trading account (e.g. "how much cash do I have", "what do I own", "what orders are open", "show me my portfolio").
---

# Trade Executor

One backend, one interface. All broker operations go through
`scripts/bt_executor.mjs`, which is a thin HTTP client for the
**bt-gateway** Cloud Run service. The gateway owns the BT Trade session,
handles SMS OTP via ntfy, and keeps tokens fresh on its own 45-minute cron.

| Mode | API key prefix | Real money |
|---|---|---|
| `demo` (**current active mode**) | `bvb_demo_...` | No (BT paper environment) |
| `live` | `bvb_live_...` | **Yes — real RON** |

Mode is encoded in the API key prefix. When running in `live` mode, every
`bt_executor.mjs` call must pass `--live`; the script cross-checks the key
prefix and aborts on mismatch so a live key can never be used without the
explicit flag.

### ⚠️ Cash and holdings are NEVER read from a file

Cash balances, position quantities, open orders, and recent fills change
asynchronously — a manual trade on the broker, a fill between the last
check and now, an intraday price move. Any file or Firestore doc holding
these values is a *snapshot*, not the truth.

**Hard rule for every skill (including this one, including ad-hoc user
questions):**

- To answer "how much cash do I have" / "what do I own" / "what orders are
  open" — **run `node scripts/bt_executor.mjs status` and parse its
  output**. Never read the cached `portfolio_state` doc directly and then
  answer a user question from it.
- `status` side-effects a refreshed cache at `/api/v1/state/portfolio` in
  bt-gateway; downstream skills that don't need sub-second freshness
  (risk-monitor background passes, retrospective) may read that cache via
  `store.getState()` — but anyone answering a question *now* must re-run
  the executor.

If an executor run fails, report the failure — do not fall back to stale
cached numbers.

### Required environment variables

| Var | Purpose |
|---|---|
| `BT_GATEWAY_API_KEY` | API key from bt-gateway Settings → Access. Prefix encodes mode: `bvb_demo_...` or `bvb_live_...` |

No `BT_USER`, `BT_PASS`, `BT_NTFY_TOPIC`, `FIRESTORE_PROJECT`, or
`GCS_SA_KEY_JSON` needed — the gateway handles credentials, OTP, and
storage.

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
| `status` | Cash + holdings snapshot. Also writes the bt-gateway portfolio-state cache as a side-effect so downstream skills keep working. |
| `place` | Submit a limit order. Required flags: `--symbol`, `--action` (BUY\|SELL), `--quantity`, `--limit`, `--tif` (DAY\|GTC), `--trade-id`. |
| `orders` | Recent/open orders. |
| `holdings` | Current positions only. |
| `refresh` | Nudge the gateway to rotate the BT session. Rarely needed — the gateway's 45-min cron handles it. |

Pass `--live` (only) in live mode; the script cross-checks this against
the API key prefix and aborts on mismatch.

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

### Consuming the output — DO NOT pipe through python

Stop reaching for `node bt_executor.mjs <cmd> 2>/dev/null | python3 -c '...'`
to extract fields. This pattern is actively harmful:

1. `2>/dev/null` drops the real error message. When the executor fails
   (bad API key, gateway unreachable, broker down, missing `--live`),
   the diagnostic lives on **stderr**. Muting stderr leaves stdout
   empty, and your parser then dies with a misleading
   `JSONDecodeError: Expecting value: line 1 column 1`. You've replaced
   a clear broker error with a cryptic parser error.
2. It's unnecessary. Stdout is already JSON. There is nothing to "parse
   defensively" — just read it.

**Correct patterns:**

- **From a shell, field extraction:** use `jq`, not python.
  ```bash
  node scripts/bt_executor.mjs holdings \
    | jq '.holdings.Positions.Items[] | {code: .Code, qty: .SecurityBalance, eval: .Evaluation}'
  ```
- **From a shell, full output:** just run it plain. Exit code tells you
  pass/fail; stderr shows the reason on failure.
  ```bash
  node scripts/bt_executor.mjs status
  ```
- **From Node/JS (all the skills):** spawn it, capture stdout, and
  `JSON.parse(stdout)`. Capture stderr too — surface it on non-zero
  exit. Never silence it.

If a command fails, the fix is to **read stderr and address the
underlying error**, not to harden the parser against empty input.

### Order lifecycle

- Limit orders rest on BT's book until filled, cancelled, or expired by
  time-in-force (`DAY` vs `GTC`).
- Fills happen asynchronously on the broker side. To reconcile, re-run
  `orders` periodically and compare against what we expected; `trade-journal`
  and `risk-monitor` are the downstream consumers that act on fill deltas.
- Commission and settlement details come back from the broker — we don't
  model them.

## Storage / long-term memory

All state that must survive between routine runs — portfolio-state cache,
fills, trade journal entries, considered candidates, daily market
snapshots — lives behind bt-gateway's `/api/v1/state/*`, `/journal`,
`/fills`, `/considered`, `/snapshots/*` endpoints. `scripts/store.mjs`
is the thin HTTP client; callers import `openStore()` and use the same
methods as before (`getState`, `setState`, `appendFill`, `listFills`,
`appendJournal`, `listJournal`, `appendConsidered`, `listConsidered`,
`saveSnapshot`, `loadSnapshot`, `listSnapshots`).

There is no local-files fallback and no direct Firestore access. The
gateway is the only path in and out.

## BVB Symbol Mapping

BT Trade's instrument search takes the BVB ticker directly. If you need a
separate price feed (Yahoo) for analysis, Yahoo uses the `<SYMBOL>.RO`
suffix:

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

## Pre-trade checks

Before calling `place`, validate:

1. Cash available ≥ order value + commission headroom + 10% cash reserve minimum
2. Quantity > 0
3. Limit price within ±10% of current market (guards against fat-finger)
4. Symbol resolves on the price feed
5. Allocation limits from `portfolio-manager` not breached (30% single-stock, 50% daily deployment, 5 concurrent positions)

If any check fails, reject locally before even hitting the gateway, log
the reason, and do not submit.

## Output format (for the daily report)

```
EXECUTION REPORT [DATETIME]

Orders placed:
  BUY  10 SNG @ 48.50 LMT DAY  → gateway order_id abc123...

Fills observed (vs. previous run):
  BUY  10 TLV filled @ 23.75  commission 0.24 RON

Orders still open:
  BUY  20 H2O @ 12.00  placed 2026-04-18

Portfolio after this run:
  Cash: 515.02 RON | Positions: 1 (SNG) | Total: 1007.02 RON
```

## Session and OTP

Session lifecycle is fully delegated to bt-gateway:
- The gateway stores encrypted BT credentials in Firestore (KMS-encrypted).
- On the first call, if no live session exists, the gateway triggers a fresh
  BT login and delivers the SMS OTP via ntfy to your phone. No action needed
  from this script.
- The gateway's own 45-minute Cloud Scheduler cron keeps the session alive.
  This script's `refresh` command is an explicit nudge if needed but is not
  part of the routine's keepalive path.
