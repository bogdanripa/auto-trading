#!/usr/bin/env python3
"""
Deterministic statistics over journal/trades.jsonl for the retrospective skill.

Pairs entry/exit records by trade_id and computes per-group win rates, avg P&L,
and expectancy. Groups by trade_type, theme_tag, sector, exit_reason, conviction
bucket, and the (catalyst_occurred × mechanism_worked) failure-mode grid.

Standard library only.

Usage:
    python3 scripts/journal_stats.py                    # all-time
    python3 scripts/journal_stats.py --window 7d        # last 7 days
    python3 scripts/journal_stats.py --window 30d       # last 30
    python3 scripts/journal_stats.py --since 2026-01-01
    python3 scripts/journal_stats.py --format=json

Exit codes:
    0 — stats produced
    1 — no closed trades in the window
    2 — fatal (file missing, bad arg)
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

JOURNAL_DIR = os.environ.get("JOURNAL_DIR", "journal")
TRADES_PATH = os.path.join(JOURNAL_DIR, "trades.jsonl")

CONVICTION_BUCKETS = [(0, 4, "low"), (5, 7, "mid"), (8, 10, "high")]


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


def parse_window(window: str | None, since: str | None) -> datetime | None:
    if since:
        return datetime.fromisoformat(since).replace(tzinfo=timezone.utc)
    if not window:
        return None
    if window.endswith("d"):
        days = int(window[:-1])
        return datetime.now(timezone.utc) - timedelta(days=days)
    if window.endswith("w"):
        weeks = int(window[:-1])
        return datetime.now(timezone.utc) - timedelta(weeks=weeks)
    raise ValueError(f"unrecognized --window format: {window}")


def pair_trades(records: list[dict]) -> list[dict]:
    """Return closed trades: entry merged with its exit record."""
    entries: dict[str, dict] = {}
    pairs = []
    for r in records:
        tid = r.get("trade_id")
        if not tid:
            continue
        if r.get("type") == "entry":
            entries[tid] = r
        elif r.get("type") == "exit":
            entry = entries.get(tid)
            if not entry:
                continue  # unmatched exit; skip
            pairs.append({"entry": entry, "exit": r, "trade_id": tid})
    return pairs


def conviction_bucket(c: int | None) -> str:
    if c is None:
        return "unknown"
    for lo, hi, label in CONVICTION_BUCKETS:
        if lo <= c <= hi:
            return label
    return "unknown"


def compute_cluster_stats(pairs: list[dict]) -> dict:
    if not pairs:
        return {"count": 0}
    pnls = [p["exit"].get("pnl_pct", 0) for p in pairs]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    n = len(pairs)
    win_rate = len(wins) / n if n else 0
    avg_win = sum(wins) / len(wins) if wins else 0
    avg_loss = sum(losses) / len(losses) if losses else 0
    expectancy = win_rate * avg_win + (1 - win_rate) * avg_loss
    days_held = [p["exit"].get("days_held") for p in pairs if p["exit"].get("days_held") is not None]
    return {
        "count": n,
        "win_rate_pct": round(win_rate * 100, 1),
        "avg_pnl_pct": round(sum(pnls) / n, 2),
        "median_pnl_pct": round(sorted(pnls)[n // 2], 2),
        "avg_win_pct": round(avg_win, 2),
        "avg_loss_pct": round(avg_loss, 2),
        "expectancy_pct": round(expectancy, 2),
        "avg_days_held": round(sum(days_held) / len(days_held), 1) if days_held else None,
        "trade_ids": [p["trade_id"] for p in pairs[:10]],  # cap list to avoid bloat
    }


def group_by(pairs: list[dict], key_fn) -> dict[Any, list[dict]]:
    groups: dict[Any, list[dict]] = defaultdict(list)
    for p in pairs:
        key = key_fn(p)
        groups[key].append(p)
    return groups


def main() -> int:
    p = argparse.ArgumentParser(description="Deterministic stats over journal/trades.jsonl")
    p.add_argument("--window", help="Time window: Nd (days) or Nw (weeks). Exit date must fall in window.")
    p.add_argument("--since", help="ISO date (YYYY-MM-DD); exit on or after this date.")
    p.add_argument("--format", choices=["text", "json"], default="text")
    p.add_argument("--trades", default=TRADES_PATH)
    args = p.parse_args()

    records = _read_jsonl(args.trades)
    if not records:
        print("no journal entries", file=sys.stderr)
        return 2

    window_start = parse_window(args.window, args.since)
    pairs = pair_trades(records)

    if window_start:
        def in_window(p):
            ts = p["exit"].get("timestamp", "")
            try:
                t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                return t >= window_start
            except ValueError:
                return False
        pairs = [p for p in pairs if in_window(p)]

    if not pairs:
        print("no closed trades in window", file=sys.stderr)
        return 1

    overall = compute_cluster_stats(pairs)

    groups = {
        "by_trade_type": {k: compute_cluster_stats(v) for k, v in group_by(
            pairs, lambda p: p["entry"].get("trade_type", "unknown")
        ).items()},
        "by_theme_tag": {k or "untagged": compute_cluster_stats(v) for k, v in group_by(
            pairs, lambda p: p["entry"].get("theme_tag")
        ).items()},
        "by_sector": {k: compute_cluster_stats(v) for k, v in group_by(
            pairs, lambda p: p["entry"].get("sector") or p["exit"].get("sector") or "unknown"
        ).items()},
        "by_exit_reason": {k: compute_cluster_stats(v) for k, v in group_by(
            pairs, lambda p: p["exit"].get("exit_reason", "unknown")
        ).items()},
        "by_conviction": {k: compute_cluster_stats(v) for k, v in group_by(
            pairs, lambda p: conviction_bucket(p["entry"].get("conviction"))
        ).items()},
        "by_failure_mode": {
            f"{c}|{m}": compute_cluster_stats(v)
            for (c, m), v in group_by(
                pairs,
                lambda p: (p["exit"].get("catalyst_occurred", "unknown"),
                           p["exit"].get("mechanism_worked", "unknown"))
            ).items()
        },
    }

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "window": args.window or args.since or "all-time",
        "n_closed": len(pairs),
        "overall": overall,
        "groups": groups,
    }

    if args.format == "json":
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    # text output
    lines = []
    lines.append(f"📊 JOURNAL STATS — window: {payload['window']}   closed trades: {payload['n_closed']}")
    lines.append("=" * 72)
    lines.append(f"Overall: win {overall['win_rate_pct']}%  avg {overall['avg_pnl_pct']}%  "
                 f"expectancy {overall['expectancy_pct']}%  avg days held {overall['avg_days_held']}")
    for group_name, rows in groups.items():
        lines.append("")
        lines.append(f"-- {group_name} --")
        for key, r in sorted(rows.items(), key=lambda kv: -kv[1]["count"]):
            lines.append(f"  {str(key):<40} n={r['count']:>3}  win {r['win_rate_pct']:>5}%  "
                         f"avg {r['avg_pnl_pct']:>6.2f}%  exp {r['expectancy_pct']:>6.2f}%")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
