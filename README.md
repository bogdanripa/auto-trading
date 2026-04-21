# BVB Autonomous Trading Engine

A fully autonomous swing trading system for the Bucharest Stock Exchange (BVB), built as a Claude Project with specialized skills.

## Overview

The engine runs twice daily as Claude scheduled tasks:
- **7:30 AM** — Pre-market analysis and order placement
- **5:30 PM** — Post-close review and next-day preparation

It trades BET-Plus stocks through BT Trade (Banca Transilvania's retail platform, native BVB + RON), manages risk within defined parameters, and reports everything via Telegram.

## Architecture

```
PROJECT.md                    — Strategy brain (risk rules, workflow, override logic)
LESSONS.md                    — Living memory; distilled patterns from past trades
THEMES.md                     — Structural themes biasing ticker selection (AI power demand, BNR rates, …)
Firestore store               — Portfolio state (portfolio_state/current), open orders (orders/open),
                                 fills (fills/*), journal (trades_journal/*). Local-file fallback under
                                 portfolio/ + journal/ when FIRESTORE_PROJECT is unset (dev only).
│
├── macro-analyst/            — Global markets, FX, commodities, central banks
├── bvb-news/                 — BVB announcements, company news, regulatory
├── market-scanner/           — Technical scan of BET-Plus for setups
├── company-analyst/          — Deep fundamental dive on specific stocks
├── portfolio-manager/        — Position tracking, allocation, P&L
├── trade-executor/           — Simulation, BT Trade demo, or BT Trade live (per EXECUTION_MODE)
├── risk-monitor/             — Stop-losses, exposure limits, overrides
├── trade-journal/            — Thesis + outcome log for every trade
├── retrospective/            — Weekly pattern-mining over the journal → LESSONS.md
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

**Phase 1 — Simulation (current):**
1. Create a Claude Code routine at https://claude.ai/code/routines
2. Set env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `EXECUTION_MODE=simulation`
3. Seed the portfolio state once: edit `portfolio/state.seed.json` with your starting `cash_ron`, then run `FIRESTORE_PROJECT=<proj> node scripts/seed_state.mjs portfolio/state.seed.json` — thereafter `sim_executor.mjs` owns the state in Firestore
4. Schedule the routine for morning (07:30 EET) and evening (17:30 EET) runs

No broker account needed for phase 1. Prices come from Yahoo Finance.

**Phase 2 — BT Trade demo (paper trading):**
1. BT Trade account with demo access enabled
2. Set env vars: `BT_USER`, `BT_PASS`, `BT_NTFY_TOPIC` (+ an ntfy.sh phone Shortcut for OTP), and `EXECUTION_MODE=demo`
3. First run triggers 2FA → OTP via ntfy. Tokens persist to `bt_session/current` in Firestore; subsequent runs resume silently.

**Phase 3 — Live trading (real RON):**
1. Same BT Trade account, live profile
2. Switch `EXECUTION_MODE=live` on the routine
3. Keep all other skills unchanged — the Firestore docs have the same shape

## Status

🟡 **Phase 1 — Simulation**

## License

Private use only.
