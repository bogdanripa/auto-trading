---
name: counterfactual-mapper
description: For every skipped setup whose invalidation window has elapsed, fetch the price now and attach a Counterfactual edge in graphiti recording what the stock did since the skip. This is the feedback signal for "we decided not to act — was that right?" Run this skill daily, typically as part of the evening routine after trade-journal but before retrospective. Trigger when the user asks "what did we miss?", "show counterfactuals", or wants to evaluate the engine's non-action decisions.
---

# Counterfactual Mapper

Closes the feedback loop on **non-action**. Every `SkippedSetup` ingested by `market-scanner` carries an `invalidation_window_days`. Once that window elapses, this skill fetches the price-now and attaches a `Counterfactual` edge to the original skip, capturing what the stock actually did — so retrospective and the strategy can learn from decisions to *not* trade.

## When this runs

- **Daily**: appended to the evening run, after `trade-journal`, before `retrospective`. Fast — typically a handful of new skips age out per day.
- **Ad-hoc**: when the user asks "what did we miss this week?" or wants to grade a specific skip class.
- **Friday**: re-run before `retrospective` so the weekly causal-query pass (step 7.5 of `retrospective`) has the freshest counterfactual data.

## Process

### 1. Pull skipped setups due for scoring

Query graphiti for `SkippedSetup` nodes where:
- An attached `Counterfactual` edge does NOT yet exist
- `date + invalidation_window_days <= today`

```
mcp__graphiti__search_nodes(
  query: "SkippedSetup unscored invalidation_window_elapsed",
  group_id: "auto_trader",
  limit: 200
)
```

(Filter in-skill: for each returned node, check whether a `Counterfactual` edge already exists by inspecting linked facts; skip if it does.)

### 2. Fetch price history per ticker

For each skip, fetch OHLCV from the skip date to today using the same data source as `market-scanner` (`scripts/indicators.mjs` with a date range, or a direct Yahoo Finance call):

```
const bars = await fetchOHLCV(ticker, startDate=skip.date, endDate=today);
```

If the symbol has no data for that window (delisted, suspended) → write a degraded counterfactual with `data_available: false` and skip the math. Don't fail the whole batch on one missing symbol.

### 3. Compute the counterfactual metrics

For each skip with valid data:

```js
const startPrice = skip.price_at_skip;
const endPrice = bars[bars.length - 1].close;
const peakPrice = Math.max(...bars.map(b => b.high));
const troughPrice = Math.min(...bars.map(b => b.low));

const counterfactual = {
  window_days: bars.length,
  start_price: startPrice,
  end_price: endPrice,
  peak_price: peakPrice,
  trough_price: troughPrice,
  end_move_pct: ((endPrice - startPrice) / startPrice) * 100,
  peak_move_pct: ((peakPrice - startPrice) / startPrice) * 100,
  trough_move_pct: ((troughPrice - startPrice) / startPrice) * 100,
  outcome_class: classify(endMove, peakMove, troughMove)
};
```

#### Outcome classification

- `validated_skip` — stock went DOWN >5% or stayed flat (±5%). The skip was correct.
- `missed_winner` — stock went UP >10% from skip price. The skip cost us money.
- `missed_extreme_winner` — stock went UP >20%. The skip rule deserves serious scrutiny.
- `dodged_loss` — stock went DOWN >10%. The skip saved money.
- `dodged_disaster` — stock went DOWN >20%. Strong validation.
- `neutral` — within ±5% end-to-end; no signal.

`peak_move_pct` matters separately from `end_move_pct` because some skips would have been *winners if held briefly, then losers if held to today*. Both numbers go in the edge so retrospective can compute "if we'd entered and used the stop discipline from PROJECT.md, what would the outcome have been?"

### 4. Attach the Counterfactual to graphiti

```
mcp__graphiti__add_memory(
  name: `Counterfactual ${skip.ticker} skipped ${skip.date}`,
  episode_body: JSON.stringify({
    skip_ref: skip.name,                    // links back to the SkippedSetup node
    ticker: skip.ticker,
    skip_date: skip.date,
    skip_reason: skip.reason,
    window_days: counterfactual.window_days,
    start_price: counterfactual.start_price,
    end_price: counterfactual.end_price,
    peak_move_pct: counterfactual.peak_move_pct,
    trough_move_pct: counterfactual.trough_move_pct,
    end_move_pct: counterfactual.end_move_pct,
    outcome_class: counterfactual.outcome_class
  }),
  source: "json",
  source_description: "Counterfactual scoring of skipped setup",
  group_id: "auto_trader",
  reference_time: <today's ISO timestamp>
)
```

The LLM extractor will create the `Counterfactual` node and link it to the existing `SkippedSetup` via `skip_ref`. Verify the link landed by re-querying the skip and confirming a `Counterfactual` edge now exists.

### 5. Surface anomalies immediately

Some outcomes are too big to wait for the weekly retrospective:

- **Any `missed_extreme_winner` (+20%)** → Telegram alert *today*. The skip rule may be systematically wrong; the user should see it before the next decision.
- **Same `reason` produces ≥3 `missed_winner` outcomes in a single week** → Telegram alert. Hot cell in the skip-rule grid.
- **Same `reason` produces ≥3 `dodged_loss` / `dodged_disaster` in a single week** → Telegram alert (positive — the rule is earning its keep, confirm it).

These alerts go via `telegram-reporter` and are tagged 🪞 `COUNTERFACTUAL ALERT` so they're visually distinct from trade reporting.

### 6. Aggregate and emit a daily summary

After processing all due skips, send a one-line Telegram digest:

```
🪞 COUNTERFACTUALS — <date>
Scored: <N> skipped setups (window elapsed)
Validated skips: <n_validated>
Missed winners: <n_missed> (avg +<x>%)
Dodged losses: <n_dodged> (avg -<x>%)
Alerts fired: <count>
```

If no skips were due today, emit nothing — silence is fine here. The weekly retrospective will surface aggregate patterns.

## Critical: this skill does NOT re-decide

Counterfactuals are **descriptive, not prescriptive**. This skill does not:
- Open positions on previously-skipped names
- Modify skip rules in PROJECT.md
- Retract or rewrite the original `SkippedSetup` record

The original skip stands as a historical decision. The counterfactual is appended as a separate fact. The retrospective skill is the one that turns patterns into proposed rule changes.

## Failure handling

- **Yahoo/Stooq down**: defer scoring to the next run. Skips don't expire — they sit unscored until data is available.
- **Graphiti unreachable**: skip the write — the `SkippedSetup` node still has no `Counterfactual` edge attached, so the next daily run picks it up again. No queue needed; the unscored state IS the retry signal.
- **Skip has malformed `price_at_skip` or `date`**: log and skip. Do not estimate — bad data shouldn't produce false signals.

## Anti-patterns

- Don't compute counterfactuals during the active invalidation window. The whole point of the window is to mark when the skip stops being "live." Scoring early biases the data toward random noise.
- Don't re-score already-scored skips on later runs. If a skip's window was 14 days and the stock kept rallying after day 14, that's interesting but not this skill's concern — by then a NEW signal may have emerged on the same name, and that's a separate decision with its own record.
- Don't conflate "skip outcome" with "trade outcome we'd have had." Skipped trades carry no stop, no sizing, no exit discipline — the counterfactual measures the *underlying setup quality*, not "what we would have made." Retrospective is responsible for the trade-vs-skip comparison, not this skill.
