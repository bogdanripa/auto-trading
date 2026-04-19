---
name: company-analyst
description: Perform deep fundamental analysis on a specific BVB-listed company. Use this skill when the market-scanner or bvb-news skills flag a stock for closer examination, when evaluating a potential new position, or when reviewing an existing holding after material news. It covers financial statements, valuation metrics, dividend history, ownership structure, competitive position, and upcoming catalysts. Trigger whenever a specific BVB company needs detailed research before a trading decision.
---

# Company Analyst

Deep-dive fundamental analysis on a specific BVB-listed company to determine investment merit and timing.

## When to Use
- A stock shows up as an A or B grade technical setup — validate the fundamentals
- Material news breaks about a portfolio holding — reassess the position
- Approaching a known catalyst (earnings, dividend, corporate action) — prepare the trade thesis
- Periodic review of existing positions (at least every 2 weeks)

## Research Checklist

Search the web for the following information about the target company:

### Financial Performance
- Latest quarterly and annual results (revenue, net profit, EBITDA)
- Revenue and profit trends (growing, stable, declining?)
- Profit margins and their direction
- Debt levels (debt/equity, interest coverage)
- Cash flow from operations vs capital expenditure
- ROE and ROA trends
- Search: `[COMPANY] rezultate financiare`, `[SYMBOL] BVB raport trimestrial`

### Valuation
- P/E ratio vs historical average and sector peers
- P/B ratio (important for banking stocks: TLV, BRD)
- EV/EBITDA for capital-intensive companies (SNN, H2O, SNP, SNG)
- Dividend yield vs historical average
- Compare to sector peers on BVB and regionally (CEE)

### Dividend Profile
- Dividend history (last 5 years — amount, yield, payout ratio)
- Dividend policy (stated policy vs actual practice)
- Expected next dividend (analyst estimates or company guidance)
- Key dates: announcement, ex-date, record date, payment date
- Special dividends (SNN and SNG sometimes pay specials from windfall profits)
- Search: `[SYMBOL] dividende`, `[COMPANY] politica dividende`

### Ownership & Insider Activity
- Major shareholders (state ownership is common on BVB — SNN, H2O, SNP all have state stakes)
- Recent insider transactions (board members buying/selling)
- Free float percentage (low free float = higher volatility, harder to trade)
- Any recent changes in significant holdings (>5% threshold crossings)
- Search: `[SYMBOL] actionari`, `[COMPANY] tranzactii persoane relevante`

### Business Quality
- Market position in Romania (monopoly, oligopoly, competitive?)
- Regulatory environment (energy sector is heavily regulated)
- Key risks (commodity price exposure, regulatory changes, FX risk)
- Growth drivers (new projects, capacity expansion, market growth)
- ESG considerations if relevant (EU regulations, green energy transition)

### Upcoming Catalysts
- Next earnings report date
- Dividend announcement / ex-date
- Shareholder meetings (AGA/AGEA)
- Corporate actions (buybacks, capital increases, M&A)
- Sector-specific events (energy price reviews, banking regulations)
- Government policy decisions affecting the company

## Analysis Output

### Company Scorecard
```
COMPANY: [Name] ([SYMBOL])
SECTOR: [Energy / Banking / Utilities / Real Estate / Consumer / Industrial / Tech-Telecom]

FUNDAMENTAL SCORE: [1-10]
- Financial health: [1-10]
- Valuation: [1-10] (10 = deeply undervalued)
- Dividend attractiveness: [1-10]
- Growth prospects: [1-10]
- Management quality: [1-10]

CATALYST TIMELINE:
- [Date/Period]: [Event] — Expected impact: [Positive/Negative/Uncertain]

THESIS: [2-3 sentences on why to buy/hold/sell]
RISKS: [Top 2-3 risks to the thesis]
FAIR VALUE ESTIMATE: [price range] RON (current price: [X] RON)
```

### Trading Recommendation
- **Action**: Buy / Hold / Sell / Watch
- **Trade type**: Swing / Event-driven / Trend ride
- **Entry zone**: [price range]
- **Position size suggestion**: [% of portfolio, considering conviction and liquidity]
- **Catalyst date**: [if event-driven]
- **Time horizon**: [days/weeks/months]

## Sector-Specific Notes

### Energy (SNN, H2O, SNP, SNG, TGN, COTE)
- Revenue heavily influenced by commodity prices and regulated tariffs
- State ownership means dividend policy can be influenced by government budget needs
- Windfall taxes and price caps are recurring regulatory risks
- Green energy transition creates both opportunities and threats

### Banking (TLV, BRD)
- Net interest margin is the key driver — directly linked to NBR rate
- Asset quality (NPL ratios) matters in downturns
- Strong capital positions on BVB banks — look at CET1 ratios
- Dividend payout ratios capped by NBR recommendations

### Real Estate/Development (ONE, IMP)
- Cyclical — sensitive to interest rates and economic growth
- Pre-sales data and delivery pipeline are leading indicators
- Land bank valuation can be tricky

### Consumer/Services (SFG, AQ, M, WINE)
- Revenue growth tied to Romanian consumer spending
- Expansion stories (geographic, M&A) can drive re-rating
- Margins under pressure from input costs and labor
