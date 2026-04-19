---
name: macro-analyst
description: Analyze global and regional macroeconomic context relevant to BVB trading decisions. Use this skill as the first step in the daily morning trading analysis. It covers overnight US/European market moves, FX rates (USD/RON, EUR/RON), commodity prices (oil, gas, gold), central bank decisions (Fed, ECB, NBR), and any global events that could impact Romanian equities. Trigger this skill at the start of every morning trading run, or whenever the user asks about macro conditions affecting BVB.
---

# Macro Analyst

Analyze the global and regional macroeconomic environment to establish context for today's BVB trading decisions.

## What to Research

Use web search to gather current data on all of the following:

### Global Markets (overnight)
- US indices close: S&P 500, Nasdaq, Dow — direction and magnitude
- European futures/pre-market: Euro Stoxx 50, DAX — what's expected at open
- Asian session: any notable moves
- VIX level and direction (risk sentiment)

### FX Markets
- EUR/RON — critical for foreign investor flows into BVB
- USD/RON — affects USD-denominated commodity stocks
- EUR/USD — broad risk sentiment indicator
- Direction and magnitude of moves, not just levels

### Commodities
- Brent crude oil — directly affects OMV Petrom (SNP), Romgaz (SNG)
- Natural gas (TTF) — affects SNG, Transgaz (TGN)
- Gold — affects sentiment, sometimes inversely correlated with equities
- Electricity prices — affects Hidroelectrica (H2O), Nuclearelectrica (SNN)

### Central Banks & Macro Data
- Any overnight Fed, ECB, or NBR decisions or commentary
- Recent Romanian macro data: inflation (IPC), GDP, industrial production
- Upcoming macro events this week that could move markets

### Geopolitical & Regional
- Any geopolitical developments affecting CEE/Romania
- EU policy decisions relevant to Romanian economy
- Energy policy developments (relevant for BVB's heavy energy weighting)

## Output Format

Produce a structured analysis with:

1. **Sentiment Score** (-5 to +5): Overall macro environment for BVB today
   - Negative = headwinds, positive = tailwinds, 0 = neutral
2. **Key Drivers**: Top 3 macro factors most likely to affect BVB today
3. **Sector Impact**: Which BVB sectors benefit/suffer from current macro (Energy, Banking, Utilities, Real Estate, Tech/Telecom)
4. **Risk Flags**: Any macro risks that could trigger sudden moves
5. **Summary**: 2-3 sentence macro context for the synthesis step

## Reasoning Guidelines

- BVB is a small, relatively illiquid market. Global macro affects it, but with a lag and through specific channels (FX, commodity prices, EU fund flows).
- The energy sector is ~40-50% of BVB by weight. Commodity prices are disproportionately important.
- NBR (National Bank of Romania) rate decisions directly affect banking stocks (TLV, BRD) and the RON.
- Foreign investor sentiment toward CEE/emerging Europe matters for flow-driven moves.
- Don't over-interpret small daily moves in global markets. Focus on trends and significant events.
