# Monthly run — retrospective & strategy evolution

**Schedule**: 1st of each month, ~10:00 Bucharest time.
**Purpose**: step back. Judge the engine — not the week's trades but the
system itself: strategy, process, assumptions, even this playbook. This is the
run where the engine is allowed to change its mind about how it operates.

## Checklist

1. **Orient**: read everything — ENGINE.md, STRATEGY.md full changelog,
   LESSONS.md, all of last month's journal, `state/benchmark.csv` history.
2. **Score the month**: portfolio return vs BET and vs 2×BET (monthly and since
   inception); dividend income; realized/unrealized P&L per position; costs paid
   (fees as % of portfolio); turnover. Write the table into the journal.
3. **Trade autopsy**: for every position opened, closed, or held through the
   month — was the *decision* right given information available at the time
   (process), separately from whether it *worked* (outcome)? Four quadrants:
   good-call-good-outcome … bad-call-good-outcome (the dangerous one). Be
   specific about which.
4. **Counterfactuals**: what did the engine consider and NOT do, and what would
   it have returned? (Watchlist names not bought, exits not taken.) This is
   where hesitation and overcaution become measurable instead of invisible.
5. **Assumption ledger audit**: grade rates across the month — what fraction of
   assumptions held? Which *category* of assumption keeps breaking (macro
   timing? valuation? liquidity? own-behavior?)? Feed LESSONS.md.
6. **Strategy evolution**: given all the above — does STRATEGY.md still describe
   the best strategy this engine can run? Amend with version bump and full
   rationale, or explicitly reaffirm it. Consider: allocation between core
   large-caps and small/mid alpha, cash reserve policy, cadence of the routines
   themselves (retune via `update_trigger` + `state/routines.json` if warranted).
7. **ENGINE.md amendments**: apply any cooling-off amendment proposed ≥7 days
   ago that survived reflection and received no owner veto; propose new ones if
   the month's evidence warrants (ENGINE.md §6).
8. **Hygiene**: previous month's journal file is now closed (immutable); open
   the new month's file. Verify `state/` files are consistent with broker
   reality. Verify the routines fired as scheduled last month (`list_triggers`);
   repair or retune if not.
9. **Journal, report, push**. Telegram briefing: the monthly letter — honest,
   numbers-first, in the voice of a fund manager writing to their single LP:
   performance vs mandate, what was learned, what changes, what would make next
   month a failure.
10. **X post**: publish the monthly letter as a thread (routines/x-posting.md) —
    the flagship public artifact of the experiment.

## Guardrails specific to this run

- Do not trade in this run. Analysis only; any trade ideas it produces go to the
  weekly plan. Separating judgment-of-system from in-system action keeps both honest.
- Resist strategy churn: a strategy needs time to be judged. Amend on evidence,
  reaffirm on noise. State explicitly which one you are doing and why.
