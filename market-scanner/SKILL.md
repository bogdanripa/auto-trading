---
name: market-scanner
description: Technical scan of the BET-Plus universe — computes RSI, moving averages, volume ratios, breakout levels, and trend direction from real price data, then ranks setups for entries and exits. Run this every morning after macro-analyst and bvb-news so the synthesis step has a concrete list of candidates. Uses Yahoo Finance OHLCV as the primary data source. Trigger whenever a technical scan is needed, or when evaluating a specific name's setup quality.
---

# Market Scanner

Quantitative scan over the BET-Plus universe. Fetches OHLCV, computes indicators, grades setups. No guesswork on current prices — always pulled fresh from Yahoo.

## Universe (BET-Plus constituents)

Organized in two tiers to match the BVB index structure (~37 names in BET-Plus; we cover ~39, with a couple of legacy tickers kept for historical continuity):

**Tier A — BET core (20 names, main index, high liquidity):**
`TLV, SNP, SNG, H2O, TGN, BRD, DIGI, EL, M, SNN, TEL, PE, FP, ONE, AQ, TRP, TTS, ATB, SFG, CFH`

Where:
- **PE** — Premier Energy (Utilities). IPO'd on BVB 2024.
- **TTS** — Transport Trade Services (Industrial / logistics / Constanta port).
- **CFH** — Cris-Tim Family Holding (Consumer / food, entrepreneurial). IPO'd Nov 2025.
- **ATB** — Antibiotice (Healthcare). Promoted from extended tier to BET core to match current BET composition.

**Tier B — BET-Plus beyond BET (decent liquidity, thinner names):**
`WINE, COTE, BVB, ROCE, ALR, BIO, CMP, IMP, LION, OIL, PPL, RRC, SIF1, SIF3, SIF5, STZ, TRANSI, UCM, EVER`

Skip any symbol where 20-day average daily value traded (ADV) < 50,000 RON (PROJECT.md rule). Whenever BVB announces a BET index reshuffle, cross-check this list against the updated composition at `https://bvb.ro/FinancialInstruments/Indices/IndicesProfiles.aspx?i=BET-PLUS` and propose a diff in the morning briefing.

## Price Data & Indicators

Call the committed script rather than regenerating the math:

```
node scripts/indicators.mjs --format=json TLV SNP SNG H2O TGN BRD DIGI EL M SNN TEL PE FP ONE AQ TRP TTS ATB SFG CFH
```

(Scan the BET core first. Run Tier B only if the core produces fewer than 3 A-grade setups or if a Tier B name has a specific catalyst today.)

Returns a JSON array, one object per symbol, with:
- `price`, `daily_change_pct`
- `rsi14`, `sma20`, `sma50`, `sma200`
- `volume_today`, `volume_avg20`, `volume_ratio`
- `adv20_ron` — 20-day average daily value traded in RON (shared liquidity denominator used by company-analyst's liquidity gate, trade-executor's participation check, and risk-monitor's exit-velocity metric)
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

## Sector Beta Notes (from `macro-analyst/references/bvb-historical-patterns.md`)

Sector-specific priors the scanner should weight when grading setups. These override intuitive assumptions — several historical correlations have broken.

**Energy (SNP, SNG, TGN, RRC, OIL):**
- SNP-Brent correlation **0.60-0.75** (strong, linear). Brent +4% / day → `COM-1` long SNP trade (+2-3% / 1 day).
- SNG-TTF correlation **broke post-OUG 27/2022**: was 0.70, now ~0.30. Don't size SNG on TTF alone.
- Regulatory shock is the dominant tail risk — fiscal-ordinance leaks (`POL-1`) drop energy names -5 to -15% same-day.
- SNP removed from FTSE All Cap Feb 2026 (12-month passive-flow headwind).

**Banking (TLV, BRD):**
- Rate-cycle sensitivity is dominant. Each 100bp NBR move → ~8-12% re-rate over 2-3 months.
- Bank-specific fiscal shocks (turnover tax) are the idiosyncratic tail: Law 296/2023 (2%) and Law 141/2025 (4%) each produced 5-10% drawdowns.
- TLV higher-beta growth; BRD more defensive with SG-parent Stoxx Banks beta ~0.6.
- In global banking stress (SVB/CS template), RO banks -7 to -10%, **recover faster** than Austrian cross-border banks.

**Utilities (H2O, SNN, TEL, EL, TGN, COTE, TRANSI, PE):**
- H2O: 100% payout, dividend proxy; hydrology-sensitive (`COM-3` drought short). ~15.7% of BET weight.
- TEL: Jan 1 ANRE tariff reset; June 2024 +40% system services hike → +7.35% single day.
- TGN: Oct ANRE reset; +233% YoY to April 2026 on post-cap regulatory reset + BRUA + Neptun Deep offtake — mean-reversion risk.
- All: sensitive to ROBOR/NBR rates (discount rate for RAB) and state dividend directives.

**Real Estate (ONE, IMP):**
- **Highest rate-beta on BVB.** Each +100bp NBR hike → ~-15 to -20% on ONE.
- May 2026 NBR first cut is a high-conviction ONE long setup (theme: "NBR first-cut pivot").
- Catalysts: quarterly presales (>20% YoY surprise = +5-7% in 48h).

**Consumer (SFG, AQ, WINE, M, CFH):**
- Heterogeneous. SFG highest COVID/lockdown beta. AQ yield floor (3.4-7.7%). WINE export/FX beta.
- **Mid-caps have the highest political-event beta** (MedLife, Aquila, TTS, Antibiotice, Purcari all -3 to -7.6% on 2024 election shock days).

**Industrial (TRP, CMP, ALR, TTS):**
- ALR-LME aluminum beta only **0.24** (dampened by Hidroelectrica long-term electricity contract). Strongest at LME >$3,000/t. Inversely sensitive to RO wholesale electricity prices.
- TRP: PVC + construction PMI play.
- CMP: German auto supplier — weak on European auto slowdown.

**Tech/Telecom (DIGI):**
- **No longer a Romanian telecom proxy** — driven by Spanish M&A since 2023 (MásOrange, FTTH sale to Macquarie). +560% from May 2019 ATL to Feb 2026 ATH.
- Leverage watch: net debt/EBITDA >3.5x triggers derating risk.

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
