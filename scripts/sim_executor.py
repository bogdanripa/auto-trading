#!/usr/bin/env python3
"""
Simulated BVB execution engine.

Owns three files under portfolio/:
    state.json      — current cash, positions, totals
    orders.jsonl    — open orders awaiting fill
    fills.jsonl     — historical fills, append-only

Commands:
    place     — validate and write a new order to orders.jsonl, reserve cash
    settle    — mark to market, fill eligible open orders against today's OHLC,
                update state, emit a report listing new fills and closed positions
    status    — read-only snapshot of current state

All writes are atomic (write to tmp, then rename) and idempotent where possible.

Usage:
    python3 scripts/sim_executor.py place \\
        --symbol TGN --action BUY --quantity 2 --limit 89.00 --tif DAY \\
        --trade-type swing --trade-id 2026-04-19-TGN-01

    python3 scripts/sim_executor.py settle

    python3 scripts/sim_executor.py status

Paths (override via env):
    PORTFOLIO_DIR   default: portfolio/
"""

import argparse
import json
import os
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import Any

COMMISSION_BPS = 10       # 0.10% of trade value
COMMISSION_MIN_RON = 1.0
CASH_RESERVE_PCT = 0.10   # PROJECT.md: min 10% cash reserve
MAX_SINGLE_POSITION_PCT = 0.30
MAX_DAILY_DEPLOY_PCT = 0.50
MAX_CONCURRENT_POSITIONS = 5
FAT_FINGER_BAND = 0.10    # limit must be within ±10% of current price

PORTFOLIO_DIR = os.environ.get("PORTFOLIO_DIR", "portfolio")
STATE_PATH = os.path.join(PORTFOLIO_DIR, "state.json")
ORDERS_PATH = os.path.join(PORTFOLIO_DIR, "orders.jsonl")
FILLS_PATH = os.path.join(PORTFOLIO_DIR, "fills.jsonl")

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{s}?interval=1d&range=5d"


# ---- file helpers ---------------------------------------------------------

def _read_json(path: str, default: Any) -> Any:
    if not os.path.exists(path):
        return default
    with open(path) as f:
        return json.load(f)


def _write_json_atomic(path: str, obj: Any) -> None:
    d = os.path.dirname(path) or "."
    fd, tmp = tempfile.mkstemp(prefix=".tmp_", dir=d)
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(obj, f, indent=2, ensure_ascii=False)
            f.write("\n")
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _read_jsonl(path: str) -> list[dict]:
    if not os.path.exists(path):
        return []
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def _write_jsonl_atomic(path: str, rows: list[dict]) -> None:
    d = os.path.dirname(path) or "."
    fd, tmp = tempfile.mkstemp(prefix=".tmp_", dir=d)
    try:
        with os.fdopen(fd, "w") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _append_jsonl(path: str, row: dict) -> None:
    with open(path, "a") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


# ---- market data ----------------------------------------------------------

def fetch_today_bar(symbol: str) -> dict[str, Any] | None:
    """Return the most recent daily OHLC bar and current price for a symbol."""
    yahoo_sym = symbol if "." in symbol else f"{symbol}.RO"
    url = YAHOO_URL.format(s=urllib.parse.quote(yahoo_sym))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[warn] price fetch failed for {symbol}: {e}", file=sys.stderr)
        return None
    result = (data.get("chart") or {}).get("result") or []
    if not result:
        return None
    r = result[0]
    meta = r.get("meta") or {}
    quote = ((r.get("indicators") or {}).get("quote") or [{}])[0]
    timestamps = r.get("timestamp") or []
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    # find the last non-None bar
    for i in range(len(closes) - 1, -1, -1):
        if closes[i] is not None:
            return {
                "price": meta.get("regularMarketPrice") or closes[i],
                "open": opens[i],
                "high": highs[i],
                "low": lows[i],
                "close": closes[i],
                "bar_date": datetime.fromtimestamp(timestamps[i], tz=timezone.utc).date().isoformat(),
            }
    return None


# ---- core logic -----------------------------------------------------------

def commission(notional: float) -> float:
    return max(notional * COMMISSION_BPS / 10_000, COMMISSION_MIN_RON)


def total_value(state: dict) -> float:
    return state["cash_ron"] + sum(p["quantity"] * p.get("last_price", p["avg_cost"]) for p in state["positions"])


def find_position(state: dict, symbol: str) -> dict | None:
    for p in state["positions"]:
        if p["symbol"] == symbol:
            return p
    return None


def cash_reserved(orders: list[dict]) -> float:
    return sum(o.get("cash_reserved_ron", 0) for o in orders if o.get("action") == "BUY")


def validate_buy(state: dict, orders: list[dict], symbol: str, qty: int, limit: float, current_price: float) -> str | None:
    """Return error message if invalid, None if OK."""
    if qty <= 0:
        return f"quantity must be > 0, got {qty}"
    if limit <= 0:
        return f"limit must be > 0, got {limit}"
    if current_price:
        band = FAT_FINGER_BAND * current_price
        if limit < current_price - band or limit > current_price + band:
            return f"limit {limit} outside ±{FAT_FINGER_BAND*100:.0f}% of current {current_price:.3f}"

    notional = qty * limit
    comm = commission(notional)
    total = notional + comm

    available_cash = state["cash_ron"] - cash_reserved(orders)
    tv = total_value(state)
    min_cash_after = tv * CASH_RESERVE_PCT

    if available_cash - total < min_cash_after:
        return (f"would breach 10% cash reserve: avail={available_cash:.2f} "
                f"need={total:.2f} min_after={min_cash_after:.2f}")

    # single-stock cap
    existing = find_position(state, symbol)
    existing_value = (existing["quantity"] * existing.get("last_price", existing["avg_cost"])) if existing else 0
    proposed_value = existing_value + qty * current_price if current_price else existing_value + notional
    if proposed_value > tv * MAX_SINGLE_POSITION_PCT:
        return (f"would breach 30% single-stock cap: proposed_value={proposed_value:.2f} "
                f"limit={tv * MAX_SINGLE_POSITION_PCT:.2f}")

    # daily deployment cap: sum of BUYs placed today
    today = datetime.now(timezone.utc).date().isoformat()
    today_deploy = sum(o.get("cash_reserved_ron", 0) for o in orders
                       if o.get("action") == "BUY" and o.get("placed_at", "").startswith(today))
    if today_deploy + total > tv * MAX_DAILY_DEPLOY_PCT:
        return (f"would breach 50% daily deployment cap: today={today_deploy:.2f} "
                f"adding={total:.2f} cap={tv * MAX_DAILY_DEPLOY_PCT:.2f}")

    # concurrent position count
    if existing is None and len(state["positions"]) >= MAX_CONCURRENT_POSITIONS:
        return f"already at max {MAX_CONCURRENT_POSITIONS} concurrent positions"

    return None


def validate_sell(state: dict, symbol: str, qty: int) -> str | None:
    p = find_position(state, symbol)
    if p is None:
        return f"no long position in {symbol} to sell"
    if qty > p["quantity"]:
        return f"sell qty {qty} exceeds held {p['quantity']}"
    return None


# ---- commands -------------------------------------------------------------

def cmd_place(args: argparse.Namespace) -> int:
    state = _read_json(STATE_PATH, None)
    if state is None:
        print(f"error: {STATE_PATH} not found", file=sys.stderr)
        return 2
    orders = _read_jsonl(ORDERS_PATH)

    bar = fetch_today_bar(args.symbol)
    current_price = bar["price"] if bar else None

    action = args.action.upper()
    if action == "BUY":
        err = validate_buy(state, orders, args.symbol, args.quantity, args.limit, current_price)
    elif action == "SELL":
        err = validate_sell(state, args.symbol, args.quantity)
    else:
        err = f"unknown action {action}"

    if err:
        print(f"REJECTED: {err}", file=sys.stderr)
        return 1

    notional = args.quantity * args.limit
    cash_reserved_ron = notional + commission(notional) if action == "BUY" else 0.0

    order = {
        "order_id": args.order_id or f"{datetime.now(timezone.utc).date().isoformat()}-{args.symbol}-{action.lower()}-{len(orders)+1:02d}",
        "placed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "symbol": args.symbol,
        "action": action,
        "quantity": args.quantity,
        "order_type": "LMT",
        "limit_price": args.limit,
        "tif": args.tif,
        "trade_type": args.trade_type,
        "trade_id": args.trade_id,
        "cash_reserved_ron": round(cash_reserved_ron, 2),
    }
    orders.append(order)
    _write_jsonl_atomic(ORDERS_PATH, orders)

    print(json.dumps({"status": "accepted", "order": order}, indent=2))
    return 0


def cmd_settle(args: argparse.Namespace) -> int:
    state = _read_json(STATE_PATH, None)
    if state is None:
        print(f"error: {STATE_PATH} not found", file=sys.stderr)
        return 2

    orders = _read_jsonl(ORDERS_PATH)
    now = datetime.now(timezone.utc)
    today_iso = now.date().isoformat()

    # 1) mark to market every held symbol
    marked: dict[str, dict] = {}
    for p in state["positions"]:
        bar = fetch_today_bar(p["symbol"])
        if bar:
            marked[p["symbol"]] = bar
            p["last_price"] = bar["price"]
            p["last_updated"] = now.isoformat(timespec="seconds")
            peak = p.get("peak_since_entry", p["avg_cost"])
            p["peak_since_entry"] = max(peak, bar["high"])

    # 2) settle open orders against today's bar
    remaining_orders: list[dict] = []
    new_fills: list[dict] = []
    closed_positions: list[dict] = []

    for o in orders:
        sym = o["symbol"]
        bar = marked.get(sym) or fetch_today_bar(sym)
        if bar is None:
            # no market data — keep order open
            remaining_orders.append(o)
            continue

        # cache the bar for any later orders on the same symbol
        marked.setdefault(sym, bar)

        placed_date = o["placed_at"][:10]
        limit = o["limit_price"]
        filled = False
        fill_price = None

        # BVB fills are checked against the next session's OHLC once placed.
        # On the same day the order was placed, we don't fill yet unless the order was placed before the current bar_date.
        if placed_date >= bar["bar_date"]:
            # order placed today or later — not yet settled
            remaining_orders.append(o)
            continue

        if o["action"] == "BUY":
            if bar["low"] is not None and bar["low"] <= limit:
                # conservative fill: min(limit, open)
                op = bar.get("open") if bar.get("open") is not None else limit
                fill_price = min(limit, op)
                filled = True
        else:  # SELL
            if bar["high"] is not None and bar["high"] >= limit:
                op = bar.get("open") if bar.get("open") is not None else limit
                fill_price = max(limit, op)
                filled = True

        if not filled:
            # unfilled — expire if DAY and day has passed, else keep
            if o["tif"] == "DAY" and placed_date < bar["bar_date"]:
                o["expired_at"] = now.isoformat(timespec="seconds")
                # no fill record; just drop from orders
                continue
            remaining_orders.append(o)
            continue

        # write fill
        qty = o["quantity"]
        notional = qty * fill_price
        comm = commission(notional)
        fill = {
            "fill_id": f"{o['order_id']}-fill",
            "order_id": o["order_id"],
            "filled_at": now.isoformat(timespec="seconds"),
            "symbol": sym,
            "action": o["action"],
            "quantity": qty,
            "fill_price": round(fill_price, 4),
            "commission_ron": round(comm, 2),
            "total_ron": round(notional + (comm if o["action"] == "BUY" else -comm), 2),
            "trade_type": o.get("trade_type"),
            "trade_id": o.get("trade_id"),
        }
        new_fills.append(fill)
        _append_jsonl(FILLS_PATH, fill)

        # apply to state
        if o["action"] == "BUY":
            # release reservation (we deduct actual instead)
            state["cash_ron"] -= notional + comm
            pos = find_position(state, sym)
            if pos:
                # weighted avg cost
                total_cost = pos["avg_cost"] * pos["quantity"] + notional
                pos["quantity"] += qty
                pos["avg_cost"] = round(total_cost / pos["quantity"], 4)
                pos["last_price"] = fill_price
            else:
                state["positions"].append({
                    "symbol": sym,
                    "quantity": qty,
                    "avg_cost": round(fill_price, 4),
                    "last_price": fill_price,
                    "last_updated": now.isoformat(timespec="seconds"),
                    "trade_type": o.get("trade_type"),
                    "trade_id": o.get("trade_id"),
                    "opened_at": now.isoformat(timespec="seconds"),
                    "peak_since_entry": fill_price,
                })
        else:  # SELL
            pos = find_position(state, sym)
            state["cash_ron"] += notional - comm
            pos["quantity"] -= qty
            if pos["quantity"] == 0:
                closed_positions.append({
                    "symbol": sym,
                    "trade_id": pos.get("trade_id"),
                    "exit_price": fill_price,
                    "avg_cost": pos["avg_cost"],
                    "days_held": (now - datetime.fromisoformat(pos["opened_at"])).days if pos.get("opened_at") else None,
                })
                state["positions"] = [p for p in state["positions"] if p["symbol"] != sym]

    # 3) recompute totals
    state["as_of"] = now.isoformat(timespec="seconds")
    pos_value = sum(p["quantity"] * p.get("last_price", p["avg_cost"]) for p in state["positions"])
    cost_basis = sum(p["quantity"] * p["avg_cost"] for p in state["positions"])
    tv = state["cash_ron"] + pos_value
    unrealized = pos_value - cost_basis
    state["totals"] = {
        "position_value_ron": round(pos_value, 2),
        "total_value_ron": round(tv, 2),
        "unrealized_pnl_ron": round(unrealized, 2),
        "unrealized_pnl_pct": round(unrealized / cost_basis * 100, 2) if cost_basis else 0.0,
        "cost_basis_ron": round(cost_basis, 2),
    }

    _write_jsonl_atomic(ORDERS_PATH, remaining_orders)
    _write_json_atomic(STATE_PATH, state)

    report = {
        "as_of": state["as_of"],
        "new_fills": new_fills,
        "closed_positions": closed_positions,
        "open_orders_remaining": len(remaining_orders),
        "totals": state["totals"],
    }
    print(json.dumps(report, indent=2))
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    state = _read_json(STATE_PATH, None)
    orders = _read_jsonl(ORDERS_PATH)
    fills = _read_jsonl(FILLS_PATH)
    out = {
        "state": state,
        "open_orders": orders,
        "total_fills_ever": len(fills),
    }
    print(json.dumps(out, indent=2))
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Simulated BVB execution engine")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("place", help="Validate and write a new order")
    sp.add_argument("--symbol", required=True)
    sp.add_argument("--action", required=True, choices=["BUY", "SELL", "buy", "sell"])
    sp.add_argument("--quantity", type=int, required=True)
    sp.add_argument("--limit", type=float, required=True)
    sp.add_argument("--tif", default="DAY", choices=["DAY", "GTC"])
    sp.add_argument("--trade-type", default="swing", choices=["swing", "event", "trend"])
    sp.add_argument("--trade-id", required=True)
    sp.add_argument("--order-id", default=None)
    sp.set_defaults(func=cmd_place)

    ss = sub.add_parser("settle", help="Mark to market and fill eligible orders")
    ss.set_defaults(func=cmd_settle)

    st = sub.add_parser("status", help="Read-only snapshot")
    st.set_defaults(func=cmd_status)

    args = p.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
