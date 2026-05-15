---
name: backfill-graphiti
description: Replay trade-journal records from bt-gateway's Firestore into the graphiti graph memory. Use this once at initial setup to seed graphiti with historical trades, and ad-hoc whenever a multi-day graphiti outage caused real-time ingests to be lost. Trigger when the user says "backfill graphiti", "seed the graph", "replay missed ingestions", or after standing up a new graphiti instance.
---

# Backfill Graphiti

One-off and as-needed replay of records from the source-of-truth Firestore store into graphiti. Idempotent — safe to re-run; graphiti dedupes by reference time + content.

**The journal IS the replay queue.** There's no separate queue collection. The only data that's authoritatively persisted in Firestore is the trade journal; everything else (news, skipped setups) lives only in graphiti. So this skill's primary job is replaying journal records — news/skips lost to outages are not recoverable here (re-run those skills with a wider lookback to catch up).

## When to use

1. **Initial seed** (one-time, when graphiti is first deployed): replay the full journal so the graph isn't empty on day one.
2. **Outage recovery**: when graphiti was unreachable during one or more runs, this skill re-ingests journal records the live skills couldn't write.
3. **Schema refresh**: when the graphiti entity-type schema changes meaningfully, replay everything so older episodes get re-extracted with the new types.

## Process

### 1. Determine scope

Ask the user (or infer from trigger):
- `initial` — every journal record ever
- `since` — every journal record since a given date
- `outage` — every journal record since the start of the known outage

### 2. Replay journal entries

```
const records = await store.listJournal({ since: <window>, limit: 10000 });
for (const r of records) {
  await mcp__graphiti__add_memory({
    name: `Trade ${r.type} ${r.trade_id}`,
    episode_body: JSON.stringify(r),
    source: "json",
    source_description: `trade-journal ${r.type} record (backfill)`,
    group_id: "auto_trader",
    reference_time: r.timestamp
  });
}
```

Order matters: replay entries before exits so graphiti can resolve entry→exit edges by `trade_id`. Sort by timestamp ascending before iterating.

### 3. (Optional) Manual news / skip catch-up

News and skipped-setup records are not Firestore-backed, so they can't be replayed from a canonical source. If a multi-day graphiti outage occurred:
- Manually re-run `bvb-news` with a wider lookback window — it will re-fetch and re-ingest material items
- Re-running `market-scanner` doesn't replay history (each scan is a snapshot in time), so historical skips during the outage are simply lost. New skips from the next scan onward will flow normally.

This is by design — these data types are derivable from their upstream sources, so losing a window of them is a recoverable annoyance, not a correctness break.

### 4. Rate-limit + checkpoint

Graphiti's LLM extraction takes 1-5s per episode. For large backfills (thousands of records):
- Insert at most 5 episodes per second to avoid overwhelming the extractor
- Checkpoint progress to a local file (`./.backfill-checkpoint.json`) so a crash can resume rather than restart
- Log every 100 records to Telegram for visibility on long runs

### 5. Verify

After ingestion, run sanity queries:

```
mcp__graphiti__search_nodes(query: "Trade", limit: 1, group_id: "auto_trader")
```

Confirm the most recent record appears with a reasonable `valid_at` timestamp. If the graph looks empty after a successful run, something is wrong with the MCP wiring — escalate to the user, don't silently continue.

### 6. Report

Send a Telegram summary via `telegram-reporter`:

```
🌱 GRAPHITI BACKFILL — <date>

Scope: <initial|since|outage>
Journal entries replayed: <N>
Failed (logged): <N>
Total LLM extraction tokens: ~<estimate>
Duration: <minutes>
```

## Failure handling

- **Individual record fails extraction**: log to a `backfill_failures` file, continue. Don't abort the batch.
- **Graphiti unreachable mid-run**: stop, save checkpoint, surface to Telegram. Next invocation resumes from checkpoint.
- **Authentication failure (401)**: do NOT retry blindly — the env vars may have rotated. Surface to user and exit.

## Idempotency

Graphiti dedupes by `(name, reference_time)` within a `group_id`. Re-running a backfill on already-ingested records produces no-ops, not duplicates. Safe to run if unsure whether previous runs completed.

## Not in scope

- This skill does NOT compute counterfactuals on backfilled SkippedSetups — `counterfactual-mapper` is responsible for that, and it'll pick up the backfilled records on its next daily run.
- This skill does NOT modify any source-of-truth data in bt-gateway. It's read-only against Firestore, write-only to graphiti.
