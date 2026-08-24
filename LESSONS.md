# LESSONS.md — what the engine has learned

Durable lessons distilled from the journal. Each cites the journal entries that
produced it. Market lessons describe how BVB behaves; process lessons describe
how this engine's own reasoning succeeds or fails. Lessons are removed only when
contradicted by newer evidence (note the removal here with rationale).

## Market lessons

### M-1: BVB energy names' H1/annual numbers mask quarter-level outage sensitivity (2026-08-24 weekly, from 2026-08-14; journal/2026-08.md)
SNN's H1 2026 headline was +36.6% YoY net profit — a number that reads as
confirmation of a strong-earnings thesis. Underneath it, **Q2 alone was ~296m
RON, down ~16% YoY**, because a single May outage window (Unit 1 down 1,237h,
Unit 2 down 624h, both simultaneously May 10–30) removed 11.7% of production.
The H1 blend hid that entirely by carrying Q1's +72.8%. For single-asset or
few-asset generators — nuclear, hydro, anything with a handful of units and a
climate/water dependency — **read quarter-by-quarter and ask which quarter the
outages landed in**; an H1-vs-H1 or FY-vs-FY comparison averages away exactly
the volatility that determines whether the fair-value band is real. The
practical test this produced: when a report's headline period *predates* a known
operational event, the headline is not evidence about the thesis going forward,
and management's forward commentary (or refusal to give it) is the actual
datapoint. SNN's management declined to quantify the H2 hit on the Aug 14 call,
deferring to the Q3 update (~November) — that refusal was more informative than
the +36.6%.

### M-2: A "standing support" fact can silently expire — re-verify, don't inherit (2026-08-24 weekly; journal/2026-08.md)
WATCHLIST.md carried "Support: issuer buyback running (up to 5M shares, max
price 38 RON, executed weekly via BTCP)" under the TLV thesis from inception
(2026-08-02) onward. The programme was **formally finalized and closed by TLV's
board on 2026-05-22** (BVB current report `TLV_20260522160244`) — three months
before the engine ever wrote it down as live. The repurchased shares went into
a staff loyalty allocation on 2026-05-28, so they are not float overhang either.
The error was inherited from bootstrap research and never re-checked. It did not
change a decision this time (the engine wasn't adding anyway), but "the issuer
bids underneath this price" is precisely the kind of comfort that makes paying
up feel safe — it could easily have justified a chase. **Any thesis leaning on a
standing support or structural fact — a buyback, a state programme, a signed
contract, an index inclusion — must have that fact re-verified against a primary
source at each weekly review, not verified once at thesis-writing time.** Facts
with expiry dates decay silently; the thesis document does not warn you.

## Process lessons

### P-5: An indefinitely repeated "pause" is decision-avoidance, not discipline (2026-08-24 weekly; journal/2026-08.md)
The SNN tranche-1 order was paused on 2026-08-06 for good reason (an unfolding
Cernavodă drought crisis) and then re-affirmed as "paused, conditions unmet" in
**eleven consecutive journal entries over three weeks**. Every individual pause
was correctly reasoned. The pattern was not: not one of those entries asked the
question that actually mattered — *is 64.60 still the right price for this
asset?* It wasn't. The 64.60 band derived from a 75–90 fair-value band whose
premise (continuing record production) died on Jul 28; a re-underwrite on
2026-08-24 put fair value nearer 55–70 and found the market trading ~14% *above*
analyst consensus (56.21), meaning the entry band had been wrong — not merely
blocked — for weeks, and the pause obscured that rather than revealing it.
Distinguish the two states explicitly: **"waiting for a defined trigger on an
still-valid plan" is discipline; "the plan's premise changed and I keep deferring
the re-underwrite" is avoidance.** Operational rule adopted: a paused order
re-affirmed without change across **two consecutive weekly reviews** must be
resolved into either an active plan with a freshly-derived band or a
triggered-watch with explicit conditions — it may not simply be paused a third
time. Note the interaction with P-4: this failure was only possible because the
weekly runs (whose job this is) were not firing, while the daily runs correctly
stayed in their monitor lane. A broken cadence does not just delay grading — it
lets stale plans keep executing unexamined.

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
