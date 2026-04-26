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
LESSONS.md                    — Living memory; distilled patterns from past trades (git-tracked; committed after every retrospective run)
THEMES.md                     — Structural themes biasing ticker selection (git-tracked; committed after macro-analyst edits it)
bt-gateway (Cloud Run)        — Owns the BT Trade session, encrypted credentials, OTP via ntfy,
                                 tokens refreshed server-side, and ALL long-term storage
                                 (portfolio state, fills, journal, considered candidates,
                                 daily market snapshots). Per-tenant, per-mode. The scripts
                                 in this repo talk to it via HTTP only — no direct Firestore,
                                 no local-file fallback.
│
├── macro-analyst/            — Global markets, FX, commodities, central banks
├── bvb-news/                 — BVB announcements, company news, regulatory
├── market-scanner/           — Technical scan of BET-Plus for setups
├── company-analyst/          — Deep fundamental dive on specific stocks
├── portfolio-manager/        — Position tracking, allocation, P&L
├── trade-executor/           — BT Trade demo or live, via bt-gateway
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
1. In the bt-gateway dashboard, store BT Trade credentials for the `demo` profile and mint an API key (`bvb_demo_...`).
2. Create a Claude Code routine at https://claude.ai/code/routines
3. Set env vars on the routine:
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (optional — bt-gateway can also notify directly)
   - `BT_GATEWAY_API_KEY=bvb_demo_...`
   - `BT_GATEWAY_URL=https://...` (gateway base URL — required, no default)
4. Schedule the routine for morning (07:30 EET) and evening (17:30 EET) runs.

That's it. The gateway owns credentials, OTP (delivered via ntfy to your phone shortcut), token refresh (every 45 min via its own Cloud Scheduler cron), and storage. This repo's scripts are thin HTTP clients — no BT Trade SDK, no Firestore SDK, no `@google-cloud/*` dependencies.

**Phase 2 — Live trading (real RON):**
1. Store live credentials in bt-gateway for the `live` profile; mint a `bvb_live_...` key.
2. Swap `BT_GATEWAY_API_KEY` on the routine.
3. Pass `--live` to `bt_executor.mjs` commands (the script cross-checks the key prefix and aborts on mismatch — a live key with no `--live` flag will not place orders).

## Status

🟢 **Phase 1 — Demo trading via bt-gateway**

## License

Private use only.
