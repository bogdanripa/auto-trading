---
name: trade-journal
description: Record the full story behind every trade — entry thesis, market context at entry, exit reason, and outcome — to build a corpus the strategy can learn from. Trigger this skill in two places. First, at ENTRY: whenever trade-executor fills a new position, immediately append an entry record with the thesis and context. Second, at EXIT: whenever portfolio-manager detects a position has been closed (sold, stopped out, or taken profit), append an exit record that closes the loop with outcome and lessons. This skill is the raw material the retrospective skill consumes weekly. Also trigger when the user asks to review past trades, search the journal, or understand why a particular trade was entered or exited.
---

# Trade Journal

Append-only narrative log of every trade. Distinct from `tax-tracker` (which captures legal/numerical records for Declarația Unică) — this captures *why* each trade was taken and *what happened*, so patterns can be mined later.

## Storage

- File: `journal/trades.jsonl` (one JSON object per line, append-only)
- Location: committed to git, so history is versioned
- Never rewrite history. Corrections go in as new records with `"correction_of": "<trade_id>"`.

## Record Schema

Two record types share the same file, distinguished by `"type"`.

### Entry record — written when a position opens

```json
{
  "type": "entry",
  "trade_id": "2026-04-19-SNG-01",
  "timestamp": "2026-04-19T07:45:00+03:00",
  "symbol": "SNG",
  "trade_type": "swing|event|trend",
  "quantity": 10,
  "entry_price": 48.50,
  "stop_loss": 43.65,
  "take_profit": 55.80,
  "conviction": 7,
  "thesis": "RSI 28 on daily, bouncing off 200d MA with 2x avg volume. Gas prices firming, Q1 earnings in 3 weeks expected strong.",
  "context": {
    "macro": "ECB dovish, RON stable",
    "bvb_news": "No company-specific news; sector tailwind from EU gas storage mandate",
    "scanner_rank": 2,
    "competing_setups": ["TLV", "H2O"]
  },
  "exit_plan": "Trail stop at 7% from peak, hard exit on earnings miss"
}
```

### Exit record — written when a position closes

```json
{
  "type": "exit",
  "trade_id": "2026-04-19-SNG-01",
  "timestamp": "2026-04-28T17:30:00+03:00",
  "exit_price": 53.20,
  "quantity_closed": 10,
  "days_held": 9,
  "pnl_ron": 47.00,
  "pnl_pct": 9.69,
  "exit_reason": "take_profit|stop_loss|trailing_stop|time_stop|thesis_invalidated|override_exit|manual",
  "exit_narrative": "Take profit hit at +9.7%. Earnings were in line but market reacted muted. Could have held for earnings — in retrospect exit was early.",
  "thesis_verdict": "partially_correct",
  "lessons": [
    "Muted post-earnings reaction on SNG suggests market had already priced the Q1 beat",
    "Trailing stop would have kept us in for another ~3% — consider widening trail on event-driven"
  ]
}
```

## Fields Reference

- **`trade_id`** — `YYYY-MM-DD-<symbol>-NN` where NN is the nth trade on that symbol that day. Must be unique and reused by the exit record.
- **`conviction`** — 0-10 score at entry, mirroring the capital allocation logic in PROJECT.md.
- **`thesis`** — one paragraph, plain language. Would a human reading this in six months understand why we entered? If not, rewrite.
- **`context`** — a snapshot of the inputs that informed the decision. Pull directly from the morning synthesis outputs.
- **`exit_reason`** — must be one of the enum values. Use `override_exit` when the risk-monitor override logic changed the planned exit.
- **`thesis_verdict`** — one of `correct` | `partially_correct` | `wrong` | `inconclusive`. Honest self-assessment: did the reason we entered actually play out?
- **`lessons`** — 0-3 short observations, each specific and actionable. Avoid platitudes ("be patient"). Prefer concrete patterns ("BVB midcaps mean-revert within 3 days of gap-ups >4%").

## Triggers

### On entry
After `trade-executor` confirms a fill, append an entry record. The thesis and context must come from the morning synthesis that produced the trade — don't reconstruct them after the fact.

### On exit
`portfolio-manager` detects closed positions by diffing yesterday's holdings against today's. For each closed position, append an exit record. The exit narrative and verdict are written *after* looking at what actually happened between entry and exit.

### Partial exits
Treat each partial as its own exit record with `quantity_closed` set to the partial amount. The remaining lot keeps the original `trade_id` and gets its own exit record when fully closed.

## Querying the Journal

The `retrospective` skill is the main consumer, but the journal is also available for ad-hoc questions:
- "Show all event-driven trades from the last 60 days"
- "What was my thesis on SNG in March?"
- "Which exit reasons correlate with losses?"

Read the JSONL file directly. Filter in memory — the file will stay small (hundreds of records per year).

## Integrity Rules

- Append only. Never edit or delete a record.
- Every `entry` must eventually have a matching `exit` (or a `correction_of` record closing it out).
- Every `exit` must reference an existing `entry` via `trade_id`.
- If an entry record is missing context (e.g., trade-executor ran but trade-journal failed), write a record with `"backfilled": true` and note what's missing.
