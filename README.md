# auto-trading — BVB Autonomous Investing Engine

An autonomous long-term investor on the Bucharest Stock Exchange, run entirely by
Claude on scheduled routines, trading a real-money BT Trade account.

**Mandate**: 2x the BET index return, long-term, individual Romanian stocks only.

## How it works

- **Scheduled routines** (Claude Code Routines) fire fresh Claude sessions:
  - *Daily* (trading days, pre-open): monitor, execute pre-planned actions, journal. Default outcome: no action.
  - *Weekly* (Sunday evening): deep research, portfolio review, next week's conditional plan.
  - *Monthly* (1st): retrospective, assumption audit, strategy evolution.
- **This repo is the engine's memory.** Every run reads it, appends to it, and
  pushes. The broker (BT Trade MCP) is the only source of truth for account state.
- **The engine learns**: every decision records its assumptions; later runs grade
  them; graded assumptions become lessons; lessons amend the strategy. The engine
  may rewrite its own strategy, playbooks, and scripts — with a journaled paper
  trail — and its constitution only through a cooling-off process.

## Map

| Path | What it is |
|---|---|
| `ENGINE.md` | Constitution: mandate, hard rules, decision protocol, governance |
| `STRATEGY.md` | Living strategy (versioned, changelog) |
| `WATCHLIST.md` | Tracked names: theses, fair-value bands, entry triggers |
| `LESSONS.md` | Durable market + process lessons, cited to journal entries |
| `routines/` | Playbooks for daily / weekly / monthly runs |
| `journal/` | Append-only decision journal, one file per month |
| `state/` | Baseline, benchmark series, positions metadata, routine trigger IDs |
| `scripts/` | Small zero-dependency helpers (benchmark fetch, etc.) |

## For the owner

Interventions welcome any time: trade manually (the engine will notice and stay
out of your way), leave a note by committing to the repo, veto a proposed
constitution change by replying to the Telegram briefing, or pause the routines.
The engine assumes silence means consent.
