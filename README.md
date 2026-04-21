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

**Phase 1 — BT Trade demo (current):**
1. Create a Claude Code routine at https://claude.ai/code/routines
2. Set env vars on the routine:
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
   - `FIRESTORE_PROJECT=auto-trader-493814`
   - `GCS_SA_KEY_JSON=<single-line JSON of a service account with `roles/datastore.user`>`
   - `BT_USER`, `BT_PASS`, `BT_NTFY_TOPIC`
   - `EXECUTION_MODE=demo`
3. Ensure the routine prompt's **first action is `npm install`** — the sandbox is ephemeral and `node_modules/` does not survive between runs. Without this, the Firestore SDK is missing and the store silently falls back to ephemeral local files, re-triggering 2FA on every run. See `PROJECT.md` § Daily Workflow → Step 0.
4. In demo mode, BT sends OTP to email (not SMS). On first run, fetch the code from email and feed it to the client; the resulting session snapshot persists to `bt_session/current` in Firestore and subsequent runs resume silently until the refresh token expires (typically weeks).
5. Schedule the routine for morning (07:30 EET) and evening (17:30 EET) runs
6. Create a **token-keeper routine** scheduled `*/45 * * * *` — see [`routines/token-keeper.md`](routines/token-keeper.md). It rotates BT Trade's tokens every 45 min so the refresh token never ages past its ~1h server-side expiry. Without it the 10-hour gap between morning and evening runs means every evening starts with a fresh login — which works (OTP is automated) but is slower and, if repeated often, flags BT's fraud heuristics.

**Phase 2 — Live trading (real RON, future):**
1. Same BT Trade account, live profile
2. Switch `EXECUTION_MODE=live` on the routine
3. Keep all other skills unchanged — the Firestore docs have the same shape

**Offline dev (optional):** `EXECUTION_MODE=simulation` runs a local Yahoo-priced simulator via `scripts/sim_executor.mjs` with no broker contact. Use this only for script development; never for scheduled routine runs.

## Status

🟡 **Phase 1 — Simulation**

## License

Private use only.
