# BVB Autonomous Trading Engine

A fully autonomous swing trading system for the Bucharest Stock Exchange (BVB), built as a Claude Project with specialized skills.

## Overview

The engine runs twice daily as Claude scheduled tasks:
- **7:30 AM** — Pre-market analysis and order placement
- **5:30 PM** — Post-close review and next-day preparation

It trades BET-Plus stocks through Interactive Brokers (IBKR), manages risk within defined parameters, and reports everything via Telegram.

## Architecture

```
PROJECT.md                    — Strategy brain (risk rules, workflow, override logic)
│
├── macro-analyst/            — Global markets, FX, commodities, central banks
├── bvb-news/                 — BVB announcements, company news, regulatory
├── market-scanner/           — Technical scan of BET-Plus for setups
├── company-analyst/          — Deep fundamental dive on specific stocks
├── portfolio-manager/        — Position tracking, allocation, P&L
├── trade-executor/           — IBKR API interface for order execution
├── risk-monitor/             — Stop-losses, exposure limits, overrides
├── tax-tracker/              — Trade logging for Declarația Unică
└── telegram-reporter/        — Formatted briefings and alerts
```

## Strategy

- **Universe:** BET-Plus index (~40 stocks)
- **Trade types:** Swing (3-15d), Event-driven (2-8w), Trend rides (1-3m)
- **Risk:** 10% hard stop (with override authority), 30% max per stock, 60% max per sector
- **Positions:** 3-5 concurrent (2-3 early)
- **Cash:** Valid position, no forced trades

## Setup

1. Create a Claude Project and upload these skills
2. Configure Telegram bot credentials
3. Open an IBKR account (start with paper trading)
4. Set up VPS running IBKR gateway (required for live trading)
5. Configure scheduled tasks for morning/evening runs

## Status

🟡 **In development** — Paper trading phase

## License

Private use only.
