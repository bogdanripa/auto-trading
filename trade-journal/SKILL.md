---
name: trade-journal
description: Record the full story behind every trade — entry thesis, market context at entry, exit reason, and outcome — to build a corpus the strategy can learn from. Trigger this skill in two places. First, at ENTRY: whenever trade-executor fills a new position, immediately append an entry record with the thesis and context. Second, at EXIT: whenever portfolio-manager detects a position has been closed (sold, stopped out, or taken profit), append an exit record that closes the loop with outcome and lessons. This skill is the raw material the retrospective skill consumes weekly. Also trigger when the user asks to review past trades, search the journal, or understand why a particular trade was entered or exited.
---

# Trade Journal

Append-only narrative log of every trade. Distinct from `tax-tracker` (which captures legal/numerical records for Declarația Unică) — this captures *why* each trade was taken and *what happened*, so patterns can be mined later.

## Storage

- Records live behind bt-gateway's `/api/v1/journal` endpoint (Firestore, tenant+mode-scoped, append-only). `scripts/store.mjs` is the thin HTTP client — never talk to the gateway directly.
- Written via `store.appendJournal(record)` / read via `store.listJournal({ since, type, limit })`.
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
  "catalyst": "Q1 2026 results publication 15.05.2026 + AGM dividend vote 29.04.2026",
  "catalyst_window": {
    "start": "2026-04-29",
    "end": "2026-05-20"
  },
  "mechanism": "Q1 beat (gas prices firmed vs Q1 2025) → upward earnings revision → re-rating toward analyst fair value ~15 RON. Dividend vote provides floor even if Q1 disappoints.",
  "expected_exit_by": "2026-05-20",
  "theme_tag": "Neptun Deep (candidate)",
  "context": {
    "macro": "ECB dovish, RON stable, BNR held 6.50%",
    "bvb_news": "No company-specific news; sector tailwind from EU gas storage mandate",
    "scanner_rank": 2,
    "competing_setups": ["TLV", "H2O"]
  },
  "exit_plan": "Trail stop at 7% from peak, hard exit on earnings miss",
  "invalidation_conditions": [
    "Q1 results reveal production decline > 5% y/y",
    "Government proposes new windfall tax",
    "Price breaks below 11.00 on volume > 1.5x (structural break)"
  ]
}
```

### Fields that matter for later diagnosis

- **`catalyst`** — the SPECIFIC event expected to drive the move. Not "earnings" — "Q1 2026 results publication 15.05.2026." Dated or dateable.
- **`catalyst_window`** — the range during which the catalyst is expected to play out. Used at exit to check whether the event actually occurred on time.
- **`mechanism`** — *how* the catalyst translates into price. Not "good news" — "Q1 beat → upward earnings revision → re-rating." If you can't articulate a mechanism, the thesis is probably weak; consider a smaller size or skipping.
- **`expected_exit_by`** — the last date by which you'd still be in the trade under the original thesis. If held past this date with no new reason to hold, the thesis is stale and requires re-examination.
- **`invalidation_conditions`** — discrete, testable conditions that kill the thesis. When any one triggers, exit regardless of P&L.


### Exit record — written when a position closes

```json
{
  "type": "exit",
  "trade_id": "2026-04-19-SNG-01",
  "timestamp": "2026-05-18T17:30:00+03:00",
  "exit_price": 13.10,
  "quantity_closed": 40,
  "days_held": 30,
  "pnl_ron": 12.00,
  "pnl_pct": 2.34,
  "exit_reason": "take_profit|stop_loss|trailing_stop|time_stop|thesis_invalidated|override_exit|manual",
  "catalyst_occurred": "yes",
  "mechanism_worked": "yes_but_price_reversed",
  "held_past_expected_exit": false,
  "invalidation_triggered": null,
  "exit_narrative": "Q1 results came in as expected (production flat y/y, beat consensus on cost discipline). Stock gapped up 5% on the release then gave back most of it within 3 sessions on broad BVB pullback. Took profit as the gap-fill accelerated.",
  "thesis_verdict": "partially_correct",
  "lessons": [
    "Muted post-earnings persistence on SNG suggests market prices in the beat fast — target on results gap + 2 days, not 2 weeks",
    "Event-driven trades should book 50-70% at the catalyst move; trail the rest"
  ]
}
```

### Fields that sharpen the post-mortem

- **`catalyst_occurred`** — `yes | no | delayed | partial`
  - `yes` — catalyst happened on time as described
  - `no` — catalyst never happened within the window
  - `delayed` — happened, but outside `catalyst_window`
  - `partial` — something like the catalyst happened, but scope was different
- **`mechanism_worked`** — `yes | no | yes_but_price_reversed | via_different_path`
  - `yes` — mechanism played out and drove price as expected
  - `no` — catalyst occurred but the mechanism didn't transmit into price
  - `yes_but_price_reversed` — mechanism worked initially, then price reversed on unrelated flow
  - `via_different_path` — trade worked but for a different reason than the thesis
- **`held_past_expected_exit`** — boolean. True = we held beyond the thesis's natural end. Forces honest scoring: did holding help or hurt?
- **`invalidation_triggered`** — if exit was triggered by one of the entry's `invalidation_conditions`, reference it by index or text. Null if exit was for a different reason.
- **`thesis_verdict`** — `correct | partially_correct | wrong | inconclusive`. This is now *derived* from the fields above, not an independent judgment:
  - catalyst_occurred=yes + mechanism_worked=yes → correct
  - catalyst_occurred=yes + mechanism_worked=no → wrong (we diagnosed a non-existent causal chain)
  - catalyst_occurred=no → inconclusive (thesis was never tested)
  - catalyst_occurred=yes + mechanism_worked=yes_but_price_reversed → partially_correct (right thesis, wrong exit)
  - via_different_path → partially_correct (got paid for the wrong reason)

### The four failure modes, made explicit

| catalyst_occurred | mechanism_worked | P&L | Lesson to draw |
|-------------------|------------------|-----|----------------|
| no | — | loss | Catalyst never arrived — was timing wrong? Wait longer next time? |
| yes | no | loss | Diagnosis wrong — catalyst doesn't drive price via that mechanism. Update priors. |
| yes | yes_but_price_reversed | loss | Thesis right, exit wrong. Book partial at catalyst. |
| — | via_different_path | win | Lucky. Don't generalize this trade. |

These four cells produce different corrections. The retrospective skill now clusters on `(catalyst_occurred, mechanism_worked)` pairs and shows the user where the strategy is systematically mis-diagnosing vs. systematically mis-timing.

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

Use `store.listJournal({ since, type, limit })` and filter in memory — the collection stays small (hundreds of records per year). Never read Firestore or any local file directly; the gateway is the only path in and out.

## Integrity Rules

- Append only. Never edit or delete a record.
- Every `entry` must eventually have a matching `exit` (or a `correction_of` record closing it out).
- Every `exit` must reference an existing `entry` via `trade_id`.
- If an entry record is missing context (e.g., trade-executor ran but trade-journal failed), write a record with `"backfilled": true` and note what's missing.
