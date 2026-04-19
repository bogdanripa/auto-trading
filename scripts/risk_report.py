#!/usr/bin/env python3
"""
Risk report for the current portfolio.

Reads portfolio/state.json and optionally fetches current prices for a fresher
mark-to-market. For every open position computes stop-loss distance, trailing-
stop distance, time-in-trade vs intended timeframe, and surfaces invalidation
conditions (from the last entry record in journal/trades.jsonl) for the agent
to evaluate.

Also computes portfolio-level exposure: per-stock weight, per-sector weight,
cash ratio, concurrent position count, and overall health banner.

Standard library only.

Usage:
    python3 scripts/risk_report.py              # text report to stdout
    python3 scripts/risk_report.py --format=json
    python3 scripts/risk_report.py --refresh-prices  # re-fetch current prices

Exit codes:
    0 — GREEN: all within limits
    1 — YELLOW: warnings (approaching limits, stops nearby)
    2 — RED: limits breached or stops hit
"""

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

PORTFOLIO_DIR = os.environ.get("PORTFOLIO_DIR", "portfolio")
JOURNAL_DIR = os.environ.get("JOURNAL_DIR", "journal")
STATE_PATH = os.path.join(PORTFOLIO_DIR, "state.json")
TRADES_PATH = os.path.join(JOURNAL_DIR, "trades.jsonl")

# Match PROJECT.md / sim_executor defaults
HARD_STOP_PCT = 0.10
TRAILING_STOP_PCT = 0.07
TAKE_PROFIT_PCT = 0.15
MAX_SINGLE_POSITION_PCT = 0.30
MAX_SECTOR_PCT = 0.60
MIN_CASH_PCT = 0.10
MAX_CONCURRENT_POSITIONS = 5

# Must mirror scripts/sim_executor.py. Keep in sync.
SECTOR_MAP = {
    "Energy":            {"SNP", "SNG", "RRC", "OIL"},
    "Utilities":         {"H2O", "SNN", "TEL", "EL", "TGN", "COTE", "TRANSI", "PE"},
    "Banking":           {"TLV", "BRD"},
    "Real Estate":       {"ONE", "IMP"},
    "Consumer":          {"SFG", "AQ", "WINE", "CFH"},
    "Healthcare":        {"M", "BIO", "ATB"},
    "Industrial":        {"TRP", "CMP", "ALR", "TTS"},
    "Tech/Telecom":      {"DIGI"},
    "Financial Services": {"FP", "BVB", "EVER", "SIF1", "SIF2", "SIF3", "SIF4", "SIF5"},
}

INTENDED_DAYS = {"swing": 15, "event": 56, "trend": 90}

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{s}?interval=1d&range=5d"


def sector_of(symbol: str) -> str:
    for s, syms in SECTOR_MAP.items():
        if symbol in syms:
            return s
    return "Unclassified"


def _read_json(path: str, default: Any) -> Any:
    if not os.path.exists(path):
        return default
    with open(path) as f:
        return json.load(f)


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


def last_entry_for_trade(trades: list[dict], trade_id: str) -> dict | None:
    for t in reversed(trades):
        if t.get("type") == "entry" and t.get("trade_id") == trade_id:
            return t
    return None


def fetch_price(symbol: str) -> float | None:
    yahoo_sym = symbol if "." in symbol else f"{symbol}.RO"
    url = YAHOO_URL.format(s=urllib.parse.quote(yahoo_sym))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[warn] price fetch failed for {symbol}: {e}", file=sys.stderr)
        return None
    r = (data.get("chart") or {}).get("result") or []
    if not r:
        return None
    m = r[0].get("meta") or {}
    closes = [c for c in ((r[0].get("indicators") or {}).get("quote") or [{}])[0].get("close") or [] if c is not None]
    return m.get("regularMarketPrice") or (closes[-1] if closes else None)


def days_held(opened_at: str | None) -> int | None:
    if not opened_at:
        return None
    try:
        dt = datetime.fromisoformat(opened_at.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days
    except ValueError:
        return None


def analyze_position(pos: dict, trades: list[dict]) -> dict:
    price = pos.get("last_price") or pos["avg_cost"]
    cost = pos["avg_cost"]
    peak = pos.get("peak_since_entry", cost)
    trade_type = pos.get("trade_type", "swing")
    trade_id = pos.get("trade_id")

    pnl_pct = (price / cost - 1) * 100 if cost else 0

    # Hard stop distance
    hard_stop_price = cost * (1 - HARD_STOP_PCT)
    distance_to_hard_stop_pct = (price / hard_stop_price - 1) * 100 if hard_stop_price else None

    # Trailing stop (trend rides only by default)
    trailing_stop_price = peak * (1 - TRAILING_STOP_PCT) if trade_type == "trend" else None
    distance_to_trailing_pct = (price / trailing_stop_price - 1) * 100 if trailing_stop_price else None

    # Take profit hit check
    take_profit_hit = pnl_pct >= TAKE_PROFIT_PCT * 100 and trade_type == "swing"

    # Time in trade
    dh = days_held(pos.get("opened_at"))
    intended = INTENDED_DAYS.get(trade_type, 15)
    time_in_trade_ratio = (dh / intended) if (dh is not None and intended) else None

    # Load invalidation conditions from the last entry record for this trade
    entry = last_entry_for_trade(trades, trade_id) if trade_id else None
    invalidation_conditions = entry.get("invalidation_conditions", []) if entry else pos.get("invalidation_conditions", [])

    # Explicit stop-loss override from position overrides the default hard stop
    effective_stop = pos.get("stop_loss", hard_stop_price)

    # Status flags
    flags = []
    if price <= effective_stop:
        flags.append(f"HARD_STOP_HIT (price {price:.3f} <= stop {effective_stop:.3f})")
    elif price <= effective_stop * 1.02:
        flags.append(f"HARD_STOP_NEAR (within 2% of {effective_stop:.3f})")
    if trailing_stop_price and price <= trailing_stop_price:
        flags.append(f"TRAILING_STOP_HIT (price {price:.3f} <= trailing {trailing_stop_price:.3f})")
    if take_profit_hit:
        flags.append(f"TAKE_PROFIT_CANDIDATE (+{pnl_pct:.1f}% vs +{TAKE_PROFIT_PCT*100:.0f}% target)")
    if time_in_trade_ratio and time_in_trade_ratio > 1.0:
        flags.append(f"PAST_EXPECTED_HOLD ({dh}d vs {intended}d intended for {trade_type})")

    return {
        "symbol": pos["symbol"],
        "sector": sector_of(pos["symbol"]),
        "trade_type": trade_type,
        "trade_id": trade_id,
        "theme_tag": pos.get("theme_tag"),
        "engine_managed": pos.get("engine_managed", True),
        "price": price,
        "avg_cost": cost,
        "peak_since_entry": peak,
        "pnl_pct": round(pnl_pct, 2),
        "quantity": pos["quantity"],
        "position_value_ron": round(pos["quantity"] * price, 2),
        "effective_stop_price": round(effective_stop, 3) if effective_stop else None,
        "distance_to_hard_stop_pct": round(distance_to_hard_stop_pct, 2) if distance_to_hard_stop_pct is not None else None,
        "trailing_stop_price": round(trailing_stop_price, 3) if trailing_stop_price else None,
        "distance_to_trailing_pct": round(distance_to_trailing_pct, 2) if distance_to_trailing_pct is not None else None,
        "days_held": dh,
        "intended_days": intended,
        "time_in_trade_ratio": round(time_in_trade_ratio, 2) if time_in_trade_ratio is not None else None,
        "invalidation_conditions": invalidation_conditions,
        "flags": flags,
    }


def analyze_portfolio(state: dict, position_rows: list[dict]) -> dict:
    total_value = state["cash_ron"] + sum(r["position_value_ron"] for r in position_rows)
    cash_pct = (state["cash_ron"] / total_value * 100) if total_value else 100

    per_symbol = {r["symbol"]: r["position_value_ron"] / total_value for r in position_rows} if total_value else {}
    per_sector: dict[str, float] = {}
    for r in position_rows:
        per_sector.setdefault(r["sector"], 0)
        per_sector[r["sector"]] += r["position_value_ron"]
    per_sector_pct = {k: v / total_value * 100 for k, v in per_sector.items()} if total_value else {}

    flags = []
    for sym, w in per_symbol.items():
        if w > MAX_SINGLE_POSITION_PCT:
            flags.append(f"SINGLE_STOCK_CAP_BREACH ({sym} at {w*100:.1f}% > 30%)")
        elif w > MAX_SINGLE_POSITION_PCT * 0.9:
            flags.append(f"SINGLE_STOCK_APPROACHING_CAP ({sym} at {w*100:.1f}%)")
    for sect, pct in per_sector_pct.items():
        if pct > MAX_SECTOR_PCT * 100:
            flags.append(f"SECTOR_CAP_BREACH ({sect} at {pct:.1f}% > 60%)")
        elif pct > MAX_SECTOR_PCT * 100 * 0.9:
            flags.append(f"SECTOR_APPROACHING_CAP ({sect} at {pct:.1f}%)")
    if cash_pct < MIN_CASH_PCT * 100:
        flags.append(f"CASH_RESERVE_BREACH ({cash_pct:.1f}% < 10%)")
    elif cash_pct < MIN_CASH_PCT * 100 * 1.2:
        flags.append(f"CASH_RESERVE_LOW ({cash_pct:.1f}%)")
    if len(position_rows) > MAX_CONCURRENT_POSITIONS:
        flags.append(f"TOO_MANY_POSITIONS ({len(position_rows)} > {MAX_CONCURRENT_POSITIONS})")

    return {
        "total_value_ron": round(total_value, 2),
        "cash_ron": round(state["cash_ron"], 2),
        "cash_pct": round(cash_pct, 2),
        "n_positions": len(position_rows),
        "per_sector_pct": {k: round(v, 2) for k, v in per_sector_pct.items()},
        "top_position": max(per_symbol.items(), key=lambda kv: kv[1])[0] if per_symbol else None,
        "top_position_pct": round(max(per_symbol.values()) * 100, 2) if per_symbol else 0,
        "flags": flags,
    }


def classify_health(position_reports: list[dict], portfolio_report: dict) -> str:
    # RED: any stop hit or cap breach
    for r in position_reports:
        if any(f.startswith("HARD_STOP_HIT") or f.startswith("TRAILING_STOP_HIT") for f in r["flags"]):
            return "RED"
    for f in portfolio_report["flags"]:
        if "BREACH" in f:
            return "RED"
    # YELLOW: anything approaching
    if any(r["flags"] for r in position_reports):
        return "YELLOW"
    if portfolio_report["flags"]:
        return "YELLOW"
    return "GREEN"


def format_text(position_reports: list[dict], portfolio_report: dict, health: str) -> str:
    lines = []
    banner = {"GREEN": "🟢 GREEN", "YELLOW": "🟡 YELLOW", "RED": "🔴 RED"}[health]
    lines.append(f"🛡️  RISK REPORT — {datetime.now(timezone.utc).date().isoformat()}   [{banner}]")
    lines.append("=" * 72)
    lines.append(f"Cash: {portfolio_report['cash_ron']:.2f} RON ({portfolio_report['cash_pct']:.1f}%)  "
                 f"Total: {portfolio_report['total_value_ron']:.2f} RON  "
                 f"Positions: {portfolio_report['n_positions']}")
    if portfolio_report["per_sector_pct"]:
        sectors = ", ".join(f"{k} {v:.1f}%" for k, v in sorted(portfolio_report["per_sector_pct"].items(), key=lambda kv: -kv[1]))
        lines.append(f"Sectors: {sectors}")

    lines.append("")
    lines.append("POSITIONS")
    lines.append(f"{'SYM':<6} {'QTY':>4} {'COST':>8} {'NOW':>8} {'P&L%':>6} {'WGT%':>6} {'STOP':>8} {'∆STOP%':>7} {'HELD':>5}  FLAGS")
    for r in position_reports:
        wgt = r["position_value_ron"] / portfolio_report["total_value_ron"] * 100 if portfolio_report["total_value_ron"] else 0
        flags = " | ".join(r["flags"]) if r["flags"] else "-"
        lines.append(
            f"{r['symbol']:<6} {r['quantity']:>4} {r['avg_cost']:>8.3f} {r['price']:>8.3f} "
            f"{r['pnl_pct']:>6.2f} {wgt:>6.1f} "
            f"{(r['effective_stop_price'] or 0):>8.3f} "
            f"{(r['distance_to_hard_stop_pct'] or 0):>7.2f} "
            f"{(r['days_held'] if r['days_held'] is not None else '-'):>5}  {flags}"
        )

    # Invalidation conditions (prompted to the agent to check)
    any_ic = any(r["invalidation_conditions"] for r in position_reports)
    if any_ic:
        lines.append("")
        lines.append("INVALIDATION CONDITIONS (agent must evaluate each against current state)")
        for r in position_reports:
            if r["invalidation_conditions"]:
                lines.append(f"  {r['symbol']} [{r['trade_id']}]:")
                for i, c in enumerate(r["invalidation_conditions"], 1):
                    lines.append(f"    {i}. {c}")

    if portfolio_report["flags"]:
        lines.append("")
        lines.append("PORTFOLIO-LEVEL FLAGS")
        for f in portfolio_report["flags"]:
            lines.append(f"  • {f}")

    return "\n".join(lines)


def main() -> int:
    p = argparse.ArgumentParser(description="Risk report for the current portfolio")
    p.add_argument("--format", choices=["text", "json"], default="text")
    p.add_argument("--refresh-prices", action="store_true",
                   help="Re-fetch current prices before analysis (default: use last_price in state.json)")
    args = p.parse_args()

    state = _read_json(STATE_PATH, None)
    if state is None:
        print(f"error: {STATE_PATH} not found", file=sys.stderr)
        return 2

    trades = _read_jsonl(TRADES_PATH)

    if args.refresh_prices:
        for pos in state["positions"]:
            new_price = fetch_price(pos["symbol"])
            if new_price:
                pos["last_price"] = new_price

    position_reports = [analyze_position(p, trades) for p in state["positions"]]
    portfolio_report = analyze_portfolio(state, position_reports)
    health = classify_health(position_reports, portfolio_report)

    if args.format == "json":
        out = {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "health": health,
            "portfolio": portfolio_report,
            "positions": position_reports,
        }
        print(json.dumps(out, indent=2, ensure_ascii=False))
    else:
        print(format_text(position_reports, portfolio_report, health))

    return {"GREEN": 0, "YELLOW": 1, "RED": 2}[health]


if __name__ == "__main__":
    sys.exit(main())
