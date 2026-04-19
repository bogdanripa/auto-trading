#!/usr/bin/env python3
"""
FIFO cost basis + realized gain/loss for Declarația Unică.

Reads portfolio/fills.jsonl (the authoritative trade record) and produces:
    - per-sell realized gain/loss in RON (FIFO matching)
    - annual summary grouped by symbol and year
    - total net gain/loss and estimated 10% tax

Standard library only.

Usage:
    python3 scripts/tax_fifo.py                     # all time, summary to stdout
    python3 scripts/tax_fifo.py --year 2026         # single year
    python3 scripts/tax_fifo.py --detail            # print every sell's match
    python3 scripts/tax_fifo.py --format=json       # machine-readable

Romanian tax rules applied:
    - 10% capital gains tax on net realized gains
    - Losses within the same year offset gains
    - Losses that exceed gains in a year carry forward up to 70% of next year
      (NOT implemented here — flagged for user to handle manually per year)
"""

import argparse
import json
import os
import sys
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any

PORTFOLIO_DIR = os.environ.get("PORTFOLIO_DIR", "portfolio")
FILLS_PATH = os.path.join(PORTFOLIO_DIR, "fills.jsonl")

TAX_RATE_CAPITAL_GAINS = 0.10


@dataclass
class Lot:
    """One open buy lot awaiting matching against future sells."""
    fill_id: str
    date: str
    quantity: int
    unit_cost: float       # per-share RON, commission included
    trade_id: str | None = None


@dataclass
class RealizedMatch:
    sell_fill_id: str
    sell_date: str
    buy_fill_id: str
    buy_date: str
    symbol: str
    quantity: int
    buy_unit_cost: float
    sell_unit_price: float
    sell_commission_share: float
    gain_ron: float


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


def compute_fifo(fills: list[dict]) -> tuple[list[RealizedMatch], dict[str, list[Lot]]]:
    """Process fills chronologically, FIFO-match sells to buys.

    Returns (realized_matches, open_lots_by_symbol).
    """
    fills_sorted = sorted(fills, key=lambda f: f.get("filled_at", ""))
    open_lots: dict[str, deque[Lot]] = defaultdict(deque)
    realized: list[RealizedMatch] = []

    for f in fills_sorted:
        sym = f["symbol"]
        action = f["action"]
        qty = int(f["quantity"])
        price = float(f["fill_price"])
        commission = float(f.get("commission_ron", 0))
        fill_id = f.get("fill_id") or f.get("order_id") or f"{f.get('filled_at','?')}-{sym}-{action}"
        filled_at = f.get("filled_at", "")

        if action == "BUY":
            # unit cost includes buy-side commission distributed per share
            unit_cost = (qty * price + commission) / qty
            open_lots[sym].append(Lot(
                fill_id=fill_id,
                date=filled_at[:10],
                quantity=qty,
                unit_cost=unit_cost,
                trade_id=f.get("trade_id"),
            ))
        elif action == "SELL":
            remaining = qty
            # distribute sell-side commission across the shares sold
            comm_per_share = commission / qty if qty else 0.0
            lots = open_lots[sym]
            while remaining > 0 and lots:
                lot = lots[0]
                take = min(remaining, lot.quantity)
                gain = take * (price - lot.unit_cost - comm_per_share)
                realized.append(RealizedMatch(
                    sell_fill_id=fill_id,
                    sell_date=filled_at[:10],
                    buy_fill_id=lot.fill_id,
                    buy_date=lot.date,
                    symbol=sym,
                    quantity=take,
                    buy_unit_cost=lot.unit_cost,
                    sell_unit_price=price,
                    sell_commission_share=comm_per_share * take,
                    gain_ron=round(gain, 2),
                ))
                lot.quantity -= take
                remaining -= take
                if lot.quantity == 0:
                    lots.popleft()
            if remaining > 0:
                print(f"[warn] sell for {sym} on {filled_at} exceeds open lots by {remaining}; short-sale or reconciliation bug", file=sys.stderr)

    return realized, {k: list(v) for k, v in open_lots.items() if v}


def summarize_year(matches: list[RealizedMatch], year: int) -> dict[str, Any]:
    year_str = str(year)
    year_matches = [m for m in matches if m.sell_date.startswith(year_str)]

    by_symbol: dict[str, dict] = {}
    for m in year_matches:
        b = by_symbol.setdefault(m.symbol, {"gains": 0.0, "losses": 0.0, "n_trades": 0})
        if m.gain_ron >= 0:
            b["gains"] += m.gain_ron
        else:
            b["losses"] += -m.gain_ron
        b["n_trades"] += 1

    total_gains = sum(b["gains"] for b in by_symbol.values())
    total_losses = sum(b["losses"] for b in by_symbol.values())
    net = total_gains - total_losses

    return {
        "year": year,
        "by_symbol": {s: {"gains_ron": round(v["gains"], 2),
                          "losses_ron": round(v["losses"], 2),
                          "net_ron": round(v["gains"] - v["losses"], 2),
                          "n_matched_sells": v["n_trades"]}
                      for s, v in sorted(by_symbol.items())},
        "totals": {
            "total_gains_ron": round(total_gains, 2),
            "total_losses_ron": round(total_losses, 2),
            "net_ron": round(net, 2),
            "estimated_tax_ron": round(max(net, 0) * TAX_RATE_CAPITAL_GAINS, 2),
            "loss_carryforward_if_negative": round(-net * 0.70, 2) if net < 0 else 0.0,
        },
    }


def format_text(summary: dict[str, Any], detail: bool, matches: list[RealizedMatch]) -> str:
    lines = []
    year = summary["year"]
    lines.append(f"DECLARAȚIA UNICĂ — Realized capital gains/losses ({year})")
    lines.append("=" * 60)
    lines.append(f"{'SYMBOL':<8} {'GAINS':>12} {'LOSSES':>12} {'NET':>12} {'#SELLS':>7}")
    for sym, row in summary["by_symbol"].items():
        lines.append(f"{sym:<8} {row['gains_ron']:>12.2f} {row['losses_ron']:>12.2f} {row['net_ron']:>12.2f} {row['n_matched_sells']:>7}")
    lines.append("-" * 60)
    t = summary["totals"]
    lines.append(f"{'TOTAL':<8} {t['total_gains_ron']:>12.2f} {t['total_losses_ron']:>12.2f} {t['net_ron']:>12.2f}")
    lines.append("")
    lines.append(f"Net realized: {t['net_ron']:.2f} RON")
    if t["net_ron"] > 0:
        lines.append(f"Estimated tax (10%): {t['estimated_tax_ron']:.2f} RON")
    else:
        lines.append(f"Loss year — up to {t['loss_carryforward_if_negative']:.2f} RON "
                     f"carries forward (70% cap) to offset next year's gains.")

    if detail:
        lines.append("")
        lines.append("DETAIL — FIFO matches (sell → matched buy):")
        lines.append(f"{'SELL_DATE':<12} {'SYM':<6} {'QTY':>4} {'BUY@':>8} {'SELL@':>8} {'GAIN':>10} {'BUY_DATE':<12}")
        year_matches = [m for m in matches if m.sell_date.startswith(str(year))]
        for m in sorted(year_matches, key=lambda x: (x.sell_date, x.symbol)):
            lines.append(f"{m.sell_date:<12} {m.symbol:<6} {m.quantity:>4} "
                         f"{m.buy_unit_cost:>8.3f} {m.sell_unit_price:>8.3f} "
                         f"{m.gain_ron:>10.2f} {m.buy_date:<12}")

    return "\n".join(lines)


def main() -> int:
    p = argparse.ArgumentParser(description="FIFO realized gain/loss for Declarația Unică")
    p.add_argument("--year", type=int, help="Year to summarize (default: current year)")
    p.add_argument("--detail", action="store_true", help="Show per-match detail")
    p.add_argument("--format", choices=["text", "json"], default="text")
    p.add_argument("--fills", default=FILLS_PATH, help="Path to fills.jsonl")
    args = p.parse_args()

    if not os.path.exists(args.fills):
        print(f"no fills file at {args.fills}", file=sys.stderr)
        return 2

    fills = _read_jsonl(args.fills)
    if not fills:
        print("no fills recorded yet", file=sys.stderr)
        if args.format == "json":
            print(json.dumps({"year": args.year, "by_symbol": {}, "totals": {}}, indent=2))
        return 0

    realized, open_lots = compute_fifo(fills)

    if args.year is None:
        # default to max year seen in sell dates, else current year
        years = {m.sell_date[:4] for m in realized if m.sell_date}
        args.year = int(max(years)) if years else 2026

    summary = summarize_year(realized, args.year)
    summary["open_lots_remaining"] = {
        sym: [{"date": l.date, "qty": l.quantity, "unit_cost": round(l.unit_cost, 4)} for l in lots]
        for sym, lots in open_lots.items()
    }

    if args.format == "json":
        payload = {"summary": summary}
        if args.detail:
            payload["matches"] = [m.__dict__ for m in realized if m.sell_date.startswith(str(args.year))]
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        print(format_text(summary, args.detail, realized))

    return 0


if __name__ == "__main__":
    sys.exit(main())
