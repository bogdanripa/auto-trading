---
name: session-context
description: Build the engine's working memory at the start of every routine run. Pulls active priors, themes, recent decisions, and prior news from graphiti; fetches current positions from bt-gateway (source of truth); emits a structured brief that every downstream skill reads before acting. Trigger this skill as Step 1 of the morning run and Step 1 of the evening run, immediately after the gateway preflight (Step 0) and before any analyst, scanner, or decision-making skill. Also trigger when the user asks "what does the engine know right now?", "what's our current context?", or wants to inspect the engine's working memory before a manual decision.
---

# Session Context

The engine's working memory for one routine run. This skill is the **first reasoning step** of every session — it gathers everything the engine needs to be "acutely aware of the past" before any analysis or decision happens.

## Source-of-truth split

| What | Source | Why |
|---|---|---|
| Current positions, cash, pending orders | **bt-gateway** | Live broker state. Graphiti is a derived index, not authoritative for positions. |
| Past decisions, theses, mechanisms, catalysts | **graphiti** | The graph holds the *reasoning* — what we believed, why we chose, what was invalidated. |
| Active lessons, themes | **LESSONS.md, THEMES.md** + graphiti | Files for human curation; graphiti for evidence trails and superseded priors. |
| Latest news | **bvb-news skill** (runs after this one) | News gets ingested into graphiti *after* the brief — this skill reads what's already there. |

## Process

### 1. Fetch current positions (bt-gateway)

Use the actual store API in [scripts/store.mjs](../scripts/store.mjs):

```
const state = await store.getState();    // { cash_ron, positions: [...], as_of }
// `positions` has cost basis and quantity. P&L and days-held are computed from
// the matching journal entries (store.listJournal) and recent fills (store.listFills).
```

If the cached state looks stale or empty (`cash_ron === 0 && positions.length === 0`), refresh it by running `node scripts/bt_executor.mjs status`, which fetches live cash + holdings from bt-gateway, normalizes the BT-shape (`cash[].value.amount`, `holdings.Positions.Items`) into `{ cash_ron, positions }`, and writes the normalized cache.

These are facts, not inferences. Pull verbatim.

### Critical: prefer `get_episodes` over `search_nodes`

`search_nodes` / `search_facts` use semantic LLM-driven search (OpenAI under the hood) and **routinely time out** when OpenAI is slow or rate-limiting. The daily critical path of this skill must NOT depend on them — it uses structural `get_episodes` calls with in-skill filtering instead. Those hit FalkorDB directly, no LLM dependency, fast and reliable.

Pattern used everywhere below:

```
all = mcp__graphiti__get_episodes(group_ids: ["auto_trader"], max_episodes: 500)
filtered = filter(all, by name prefix / by content fields / by reference_time)
```

`max_episodes: 500` is enough for ~3 months of activity at the engine's volume. Increase only if filtering returns less than expected. Filter in-skill — the MCP server returns episodes newest-first, so for "since timestamp" queries you can short-circuit as soon as you see an older one.

### 1.5 Determine the last-session timestamp

```
episodes = mcp__graphiti__get_episodes(group_ids: ["auto_trader"], max_episodes: 50)
session = first episode where name starts with "Session "
last_session_ts = session.reference_time (or episode.created_at if reference_time absent)
```

If no Session episode exists (first run after deploy), default to 24 hours ago.

### 2. Per-position memory recall (graphiti)

Engine-managed positions carry a `trade_id` (from `store.getState().positions[i].trade_id` or matched via `store.listJournal()`). For each, look up the entry record by **exact name match** — no semantic search needed:

```
episodes = mcp__graphiti__get_episodes(group_ids: ["auto_trader"], max_episodes: 500)
for each open position:
  entry = first episode where name == "Trade entry <trade_id>"
  reaffirms = all episodes where name == "Trade reaffirm <trade_id>" (date-sorted)
  parse entry.content JSON → thesis, catalyst, mechanism, invalidation_conditions
```

For backfilled / manual positions without a clean `trade_id`, look up by symbol + date:
- `name == "Trade backfilled <SYMBOL> <YYYY-MM-DD>"`

Pull the verbatim entry thesis, catalyst, mechanism, invalidation conditions, and any mid-trade reaffirmations. **Full fidelity** — these positions are live.

### 3. Recent outcomes since last session (get_episodes)

From the same `episodes` list (single fetch supports all steps):

```
exits = episodes where name starts with "Trade exit "
       AND (reference_time or created_at) > last_session_ts
```

For each exit, parse content JSON → trade_id, exit_price, pnl_pct, thesis_verdict, exit_reason. 1-line each.

### 4. Active priors & themes (files only — no graphiti)

`LESSONS.md` and `THEMES.md` are the authoritative source. Graphiti only mirrors them as derived nodes that are stale until the next retrospective.

```
- Read LESSONS.md → extract [active] and [candidate-skip-rule] entries (title + n + last-reinforced)
- Read THEMES.md → extract active themes
- Flag entries promoted to [active] or moved to [retired] in the last 7 days
```

No graphiti call in this step. Faster, simpler, no failure mode.

### 5. Pending decisions (get_episodes)

```
skipped = episodes where name starts with "SkippedSetup "
        AND parse(content).date + invalidation_window_days >= today
        AND no companion "Counterfactual ..." episode exists for the same skip
reaffirms_open = match each open position to its most recent "Trade reaffirm <trade_id>"
               flag positions where days_held >= expected_exit_by - 3
```

- Skipped setups still inside their invalidation window — we may revisit them today.
- Positions approaching planned exits (time-based or target-based).
- Regime tripwires close to firing (read from `rules/bvb_rules.json` evaluation in this run's macro-analyst output — not graphiti).

### 6. Prior news context (get_episodes, last 14 days)

```
news = episodes where name starts with "News "
     AND (reference_time or created_at) >= today - 14 days
filter: parse content JSON → keep where
  - symbol matches an open position ticker (always include), OR
  - symbol matches a watchlist ticker AND direction != "neutral", OR
  - tagged regime/macro
drop: low-materiality items (materiality != "high" / "medium")
```

1-line each: `[date] [ticker] [headline] [direction] [source]`. Do **not** pull article bodies — pre-extracted summaries only.

> Note: this is *prior* news (what graphiti already has). The `bvb-news` skill runs **after** this one to add today's fresh news to the graph.

### 7. Emit the brief

Structured markdown, target ≤4k tokens. Sections must appear even when empty (consistency for downstream skills):

```markdown
# Session Brief — <timestamp>

## Portfolio (from bt-gateway)
- <ticker> | <qty> | cost <x> | now <y> | P&L <±z%> | day <n> of <expected_exit_by>
- Cash: <amount> RON | Buying power: <amount>

## Open-position theses (from graphiti)
### <ticker>
- Thesis: <verbatim>
- Catalyst: <event, date>
- Mechanism: <verbatim>
- Invalidation: <conditions>
- Reaffirmations: <if any, with reasoning>

## Recent outcomes (since <last_session>)
- <ticker> closed +<%>: verdict=<x>, exit_reason=<y>
- ...

## Active priors
- [active] <title> — n=<count>, last-reinforced <date>
- ... 
- ⚠️ RECENTLY RETIRED (last 7 days): <title> — invalidated by <evidence>

## Active themes
- <name> — evidence=<n>, last-reinforced <date>
- ...

## Pending decisions
- Skipped: <ticker> at <date>, reason=<x>, invalidation_window ends <date>
- Reaffirm-watch: <ticker> in pos for <n> days vs expected_exit_by <date>
- Tripwire-near: <rule_id> at <distance> from firing

## Prior news (last 14 days, filtered)
- [2026-05-12] SNG | Q1 results +18% YoY | bullish | bvb.ro
- [2026-05-11] MACRO | BNR holds at 6.50% | neutral | bnr.ro
- ...
```

### 8. Store the session itself in graphiti

At the end of session-context, ingest the brief as a `Session` episode so we can later reconstruct the engine's epistemic state at decision time:

```
mcp__graphiti__add_memory(
  name: "Session <date> <morning|evening>",
  episode_body: <the brief>,
  source: "session-context",
  source_description: "Session brief at start of routine run",
  group_id: "auto_trader"
)
```

This is what lets us answer *"what did we know when we opened ONE?"* a month later.

## Failure mode — graphiti unreachable

Only one call now depends on graphiti's MCP being responsive: the single `get_episodes` fetch in steps 1.5 / 2 / 3 / 5 / 6. That call hits FalkorDB directly with no LLM dependency — orders of magnitude more reliable than the old `search_nodes` queries this skill used to make.

If `get_episodes` fails or times out (**>30s**), **do not abort the run**. Emit a degraded brief:

- Portfolio + cash from bt-gateway (still works — different service)
- Active lessons from `LESSONS.md` (file read, no network)
- Active themes from `THEMES.md` (file read, no network)
- Banner at top: `⚠️ GRAPHITI UNAVAILABLE — operating with reduced context. No prior-news, no per-position thesis recall, no skipped-setup tracking.`

Send the banner to Telegram in the morning briefing so the user knows the engine ran "blind" today. **If `get_episodes` returns successfully but yields no matches in any step, that's NOT a failure** — it just means the engine is freshly deployed or the relevant slice is empty. Continue without the banner.

### What about the Session ingest at the end (step 8)?

`add_memory` is a write call — also unrelated to semantic search. If it fails, log to stderr; the brief was still produced and sent. Next session-context will simply use a slightly older `last_session_ts`. Non-blocking.

Send the banner to Telegram in the morning briefing so the user knows the engine ran "blind" today.

## Token budget

Target: 3–5k tokens total in the brief.

- News digest: ≤30 items, 1 line each → ~600 tokens
- Open-position theses: verbatim, but typically ≤5 positions × 200 tokens = ~1k
- Closed-trade outcomes: 1 line each, ≤20 items → ~400 tokens
- Active priors: title-only, ≤30 items → ~500 tokens
- Themes: ≤10, with metadata → ~300 tokens
- Pending decisions: ≤20 items → ~500 tokens
- Portfolio: ~200 tokens

If the brief exceeds 5k tokens, trim in this order: (1) closed-outcome list to 14 days, (2) news to 7 days, (3) priors to top-15 by relevance. **Never** trim open-position theses — those are non-negotiable fidelity.

## When this skill runs

- **Morning run**: Step 1 (after gateway preflight, before macro-analyst). Replaces the old "read LESSONS.md/THEMES.md" step — that's now folded into here.
- **Evening run**: Step 1 (before portfolio-manager). Same skill, same output shape.
- **Ad-hoc**: when the user asks to inspect the engine's working memory before a manual decision.

## What this skill does NOT do

- It does not fetch new news (that's `bvb-news`, which runs after).
- It does not analyze (that's `macro-analyst`, `company-analyst`).
- It does not decide (that's the synthesis step).
- It does not write trade journal entries (that's `trade-journal`).
- It does not write priors/lessons (that's `retrospective`).

It only **gathers and structures**. Read-only against graphiti and bt-gateway, write-only for the one `Session` node it emits at the end.
