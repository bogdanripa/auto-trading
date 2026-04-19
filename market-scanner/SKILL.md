---
name: market-scanner
description: Scan the BET-Plus stock universe for technical trading setups — swing entries, breakouts, trend continuations, and exit signals. Use this skill as part of every morning trading run. It pulls price and volume data for BET-Plus constituents, calculates technical indicators, and identifies actionable setups ranked by quality. Trigger whenever you need to scan BVB stocks for technical opportunities or check technical levels on specific stocks.
---

# BVB Market Scanner

Scan BET-Plus stocks for technical trading setups using price action, volume, and momentum indicators.

## BET-Plus Universe

These are the primary stocks to scan (update if index composition changes):

### BET Components (highest liquidity)
SNN (Nuclearelectrica), H2O (Hidroelectrica), TLV (Banca Transilvania), SNP (OMV Petrom), SNG (Romgaz), BRD (BRD-Groupe Société Générale), TGN (Transgaz), DIGI (Digi Communications), ONE (One United Properties), FP (Fondul Proprietatea), SFG (Sphera Franchise Group), TRP (Teraplast), WINE (Purcari Wineries), AQ (Aquila Part Prod), COTE (Conpet), TEL (Transelectrica), M (MedLife), EL (Electromagnetica), BVB (Bursa de Valori Bucuresti), ROCE (Romanian Capital ETF)

### BET-Plus Additional (lower liquidity — scan but be cautious on position sizing)
ALR (Alro), ATB (Antibiotice), BCM (Banca Comerciala Romana), BIO (Biofarm), CMP (Compa), IMP (Impact Developer), LION (Lion Capital), MECE (Mecanica Ceahlau), OIL (Oil Terminal), PCT (Prodplast), PPL (People's Financial Group), PREH (Prebet Aiud), RRC (Rompetrol Rafinare), SAFE (SAF Holland Romania), SIF1-SIF5, STZ (Siretul Pascani), TRANSI (Transilvania Investments), UCM (UCM Resita), EVER (Evergent Investments)

## Data Collection

For each stock in the universe, gather via web search:
- Current price and daily change
- Volume (today vs 20-day average)
- 52-week high and low
- Key moving averages: 20 SMA, 50 SMA, 200 SMA

Search patterns:
- `[SYMBOL] BVB pret actiune` for current price
- `[SYMBOL] tradeville cotatii` for detailed quotes
- `bvb.ro [SYMBOL]` for official BVB data
- Yahoo Finance or Google Finance for charts: `[SYMBOL].RO stock`

## Technical Signals to Identify

### Buy Signals (ranked by reliability on BVB)

**A-Grade Setups (highest conviction):**
- Golden cross (50 SMA crossing above 200 SMA) with volume confirmation
- Breakout above multi-week resistance on 2x+ average volume
- RSI divergence: price making lower low while RSI makes higher low, in a stock with strong fundamentals

**B-Grade Setups (good but need additional confirmation):**
- RSI < 30 in a stock that's in a long-term uptrend (mean reversion within trend)
- Price pulling back to 50 SMA support in an uptrend
- Volume surge (3x+ average) on an up day after a consolidation period

**C-Grade Setups (watch, don't trade yet):**
- Price approaching key support level
- Decreasing volume in a downtrend (potential reversal forming)
- Sector rotation signals (money moving into a sector)

### Sell Signals
- RSI > 70 with declining momentum (MACD histogram decreasing)
- Death cross (50 SMA crossing below 200 SMA)
- Break below key support on high volume
- Volume dry-up on rally attempts (no buyers left)

### Exit Signals for Current Positions
- Stop-loss hit (10% from entry)
- Trailing stop hit (7% from peak for trend rides)
- Target reached (+15-20% for swing trades)
- Fundamental thesis broken (news-driven, from bvb-news skill)

## Output Format

For each identified setup:

```
SYMBOL: [ticker]
SETUP TYPE: [Swing Buy / Event Entry / Trend Continuation / Sell Signal / Exit Signal]
GRADE: [A / B / C]
CURRENT PRICE: [price] RON
ENTRY ZONE: [price range]
STOP LOSS: [price] (-X%)
TARGET: [price] (+X%)
VOLUME: [today] vs [20d avg] ([X]x)
KEY LEVELS: Support [X], Resistance [X]
TECHNICAL SUMMARY: [2-3 sentences]
```

Then provide a ranked summary:
1. **Top Setups**: Best 3 opportunities today (A and B grade only)
2. **Watchlist**: Stocks approaching setups (C grade, might trigger this week)
3. **Exit Alerts**: Current positions that should be reviewed

## BVB-Specific Considerations

- BVB opens at 10:00 AM and closes at 5:45 PM EET. Pre-open auction is 9:45-10:00.
- Spreads are wide on many stocks. Always use limit orders.
- Volume clusters around open and close. Mid-day can be very thin.
- Dividend ex-dates cause mechanical price drops — don't confuse with sell signals.
- BVB has ±15% daily price variation limits (tunnel). Stocks hitting the limit are suspended.
- Many BVB stocks trade in "waves" — they go sideways for weeks then move 10-15% in a few days. Patience is key.
- The January-April period often sees increased activity due to dividend announcements.
