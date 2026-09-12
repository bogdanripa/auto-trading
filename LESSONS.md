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

### M-3: verifying "is this move market-wide or idiosyncratic" is fast, cheap, and must be done live before trusting a dislocation trigger (2026-08-31; journal/2026-08.md, promoted 2026-09-01 monthly)
On 2026-08-31, IARV showed −10.24% intraday with no company-specific news
found. Rather than assume either "panic, buy" or "something's wrong, don't
buy," the run cross-checked the move against BET (−7.08% off ATH that same
session) and against another liquid, unrelated name (SNP, also down that
day) before acting on the pre-armed IARV/TLV conditionals. Both checks took
minutes, used only public quotes, and turned an ambiguous single-name
signal into a confidently-diagnosed market-wide dislocation — the exact
scenario ENGINE.md §3.4's "prepared buyer with cash" edge exists for.
Recorded as a market lesson because it is about how BVB dislocations
present (a broad move often shows up as an outsized move in the thinnest,
highest-beta name first) as much as a process lesson: **before trusting any
single-name gap as a dislocation-playbook trigger, check it against one
other liquid name and the index in the same run — a move that isn't
corroborated either way is not yet diagnosed, and diagnosis is cheap enough
that there's no excuse to skip it.**

## Process lessons

### P-6: August's failures were entirely in process/verification, never in market or company analysis (2026-09-01 monthly; journal/2026-09.md)
Auditing every assumption that reached its check-by date in August: A2 (SNN
H1 confirms Q1 strength), A3 (TLV H1 keeps guidance alive), A6 (fee model),
and A7 (IARV H1 ≥1.5x YoY) all **held** — every one of them a claim about a
market, a company, or a number. A5 (unattended runs execute cleanly) and A6b
(the TLV buyback is live price support) both **broke** — both claims about
the engine's own infrastructure or its own diligence hygiene, not about BVB
or any issuer. Four-for-four on analysis, zero-for-two on process is a
useful and specific signal: **when this engine is wrong, look first at
whether a fact was re-verified, a tool call trusted uncritically, or a run
actually executed — not at whether the underlying investment thesis was
sound.** This reframes where review effort belongs: LESSONS.md M-2 (re-
verify standing facts) and P-4/P-5 (cadence and pause discipline) are
already aimed at exactly this category and should stay in force; future
monthly retrospectives should re-run this same held/broke-by-category split
and flag it immediately if a market/thesis assumption ever starts breaking
at a similar rate — that would be a different, more serious problem than
anything seen in month one.

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

### P-8: a well-written falsification condition doesn't need a contradicting statement — silence at the specified event is itself the signal (2026-09-12 weekly; journal/2026-09.md)
Assumption A12 was written 2026-08-26 with an explicit, pre-committed falsification rule: "if management cannot date resolution [of the ANCPI backlog] at the Investor Day, treat as broken." At the actual Sep 11 Investor Day, ONE's management did not deny the backlog, did not reaffirm the "primarily 2027" framing, and did not contradict anything — they simply never raised the topic, across a granular, well-covered event that discussed NAV targets, occupancy rates, and US deal terms in detail. The temptation in the moment is to treat an absence of bad news as inconclusive and defer grading again ("we didn't get new information either way"). The pre-written rule existed precisely to prevent that: it was written before the event, without knowing which way it would cut, specifying silence itself as sufficient for a "broken" grade. Applying it as written — rather than searching for a reason to call it merely "unclear" because nothing was said explicitly — is what let the grading happen cleanly and on schedule. **Lesson: when an assumption's falsification condition is framed as "if X is not addressed/dated by event Y, treat as broken," the engine must actually grade it broken on silence, not wait indefinitely for an explicit contradicting statement that the company has every incentive never to give.** This is a strong argument for writing assumptions with exactly this kind of silence-triggers-failure structure whenever a company can be expected to control its own disclosure timing.

### P-9: filling entry bands can simultaneously exhaust the dislocation reserve's readiest targets — a portfolio needs at least one uncapped, diligenced candidate at all times (2026-09-12 weekly; journal/2026-09.md)
By 2026-09-11, both TLV (standard T2 band) and IARV (H1-confirmed T2) had reached their respective position caps through separate, individually correct decisions made over several weeks. That same week, BET closed within ~0.3% of the −10% dislocation tier (STRATEGY §6). The result: if the −10% tier fires, the two most-vetted, highest-conviction names in the book have zero room left to absorb the reserve slice, and the next most-ready alternative (ONE) was independently demoted the same week for an unrelated reason (kill criterion hit). What's left armed is ARS and TTS at their existing, already-conservative bands — adequate, but not the deepest-conviction options in the book. Each individual capping decision was right on its own terms (discipline, not chasing, not over-concentrating); the aggregate effect — a full reserve with no ready high-conviction home for it — was not something any single weekly review was set up to notice, because "check position caps" and "screen new candidates" have always been separate checklist items. **Lesson: a weekly review should explicitly check whether currently-armed conditionals still have room to absorb the next dislocation tier's reserve slice, and if the two-highest-conviction names are both capped, that by itself is a reason to accelerate diligence on a new candidate — not just a "nice to have" data point buried in a candidate-screening paragraph.**

### P-7: a rejection deserves the same verification rigor as an acceptance (2026-09-05 weekly; journal/2026-09.md)
PBK was demoted off active candidacy on 2026-08-24 with specific cited
figures: "NPL rose 4.4% → 5.2%, coverage fell 56.3% → 52.7%." A 2026-09-05
reconciliation against Patria Bank's own FY2025 IR presentation and H1 press
coverage found the 5.2%/52.7% endpoint did not match any primary or
press-sourced figure found — the real pattern was a one-quarter wobble
(NPE 3.6%→4.38%, coverage 56%→53%, Dec 2025→Mar 2026) that had already
reversed by H1 (NPE 3.93%, coverage 57%, Jun 2026). The demotion's
directional call (stay cautious pending FY26 confirmation, given the
~30%-one-off-reliant profit target) still holds up, but the specific numbers
used to justify it did not survive a second look. **The engine's diligence
discipline (STRATEGY §3's "which edge is this" test, liquidity checks, fresh
primary-source reads) has so far been applied mainly to candidates being
*added* — SNN's re-band, ONE's H1 condition, ALRO's screen. A name being
*rejected* is just as much a real-money-adjacent decision (it forecloses an
opportunity cost) and deserves the same rigor, not a one-time cite that then
goes unchecked indefinitely.** Practical rule adopted: when a demoted/avoided
name resurfaces with data that looks contrary to the original demotion
(as PBK's H1 did), re-verify the *original* demotion's own figures against
primary sources before either reversing or reaffirming — do not assume the
first pass was right just because it came first.

## Assumption-grading notes

_Grades accumulate in journal entries; patterns worth keeping get promoted here._
