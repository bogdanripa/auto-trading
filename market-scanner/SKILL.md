---
name: market-scanner
description: Technical scan of the BET-Plus universe — computes RSI, moving averages, volume ratios, breakout levels, and trend direction from real price data, then ranks setups for entries and exits. Run this every morning after macro-analyst and bvb-news so the synthesis step has a concrete list of candidates. Uses Yahoo Finance OHLCV as the primary data source. Trigger whenever a technical scan is needed, or when evaluating a specific name's setup quality.
---

# Market Scanner

Quantitative scan over the BET-Plus universe. Fetches OHLCV, computes indicators, grades setups. No guesswork on current prices — always pulled fresh from Yahoo.

## Universe (BET-Plus constituents)

Primary (BET, high liquidity):
`SNG, TLV, BRD, SNP, TGN, H2O, SNN, FP, DIGI, ONE, SFG, TRP, WINE, AQ, COTE, TEL, M, EL, BVB, ROCE`

Extended (BET-Plus, thinner liquidity — be cautious on sizing):
`ALR, ATB, BIO, CMP, IMP, LION, OIL, PPL, RRC, SIF1, SIF3, SIF5, STZ, TRANSI, UCM, EVER`

Skip any symbol where 20-day average daily value traded (ADV) < 50,000 RON (PROJECT.md rule).

## Price Data & Indicators

Call the committed script rather than regenerating the math:

```
python3 scripts/indicators.py --format=json SNG TLV BRD SNP TGN H2O SNN FP DIGI ONE SFG TRP WINE AQ COTE TEL M EL BVB ROCE
```

Returns a JSON array, one object per symbol, with:
- `price`, `daily_change_pct`
- `rsi14`, `sma20`, `sma50`, `sma200`
- `volume_today`, `volume_avg20`, `volume_ratio`
- `high_20d`, `low_20d`, `high_52w`, `low_52w`
- `atr14_pct`
- `trend` — one of `up | down | range`
- `n_bars` — how many daily bars were available

The script fetches from Yahoo Finance (`query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>.RO`) and computes all indicators in Python using the stdlib. Any per-symbol fetch failures are reported on stderr with `[warn]`; successful symbols still appear in the JSON. Exit code is 1 if any symbol was missing data, 0 if all succeeded.

**Indicator definitions (for reference / audit — the script is the source of truth):**
- RSI(14) — Wilder's original (no smoothing)
- SMA(n) — simple mean of last n closes
- ATR(14)% — ATR / current close × 100
- Volume ratio — today's volume / 20-day average
- Trend: `up` if close > SMA50 and (SMA20 ≥ SMA50); `down` if close < SMA50; else `range`

## Setup Grading

### A-grade (highest conviction — ≥1 match = flag)
- **Breakout:** close > 20-day high AND volume ratio > 2.0 AND trend = uptrend
- **Pullback to trend:** trend = uptrend AND close within 2% of SMA50 AND RSI between 40-55 AND volume ratio ≥ 0.8
- **Oversold within uptrend:** trend = uptrend AND RSI(14) < 30 AND close > SMA200 — rare, strong when present

### B-grade (good but needs confirmation)
- **RSI oversold (no trend filter):** RSI < 30 AND last 5 days include at least one up-close — possible mean reversion
- **Volume anomaly:** volume ratio > 3.0 AND close up on the day — someone is accumulating
- **Higher low on RSI:** price lower low vs 10 days ago, RSI higher low — divergence

### C-grade (watchlist only, no trade today)
- **Approaching support:** trend = uptrend AND price within 3% above SMA50 but not yet touching
- **Coiling:** 20-day range compressed to < 6% of price, volume declining — breakout pending
- **Base forming after downtrend:** close > SMA20 for 5+ consecutive days after a downtrend

### Sell / exit signals (for current positions)
- **Trailing stop hit:** current price < (peak_since_entry × 0.93) for trend rides
- **Hard stop hit:** current price < entry_price × 0.90 (PROJECT.md default, may be overridden per LESSONS.md)
- **Take profit trigger:** current price > entry_price × 1.20 for swing trades unless volume ratio still > 1.5 (momentum accelerating — hand off to synthesis for decision)
- **Overbought exhaustion:** RSI > 75 with MACD histogram declining 3 consecutive days
- **Break of trend:** trend was `uptrend`, today close < SMA50 on volume ratio > 1.0 — trend compromised

## Position Sizing Hint

For each A or B setup, compute a suggested initial stop based on ATR:
- Initial stop = entry × (1 - max(0.10, 2 × ATR%))

This respects the PROJECT.md 10% minimum stop but widens for high-ATR names (financials, small caps) where 10% is inside daily noise.

## Dividend Awareness

Cross-check the upcoming events list from `bvb-news`. If a holding has ex-dividend in the next 2 trading days, the expected ex-dividend drop is NOT a sell signal — flag it explicitly so the exit logic doesn't trigger on the mechanical gap.

## Output Format

```
🔭 MARKET SCAN — [DATE]

A-GRADE SETUPS (ranked by conviction)
  [SYMBOL] [setup_type]  price [X] RON  RSI [Y]  vol [Z]x
    Entry zone: [range]  Stop: [price] (-X%)  Target: [price] (+X%)
    Notes: [1 sentence]

B-GRADE SETUPS
  [same format]

WATCHLIST (C-grade, might trigger this week)
  [SYMBOL]: [what needs to happen to upgrade]

EXIT ALERTS (current positions)
  [SYMBOL]: [signal] — handing to risk-monitor for decision
  or
  (no exit signals)

SKIPPED (illiquid or no data)
  [SYMBOL]: [reason]
```

## BVB Operational Rules

- BVB open: 10:00 EET, close: 17:45 EET. Pre-open auction 09:45-10:00.
- Yahoo data may lag 15-20 min during RTH. Use for end-of-day analysis, not live tick decisions.
- Daily price variation limit: ±15% (tunnel). Symbols at the limit are suspended — don't attempt to trade.
- Many BVB names trade in "waves" — weeks of flat, then a 10-15% move in days. Breakout signals are rarer than on US names but often cleaner.
- January-April sees dividend-driven flows. Ex-dividend drops are mechanical; don't confuse with sell signals.

## Failure Handling

- Yahoo returns no data for a symbol → try Stooq fallback `https://stooq.com/q/d/l/?s=<symbol>.ro&i=d&d1=<YYYYMMDD_start>&d2=<YYYYMMDD_end>` (CSV format)
- Both fail → log the symbol as unavailable for this run. Do not fabricate a signal.
- Entire universe data fails → output a "scanner degraded" banner; synthesis should not initiate new trades without price data.

## Caching

Same pattern as news/macro — in-memory cache for the run only. Do not persist between runs; the next routine fires hours later and needs fresh data.
