#!/usr/bin/env python3
"""
Fetch Yahoo Finance OHLCV for BVB symbols and compute technical indicators.

Standard library only — runs anywhere Python 3.8+ is available.

Usage:
    python3 scripts/indicators.py SNG TLV BRD
    python3 scripts/indicators.py --symbols-file universe.txt
    python3 scripts/indicators.py --format=json SNG H2O   # machine-readable
    python3 scripts/indicators.py --format=table SNG H2O  # human-readable

Exit codes:
    0 — all requested symbols returned data
    1 — at least one symbol had no data (partial output still written)
    2 — fatal (bad args, network totally dead, etc.)
"""

import argparse
import json
import sys
import urllib.parse
import urllib.request
from typing import Any

YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=100d"
STOOQ_CSV = "https://stooq.com/q/d/l/?s={sym}.ro&i=d"

UA = "Mozilla/5.0"


def fetch_yahoo(symbol: str) -> dict[str, Any] | None:
    url = YAHOO_CHART.format(sym=urllib.parse.quote(symbol))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[warn] yahoo fetch failed for {symbol}: {e}", file=sys.stderr)
        return None
    result = (data.get("chart") or {}).get("result") or []
    if not result:
        return None
    return result[0]


def rsi_wilder(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    gains = losses = 0.0
    for i in range(-period, 0):
        delta = closes[i] - closes[i - 1]
        if delta > 0:
            gains += delta
        else:
            losses += -delta
    avg_gain = gains / period
    avg_loss = losses / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - 100.0 / (1.0 + rs)


def sma(values: list[float], window: int) -> float | None:
    if len(values) < window:
        return None
    return sum(values[-window:]) / window


def atr_pct(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    trs = []
    for i in range(-period, 0):
        h, l, pc = highs[i], lows[i], closes[i - 1]
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    atr = sum(trs) / period
    return atr / closes[-1] * 100


def trend_label(price: float, sma20: float | None, sma50: float | None) -> str:
    if sma50 is None:
        return "unknown"
    if price > sma50 and (sma20 is None or sma20 > sma50):
        return "up"
    if price < sma50:
        return "down"
    return "range"


def compute(symbol: str) -> dict[str, Any] | None:
    raw = fetch_yahoo(symbol)
    if raw is None:
        return None
    meta = raw.get("meta") or {}
    quote = ((raw.get("indicators") or {}).get("quote") or [{}])[0]

    closes = [c for c in (quote.get("close") or []) if c is not None]
    highs = [h for h in (quote.get("high") or []) if h is not None]
    lows = [l for l in (quote.get("low") or []) if l is not None]
    vols = [v for v in (quote.get("volume") or []) if v is not None]

    if not closes:
        return None

    # align arrays — sometimes close/high/low have different None positions.
    # simplest safe approach: trim to common length from the right.
    n = min(len(closes), len(highs), len(lows))
    closes, highs, lows = closes[-n:], highs[-n:], lows[-n:]
    if len(vols) > n:
        vols = vols[-n:]

    price = meta.get("regularMarketPrice") or closes[-1]
    # chartPreviousClose is the close BEFORE the range window starts, not yesterday.
    # Use the second-to-last close in the quote array for true day-over-day change.
    prev_close = closes[-2] if len(closes) >= 2 else meta.get("chartPreviousClose")

    sma20 = sma(closes, 20)
    sma50 = sma(closes, 50)
    sma200 = sma(closes, 200)

    # volume ratio — today's volume vs 20d average
    avg_vol20 = (sum(vols[-20:]) / 20) if len(vols) >= 20 else None
    today_vol = vols[-1] if vols else None
    vol_ratio = (today_vol / avg_vol20) if (avg_vol20 and today_vol is not None) else None

    h20 = max(highs[-20:]) if len(highs) >= 20 else None
    l20 = min(lows[-20:]) if len(lows) >= 20 else None

    return {
        "symbol": symbol,
        "price": price,
        "prev_close": prev_close,
        "daily_change_pct": ((price - prev_close) / prev_close * 100) if (prev_close and price) else None,
        "rsi14": rsi_wilder(closes),
        "sma20": sma20,
        "sma50": sma50,
        "sma200": sma200,
        "atr14_pct": atr_pct(highs, lows, closes),
        "volume_today": today_vol,
        "volume_avg20": avg_vol20,
        "volume_ratio": vol_ratio,
        "high_20d": h20,
        "low_20d": l20,
        "high_52w": meta.get("fiftyTwoWeekHigh"),
        "low_52w": meta.get("fiftyTwoWeekLow"),
        "trend": trend_label(price, sma20, sma50),
        "currency": meta.get("currency"),
        "exchange": meta.get("exchangeName"),
        "n_bars": len(closes),
    }


def format_table(rows: list[dict[str, Any]]) -> str:
    header = f"{'SYM':<6} {'PRICE':>9} {'CHG%':>6} {'RSI14':>6} {'SMA20':>9} {'SMA50':>9} {'TREND':>7} {'VOL×':>5} {'20dH':>9} {'20dL':>9} {'52wH':>9} {'ATR%':>5}"
    lines = [header, "-" * len(header)]
    for r in rows:
        if not r:
            continue
        def fmt(v, w, d=2):
            if v is None:
                return " " * (w - 1) + "-"
            return f"{v:>{w}.{d}f}"
        lines.append(
            f"{r['symbol']:<6} "
            f"{fmt(r['price'], 9, 3)} "
            f"{fmt(r.get('daily_change_pct'), 6, 2)} "
            f"{fmt(r['rsi14'], 6, 1)} "
            f"{fmt(r['sma20'], 9, 3)} "
            f"{fmt(r['sma50'], 9, 3)} "
            f"{r['trend']:>7} "
            f"{fmt(r['volume_ratio'], 5, 1)} "
            f"{fmt(r['high_20d'], 9, 3)} "
            f"{fmt(r['low_20d'], 9, 3)} "
            f"{fmt(r['high_52w'], 9, 3)} "
            f"{fmt(r['atr14_pct'], 5, 1)}"
        )
    return "\n".join(lines)


def main() -> int:
    p = argparse.ArgumentParser(description="Compute BVB technical indicators from Yahoo Finance")
    p.add_argument("symbols", nargs="*", help="BVB tickers (e.g. SNG TLV BRD). Appends '.RO' automatically.")
    p.add_argument("--symbols-file", help="Read tickers from file, one per line")
    p.add_argument("--format", choices=["json", "table"], default="json", help="Output format")
    p.add_argument("--suffix", default=".RO", help="Exchange suffix to append (default: .RO)")
    args = p.parse_args()

    symbols: list[str] = list(args.symbols)
    if args.symbols_file:
        with open(args.symbols_file) as f:
            symbols.extend(line.strip() for line in f if line.strip() and not line.startswith("#"))

    if not symbols:
        print("error: no symbols given (positional args or --symbols-file)", file=sys.stderr)
        return 2

    rows: list[dict[str, Any] | None] = []
    for sym in symbols:
        yahoo_sym = sym if "." in sym else f"{sym}{args.suffix}"
        r = compute(yahoo_sym)
        if r:
            r["symbol"] = sym  # report the bare ticker for downstream use
        rows.append(r)

    any_missing = any(r is None for r in rows)

    if args.format == "json":
        print(json.dumps([r for r in rows if r], indent=2))
    else:
        print(format_table([r for r in rows if r]))

    missing = [sym for sym, r in zip(symbols, rows) if r is None]
    if missing:
        print(f"\n[warn] no data for: {', '.join(missing)}", file=sys.stderr)

    return 1 if any_missing else 0


if __name__ == "__main__":
    sys.exit(main())
