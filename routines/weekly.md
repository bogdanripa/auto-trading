# Weekly run — deep research & planning

**Schedule**: Sunday ~17:00 Bucharest time.
**Purpose**: this is where thinking happens. The week's actual investment
decisions are made here, written as *conditional plans* the daily runs execute.
Take your time — this run is allowed to be long and thorough. Ultrathink.

## Checklist

1. **Orient** (ENGINE.md §4.1) — including re-reading the last 2 weekly entries
   and any outstanding items they left open.
2. **Account & performance reality**: fresh account state; compute performance
   vs baseline and vs BET / 2×BET since inception and over trailing 4 weeks
   (`state/benchmark.csv`). State plainly whether the engine is ahead or behind
   mandate, and one honest sentence on why.
3. **Grade assumptions**: re-read the assumption ledger entries whose check-by
   dates passed; grade `held`/`broke`/`unclear` in this week's journal entry.
   If a graded assumption suggests a durable lesson, add it to LESSONS.md.
4. **Portfolio review**: for each held position — thesis still intact? kill
   criteria approached? valuation vs fair-value band? Decide: hold / add /
   trim / exit, each with reasoning. Update `state/positions.md`.
   **Two mandatory verification steps** (added 2026-08-24 after this run found a
   closed buyback still listed as live support and a three-day error in an H1
   date — see LESSONS.md M-2 and the 2026-08-24 journal entry):
   - **Re-verify reporting dates**: for every held and watchlist name, check the
     next reporting date against the *issuer's own BVB financial calendar*, not
     against a date inherited from an earlier run.
   - **Re-verify standing facts**: any thesis leaning on a standing support or
     structural fact — a buyback, a state programme, a signed contract, an index
     inclusion — must have that fact re-confirmed against a primary source.
     Facts with expiry dates decay silently; the thesis document does not warn
     you.
   - **Resolve stale pauses**: a paused order re-affirmed without change across
     **two consecutive weekly reviews** must be resolved into either an active
     plan with a freshly-derived band or a triggered-watch with explicit
     conditions. It may not simply be paused a third time (LESSONS.md P-5).
5. **Research** (the bulk of the run): work the research agenda in STRATEGY.md.
   Typical content: earnings reports released this week for held/watchlist names
   (read the actual reports on bvb.ro, not just headlines), upcoming week's
   calendar (earnings, ex-dividend dates, index reviews, NBR meetings, rating
   reviews), macro drift (rates, EUR/RON, fiscal news), and screening 1–3 *new*
   candidate names properly (business, numbers, valuation, liquidity,
   governance). Use parallel research agents (the Agent tool / a Workflow) for
   fan-out when it helps; verify anything an agent returns before trading on it.
6. **Update the docs**: WATCHLIST.md (fair-value bands, trigger levels — each
   watchlist name has: thesis in ≤5 lines, entry price band, tranche sizes,
   invalidation), STRATEGY.md (only with version bump + changelog + rationale),
   LESSONS.md as earned.
7. **Write next week's plan** in the journal entry: explicit conditional orders
   ("buy N shares of X up to limit L, tranche 1 of 2, if no adverse news re: Y")
   that daily runs can execute mechanically. Every planned buy carries its full
   thesis here (ENGINE.md §2.10) so daily runs never have to improvise one.
   If the plan is "do nothing all week", write why that is the best portfolio
   decision available — that conclusion is respectable and common.
8. **Self-check**: one paragraph — what did I get wrong or almost-wrong this
   week, and is any playbook/strategy/process change warranted? (This is where
   routine prompts and scripts may be edited, with rationale.)
9. **Journal, report, push**. Telegram briefing: ~15–25 lines — performance vs
   mandate, portfolio, what changed in thinking this week, next week's plan.
   Send via `scripts/telegram_notify.mjs` (ENGINE.md §7).
10. **X post**: the weekly summary is nearly always worth a thread
    (routines/x-posting.md) — performance vs mandate, what changed, the plan
    in broad strokes.

## Guardrails specific to this run

- Research breadth is unlimited; *conclusions* must fit the activity cap
  (ENGINE.md §2.9). Prefer deepening conviction on few names over collecting many.
- Any new candidate must clear the liquidity rule and the "which edge is this?"
  test (ENGINE.md §3) in writing before it reaches WATCHLIST.md.
- Do not place orders on Sunday (market closed, quotes stale) unless placing a
  GTC deliberately below market with written rationale; default is to let Monday's
  daily run execute against live quotes.
