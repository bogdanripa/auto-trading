---
name: bvb-news
description: Monitor and analyze BVB announcements, company press releases, ASF regulatory news, and Romanian financial media for trading-relevant information. Use this skill as part of every daily trading run (both morning and evening). It identifies material news that could affect BET-Plus stocks — earnings, dividends, corporate actions, insider transactions, regulatory changes, and sector developments. Trigger whenever you need current BVB-specific news, company announcements, or Romanian capital market updates.
---

# BVB News Monitor

Scan and analyze all relevant news sources for information that could affect BVB trading decisions.

## Sources to Search

Use web search across these categories:

### BVB Official
- Search for recent BVB announcements: `site:bvb.ro rapoarte curente` or `BVB announcements today`
- Corporate actions: dividends, splits, rights issues, delistings
- Trading halts or suspensions
- Index rebalancing announcements (BET, BET-Plus composition changes)

### Company Press Releases
- Search for news on current portfolio holdings first (highest priority)
- Then scan for news on watchlist stocks
- Focus on: earnings/results, guidance changes, contract wins, management changes, M&A
- Key search patterns: `[SYMBOL] rezultate financiare`, `[COMPANY] comunicat bursa`

### ASF (Financial Supervisory Authority)
- Regulatory changes affecting capital markets
- Sanctions or investigations into listed companies
- New regulations on trading, reporting, or investor protection

### Romanian Financial Media
- Search Romanian financial news: `bursa valori bucuresti azi`, `actiuni BVB`
- Key outlets: ZF.ro, Profit.ro, Economica.net, Bursa.ro, StartupCafe.ro
- Analyst opinions and market commentary
- Sector-specific news (energy policy, banking regulation, real estate market)

### Dividend Calendar
- Upcoming ex-dividend dates for BET-Plus stocks
- Dividend amounts and yields
- Record dates and payment dates

### Insider Transactions
- Board member or significant shareholder trades
- Search: `tranzactii persoane relevante BVB`, `insider trading BVB`

## Analysis Framework

For each piece of material news, assess:

1. **Materiality** (High / Medium / Low): Will this move the stock price?
2. **Direction** (Positive / Negative / Neutral): Which way?
3. **Timeframe** (Immediate / This week / This month): When will the impact be felt?
4. **Affected stocks**: Which BET-Plus names are impacted?
5. **Actionability**: Is there a trade here? Buy/sell/watch?

## Output Format

1. **Breaking/Critical News**: Anything requiring immediate portfolio action
2. **Material News**: Significant developments for specific stocks
3. **Background News**: Sector/market context worth noting
4. **Upcoming Events**: Dividends, earnings, corporate actions in the next 2 weeks
5. **News Sentiment Score** (-5 to +5): Overall news flow direction for BVB

## Priority Rules

- Always search for news on stocks currently in the portfolio FIRST
- Dividend announcements and ex-dates are HIGH priority (drive significant BVB moves)
- Earnings results are HIGH priority
- Management changes at BET component companies are MEDIUM priority
- General market commentary is LOW priority unless from NBR or government officials
- Ignore noise: analyst target price changes with no new information, generic "market outlook" pieces
