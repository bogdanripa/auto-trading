# Daily run — pre-open monitor & executor

**Schedule**: trading days (Mon–Fri), ~09:15 Bucharest time, before the 10:00 open.
**Purpose**: keep the engine's picture of reality current, execute *pre-planned*
actions, and catch genuinely material overnight news. This run is a monitor, not
a strategist. Its default and most common outcome is **NO ACTION**.

## Checklist

1. **Orient** (ENGINE.md §4.1). Note anything the weekly plan scheduled for today.
2. **Market-day check**: skip trading steps on BVB holidays (list in STRATEGY.md
   notes); still record the benchmark row if data exists, then exit with a short
   journal note.
3. **Account reality**: `get_cash`, `get_holdings`, `list_orders` (fresh). Diff
   against what the journal expects:
   - fills since last run → journal them (entry price, fees; update `state/positions.md`)
   - expired/rejected orders → decide re-place or drop, journal the reasoning
   - unexplained positions/orders → owner activity: read-only, note it
4. **Benchmark row**: append yesterday's BET and BET-TR closes, portfolio value,
   cash to `state/benchmark.csv` (via `scripts/benchmark.mjs` if it exists, else
   fetch from bvb.ro manually).
5. **Overnight scan (15 minutes, not more)**: BVB announcements for held +
   watchlist names (bvb.ro), Romanian financial press headlines (ZF, Profit.ro,
   Bursa.ro), one glance at global tone (DAX futures direction, Brent, EUR/RON).
   You are looking for *material* news about names you own or plan to act on —
   not for new ideas. New ideas go to a watchlist note for the weekly run.
   **Mandatory (added 2026-11-14, LESSONS P-14):** (a) one Romanian-language web
   search per held name **by company name** ("IAR Brașov", "Banca Transilvania",
   "AROBS"), not the ticker; (b) for any held/planned name with a filing due
   within ±2 trading days, fetch the issuer's bvb.ro page
   (`FinancialInstrumentsDetails.aspx?s=TICKER`) directly — search indexes lag
   by days; (c) grade physical-event assumptions only on a filing that reports
   the event as done (P-15).
6. **Planned actions**: if STRATEGY.md or the last weekly entry defines a trigger
   whose conditions you can verify *now* (live quote via `get_instrument`, spread
   sane, liquidity cap respected) → execute per ENGINE.md §4 (thesis already
   written by the weekly run; reference it, don't rewrite it).
7. **Unplanned actions** are allowed only for: stop-thesis events (kill criteria
   hit — exit per plan), or truly material news that changes a held position's
   thesis *today*. The bar is high. A price move alone is not news.
8. **Journal, report, push** (ENGINE.md §4.6–4.8). Telegram briefing: 5–10 lines —
   portfolio value & vs-BET ratio, any fills/orders, one-line market tone,
   today's decision (usually "no action — <reason>"). Send via
   `scripts/telegram_notify.mjs` (ENGINE.md §7).
9. **X post** (public experiment): default to posting — per routines/
   x-posting.md's broadened bar (2026-09-04), a no-action day usually still
   has news, a trigger check, or reasoning worth narrating publicly. Skip
   only when nothing changed since the last post at all.

## Guardrails specific to this run

- Do not open a new position that the weekly run has not already put on the
  watchlist with an entry plan, unless a genuine dislocation (>5% gap on a
  watchlist name without thesis-relevant news, or market-wide panic) makes the
  prepared-buyer edge (ENGINE.md §3.4) actionable — and then size only the first
  tranche.
- If yesterday's close data or account state cannot be fetched, record what you
  can, place nothing, and say so in the briefing (ENGINE.md §2.12).
- If the weekly plan carries a key date marked "unconfirmed" (e.g. a vote or
  report date), spend one web search refreshing it before closing the run; a
  date that slips by a day is how a plan's timing note goes stale (2026-10-17
  weekly self-check).

## Error alerts (added 2026-11-13, owner request)

On ANY error (MCP/tool failure, aborted run, failed push, unexplained account state), in addition to Telegram send a WhatsApp alert: `node scripts/whatsapp_alert.mjs "<one-line what failed + what was/was not done>"`. If it exits 2/3, note it in the journal and fall back to PushNotification. Never blocks the run.

**Update 2026-11-13**: the owner has connected a WhatsApp MCP to this schedule. Prefer it: `ToolSearch` for "whatsapp" at run start and use its send-message tool (to the owner) for error alerts; use scripts/whatsapp_alert.mjs only if no WhatsApp MCP tools appear.

Note: the WhatsApp MCP is named **gepetel** — `ToolSearch` for "gepetel" (and "whatsapp") to find its tools.
