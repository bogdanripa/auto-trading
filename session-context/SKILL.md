---
name: session-context
description: Build the engine's working memory at the start of every routine run. Fetches current positions from bt-gateway and per-position theses + recent exits from the Firestore trade journal (both source-of-truth); reads active priors and themes from LESSONS.md / THEMES.md; best-effort pulls prior news and open skipped-setups from graphiti (degraded — graphiti is enrichment only, never load-bearing). Emits a structured brief that every downstream skill reads before acting. Trigger this skill as Step 1 of the morning run and Step 1 of the evening run, immediately after the gateway preflight (Step 0) and before any analyst, scanner, or decision-making skill. Also trigger when the user asks "what does the engine know right now?", "what's our current context?", or wants to inspect the engine's working memory before a manual decision.
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

### Critical: graphiti is NOT the critical path — it is best-effort enrichment

> **This section was rewritten after the graph outgrew the MCP's query capability.** The old guidance ("prefer `get_episodes(max_episodes: 500)` — fast and reliable, newest-first") was **wrong on three counts** and is the cause of the daily run silently losing all graph context. Do not reintroduce it.

Measured reality of the `graphiti` MCP at the current graph size (verified live, May 2026):

1. **`get_episodes` times out for `max_episodes ≳ 8`.** `500`, `50`, `10` all reliably time out; only single-digit pulls (`≤ 5`) return. The FalkorDB query is unindexed, unpaginated, and has no time filter, so it does not scale. **`get_episodes(max_episodes: 500)` is a guaranteed failure — never call it.**
2. **`get_episodes` is NOT newest-first.** It returns episodes in **UUID order** (random v4), which has no relationship to `reference_time` or `created_at`. So "the first `Session ` episode" is a *random* session, not the latest; and the "short-circuit as soon as you see an older one" trick is invalid. There is **no offset/cursor**, so you cannot page to a specific time-slice at all.
3. **`search_nodes` / `search_facts` time out** (semantic, OpenAI-backed) — independently confirmed.

**Consequence — the source-of-truth split is now load-bearing, not just tidy:**

| Slice | Reliable source | Notes |
|---|---|---|
| Positions, cash, orders | **bt-gateway** | unchanged |
| Per-position thesis / catalyst / mechanism / invalidation | **`store.listJournal()`** | the journal is authoritative and holds every field — read it, NOT graphiti |
| Recent exits + verdicts | **`store.listJournal({ type: 'exit', since })`** | reliable HTTP (30s timeout + retry) |
| Active lessons / themes | **LESSONS.md / THEMES.md** | file reads, unchanged |
| Prior news, skipped-setups | **graphiti only** (best-effort) | ⚠️ currently DEGRADED — these live only in the graph and cannot be reliably queried at scale. See step 5/6. |

Rule for any graphiti read in this skill: cap at `max_episodes: 5`, wrap in a try/timeout, treat results as **UUID-ordered (not time-ordered)**, and **never block the run on it**. If it times out, proceed — the journal + files already carry everything the critical path needs.

### 1.5 Determine the last-session window

Do **not** try to read the last `Session` episode from graphiti — `get_episodes` is UUID-ordered, so "the first `Session ` episode" is a random one, not the latest (see the section above).

Derive the window from the run type instead — it only needs to bound the "recent exits / recent news" lookback, and a generous bound is harmless because the downstream filters are date-aware:

```
morning run → last_session_ts = now - 24h
evening run → last_session_ts = now - 12h
```

If unsure of run type, default to `now - 24h`. (A slightly-too-wide window just means a few extra already-seen exits/news lines, which the date filters in steps 3/6 trim — far safer than anchoring on a random graph node.)

### 2. Per-position memory recall (journal — NOT graphiti)

The journal is the authoritative source for trade reasoning and is reliable HTTP — read it, not the graph. Pull the full journal once and index it by `trade_id`:

```
journal = await store.listJournal({ limit: 2000 });   // chronological, has every field
byId = group journal records by trade_id
for each open position (trade_id from store.getState().positions[i].trade_id):
  entry = byId[trade_id] record where type == "entry"
  reaffirms = byId[trade_id] records where type == "reaffirm" (already date-sorted ascending)
  → thesis, catalyst, catalyst_window, mechanism, expected_exit_by, invalidation_conditions
```

For backfilled / manual positions, the entry record carries `"backfilled": true` and is matched the same way by `trade_id` (or by `symbol` + entry date if the id is missing). Pull the verbatim entry thesis, catalyst, mechanism, invalidation conditions, and any mid-trade reaffirmations. **Full fidelity** — these positions are live.

> Graphiti holds the same records as `Trade entry/reaffirm/backfilled` episodes, but it is a *derived index* and the query path is unreliable (see above). The journal is the source of truth; there is no reason to read theses from the graph.

### 3. Recent outcomes since last session (journal — NOT graphiti)

From the same journal pull (or a scoped re-query), filter exits by timestamp:

```
exits = await store.listJournal({ type: "exit", since: last_session_ts });
```

`store.listJournal` supports `type` and `since` server-side and returns chronological records with a real timestamp — no UUID-ordering or timeout hazard. For each exit, read → trade_id, exit_price, pnl_pct, thesis_verdict, exit_reason. 1-line each.

### 4. Active priors & themes (files only — no graphiti)

`LESSONS.md` and `THEMES.md` are the authoritative source. Graphiti only mirrors them as derived nodes that are stale until the next retrospective.

```
- Read LESSONS.md → extract [active] and [candidate-skip-rule] entries (title + n + last-reinforced)
- Read THEMES.md → extract active themes
- Flag entries promoted to [active] or moved to [retired] in the last 7 days
```

No graphiti call in this step. Faster, simpler, no failure mode.

### 5. Pending decisions

**Reaffirm-watch and tripwires (reliable):**
```
reaffirms_open = match each open position to its most recent type=="reaffirm" journal record
               flag positions where days_held >= expected_exit_by - 3
```
- Positions approaching planned exits (time-based or target-based) — from the journal pull in step 2.
- Regime tripwires close to firing (read from `rules/bvb_rules.json` evaluation in this run's macro-analyst output — not graphiti).

**Skipped setups still in their invalidation window (⚠️ graphiti-only — DEGRADED):**
```
best-effort: episodes = get_episodes(group_ids: ["auto_trader"], max_episodes: 5)   // try/timeout
skipped = episodes where name starts with "SkippedSetup "
        AND parse(content).date + invalidation_window_days >= today
        AND no companion "Counterfactual ..." episode exists for the same skip
```
SkippedSetup records live **only** in graphiti, and a 5-episode pull cannot reliably surface the open skip-window set. Treat this slice as **best-effort**: if the pull returns nothing or times out, emit the section as `(skipped-setup tracking unavailable — graphiti not queryable at scale; see KNOWN GAP)` and continue. Do not block. The authoritative remedy is to persist skips to a Firestore-backed store (see KNOWN GAP at the bottom of this skill).

### 6. Prior news context (⚠️ graphiti-only — DEGRADED, last 14 days)

News records live **only** in graphiti. A 14-day window needs far more than the ~5 episodes `get_episodes` can return before timing out, and UUID ordering means the 5 you get are not the most recent. **This slice cannot be satisfied as written until the infra gap is fixed** (persist news to Firestore, or add a paginated/time-filtered graph query). Until then: attempt a best-effort `get_episodes(max_episodes: 5)`, surface whatever `News ` items come back, and label the section `(prior-news partial — graphiti not queryable at scale; see KNOWN GAP)`. Never block the run on it.

```
best-effort: episodes = get_episodes(group_ids: ["auto_trader"], max_episodes: 5)   // try/timeout
news = episodes where name starts with "News "
     AND parse(content).date >= today - 14 days
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

## Failure mode — graphiti degraded is the NORMAL state

graphiti is no longer on the critical path. The brief's core — portfolio (bt-gateway), per-position theses + recent exits (`store.listJournal`), active lessons/themes (files) — has **no graphiti dependency** and always works as long as bt-gateway and the repo are reachable.

The only graphiti-dependent slices are **prior-news** (step 6) and **skipped-setup tracking** (step 5), both of which are *currently degraded by design* because the MCP can't query the graph at scale (see KNOWN GAP). So:

- If the best-effort `get_episodes(max_episodes: 5)` returns or times out, it doesn't matter — emit those two sections with their `(… not queryable at scale; see KNOWN GAP)` label and move on.
- Only raise a Telegram banner when **bt-gateway** is unreachable (`⚠️ GATEWAY UNAVAILABLE — no live positions/journal; brief built from files only`). A graphiti timeout is no longer banner-worthy — it's expected.

### What about the Session ingest at the end (step 8)?

`add_memory` is a write call. If it fails, log to stderr; the brief was still produced and sent. Non-blocking — the window in step 1.5 is derived from run-type, not from reading prior Session episodes, so a missed write costs nothing.

## KNOWN GAP — news + skipped-setups are graphiti-only and not queryable at scale

`get_episodes` has no time filter, no pagination, and times out above ~8 episodes; `search_*` time out entirely. News and SkippedSetup records live **only** in the graph, so the engine currently cannot reliably reconstruct "news in the last 14 days" or "open skip windows." Trade theses/exits are unaffected because they come from the Firestore journal.

**Fix (tracked, not yet done):** give news + skipped-setups the same Firestore-backed home the journal has (add `store.listNews({since})` / `store.listSkips({since})` behind bt-gateway), then route steps 5/6 to those. Alternatively, add a time-filtered/paginated query to the graphiti MCP. Until one of those lands, steps 5/6 stay best-effort and the brief labels them partial. **Do not "fix" this by raising `max_episodes` — that just reintroduces the timeout.**

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
