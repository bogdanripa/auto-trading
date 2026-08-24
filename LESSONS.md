# LESSONS.md — what the engine has learned

Durable lessons distilled from the journal. Each cites the journal entries that
produced it. Market lessons describe how BVB behaves; process lessons describe
how this engine's own reasoning succeeds or fails. Lessons are removed only when
contradicted by newer evidence (note the removal here with rationale).

## Market lessons

_None yet — the engine started on 2026-08-02. Earn them._

## Process lessons

### P-3: The overnight scan can miss a live, multi-day crisis (2026-08-06, journal/2026-08.md)
The Aug 3, 4, and 5 daily runs each concluded "no negative news" for SNN while
Cernavodă Unit 1 had been shut down since Jul 28 (drought/low Danube levels),
the government had declared force majeure Jul 31, and Unit 2 was under
day-to-day shutdown risk with emergency Danube diversion works ongoing — front
page in ZF/Profit.ro/G4Media/Newsweek RO the entire week, and disclosed by SNN
itself via BVB current reports (Jul 29, Jul 30, Aug 4). The Aug 6 run only
found it via broader, less name-anchored search queries. Likely cause: the
prior scans' queries were narrowly "recent news [ticker]"-shaped and a slow-
building, multi-day operational crisis doesn't always surface under a same-day
framing. Fix going forward: for held/watchlist names with state/climate/
regulatory exposure (energy, utilities), include at least one broader query
without a tight date qualifier ("[company] [sector-risk keyword]") alongside
the ticker-anchored one, and cross-check the company's own BVB current-report
filing list directly, not just press search results.

### P-1: Infrastructure is not progress (inception, 2026-08-02)
A previous incarnation of this engine (built spring 2026, since deleted) grew a
gateway service, a database, a token-rotation routine, a 30-rule JSON engine,
13 skills and a social-media mirror — and was reset having never placed a live
trade. The failure mode was real: complexity absorbed all the effort that
judgment needed. This engine holds the line at: MCP broker access + git memory +
web research + written reasoning. Any run that feels the urge to build
infrastructure should first ask what decision that infrastructure would improve.

### P-2: The default action is inaction (inception, 2026-08-02)
An LLM run "wants" to produce output proportional to effort; a trading engine
that runs daily therefore drifts toward trading daily. The constitution makes
"no action" the explicit default and puts the burden of proof on action. Watch
this bias in yourself: if the week's journal shows trades without triggers from
the weekly plan, that is the bias winning.

### P-4: A scheduled routine can silently never fire — daily runs must not assume weekly/monthly cadence works (2026-08-24, journal/2026-08.md)
The weekly run (cron `0 14 * * 0`, trigger `trig_01HucP2PNqsTaKfk6WQsKtdq`) has not
fired even once since inception (2026-08-02) — missing Aug 9, 16, and 23, a full
three weeks and counting, while the daily trigger fired reliably in the same
environment the entire time. Six consecutive daily runs (Aug 17–21) flagged this
in their handoff notes with escalating urgency; the routine-level fix (checking
the Routines UI trigger config) is outside the engine's own tool access and
requires the owner. Compounding effect: A1–A5 (the inception assumption ledger)
went ungraded for three weeks, STRATEGY.md §5 stayed titled "Week of Aug 3"
long after it was stale, and no fresh weekly research/watchlist refresh happened
— the engine ran on autopilot reading the same static plan daily. Fix going
forward: (1) a daily run is not the weekly strategist and should not routinely
do the weekly run's job, but per the Aug 20/21 handoff precedent, if the weekly
trigger has silently failed for multiple consecutive expected firings, a daily
run should grade overdue assumptions and log the failure itself rather than let
the ledger go stale indefinitely — this is a deliberate, journaled exception,
not a new default. (2) Never assume a configured cron trigger is running just
because it was configured once; a run that depends on another run's cadence
(assumption grading, weekly strategy refresh) should check for evidence of that
run's actual execution (a journal entry in the expected window), not just trust
the schedule exists.

## Assumption-grading notes

_Grades accumulate in journal entries; patterns worth keeping get promoted here._
