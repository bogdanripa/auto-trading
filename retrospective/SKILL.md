---
name: retrospective
description: Weekly pattern-mining pass over the trade journal. Reads `journal/trades.jsonl`, clusters closed trades by trade_type, sector, exit_reason, and thesis_verdict, identifies patterns that repeat (both successes and failures), and appends distilled observations to `LESSONS.md`. Run this skill once a week, typically Friday evening after the post-close run, or on-demand when the user asks for a performance review, a post-mortem on a losing streak, or wants to revisit what the strategy has learned. Also trigger before making larger-than-usual strategy changes — the lessons are the empirical grounding for any rule adjustments.
---

# Retrospective

Turn the raw trade journal into durable lessons. This skill is the feedback loop that keeps `PROJECT.md` honest.

## Cadence

- **Weekly:** Friday evening run, after `tax-tracker`. Covers trades closed in the last 7 days.
- **Monthly:** First Friday of each month, covers the prior month and consolidates weekly entries.
- **On-demand:** When the user asks for a review, after a streak (3+ losses in a row), or before any proposed change to `PROJECT.md`.

## Inputs

1. `journal/trades.jsonl` — full history
2. `LESSONS.md` — current distilled lessons (to avoid duplicating what's already there)
3. `PROJECT.md` — so lessons can be flagged against specific rules they reinforce or challenge

## Process

### 1. Scope the window
For weekly: last 7 days of exit records. For monthly: last 30. For on-demand: whatever the user asks for, defaulting to "since last retrospective."

### 2. Load and cluster
Parse `trades.jsonl`. Pair each entry with its exit (via `trade_id`). Drop pairs where the exit is outside the window. Cluster by:
- **Trade type** (swing / event / trend)
- **Sector** (energy, financials, utilities, etc.)
- **Exit reason** (take_profit, stop_loss, trailing_stop, time_stop, thesis_invalidated, override_exit, manual)
- **Thesis verdict** (correct / partially_correct / wrong / inconclusive)
- **Entry conviction bucket** (low 0-4, mid 5-7, high 8-10)

### 3. Compute the numbers
For each cluster, compute:
- Count
- Win rate (pnl > 0)
- Average P&L %, median P&L %
- Average days held
- Expectancy: `(win_rate × avg_win) - (loss_rate × avg_loss)`

### 4. Look for patterns
Write down any cluster where:
- Win rate deviates from overall by more than 15 points
- Expectancy is strongly positive or negative
- Thesis verdict skews in one direction
- The same exit reason appears 3+ times
- Overrides changed the outcome (compare pnl with/without override)

### 5. Draft lessons
Each candidate lesson must be:
- **Specific** — names a trade type, sector, exit mechanism, or market condition
- **Evidenced** — references the cluster and the sample size
- **Actionable** — suggests a concrete adjustment or confirmation of current rule
- **Falsifiable** — phrased so future data can prove it wrong

Bad: "Energy trades work well."
Good: "Energy swing trades entered on RSI<30 with above-average volume: 7 trades, 71% win rate, avg +4.2%. Confirms the current RSI oversold rule — continue."

Bad: "Stop losses are too tight."
Good: "4 of last 10 stop-losses triggered within 2 sessions on moves that reversed within a week. Suggests initial 10% stop may be too tight for BVB midcap volatility. Candidate: widen to 12% for trade_type=swing, sector=financials only. Revisit after 10 more trades."

### 6. Merge into LESSONS.md
Append new lessons under a dated heading. When a new lesson contradicts or refines an existing one, update the existing entry in place with a `Revised:` note and the date — don't orphan stale rules.

Mark lessons as:
- **`[candidate]`** — observed but not yet enough data (n < 10)
- **`[active]`** — enough evidence, feeds into daily synthesis
- **`[retired]`** — contradicted by later data, kept for history with reason

### 7. Flag changes to PROJECT.md
If a lesson reaches `[active]` status and conflicts with a rule in `PROJECT.md`, add an entry to the "Proposed Rule Changes" section at the bottom of `LESSONS.md` with the specific rule and suggested edit. Do NOT edit `PROJECT.md` directly — changes go through the user for review.

### 8. Report via Telegram
Send a concise summary via `telegram-reporter`:

```
🔍 WEEKLY RETROSPECTIVE — [DATE]

WINDOW: [date range], N closed trades
OVERALL: [win rate]%, avg [pnl %], expectancy [X] RON

📈 WHAT WORKED
[1-3 bullets with numbers]

📉 WHAT DIDN'T
[1-3 bullets with numbers]

🧠 NEW LESSONS
[Title + status of lessons added to LESSONS.md]

⚠️ RULE CHANGE CANDIDATES
[Any proposed edits to PROJECT.md for user review]
```

## LESSONS.md Structure

```markdown
# BVB Engine — Lessons Learned

Distilled from the trade journal. Entries fall into three statuses: [candidate] (n<10), [active] (drives daily synthesis), [retired] (kept for history).

## Active Lessons

### [active] Energy swing trades on RSI<30 + volume surge
Added 2026-04-26. n=12, win rate 67%, expectancy +2.8% per trade.
Confirms PROJECT.md swing trade entry rule for this sector. Continue.

### [active] Stop-losses too tight for financials midcaps
Added 2026-05-10. n=11, 45% of financial sector stops triggered on day-1 or day-2 before reverting.
Suggests widening initial stop to 12% for sector=financials, trade_type=swing.
See Proposed Rule Changes below.

## Candidate Lessons

### [candidate] Event-driven trades around ex-dividend dates underperform
Added 2026-04-26. n=4, win rate 25%, avg -1.9%.
Too early to be conclusive but worth watching. Revisit at n=10.

## Retired Lessons

### [retired] Avoid trading on CPI release days
Added 2026-03-01, retired 2026-04-26.
Initial pattern (n=5) did not hold with more data (n=14, win rate flat vs baseline).
Kept for history; no action.

## Proposed Rule Changes

### Widen stop-loss for financials swing trades to 12%
Source: "Stop-losses too tight for financials midcaps" (active, n=11)
Current PROJECT.md rule: `Hard stop-loss at 10% per position`
Suggested edit: `Hard stop-loss at 10% per position (12% for sector=financials, trade_type=swing)`
Pending user review.
```

## Anti-patterns

- Don't mine lessons from fewer than 4 closed trades. Noise dominates.
- Don't let lessons accumulate indefinitely. If `[active]` count passes ~15, consolidate — the daily synthesis can't reason over 30 rules.
- Don't edit `PROJECT.md` from this skill. The user is the gate.
- Don't drop `[retired]` lessons. Future data may revive them, and the history of what didn't work is itself a lesson.
