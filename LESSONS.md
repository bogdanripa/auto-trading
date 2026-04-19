# BVB Engine — Lessons Learned

Distilled from the trade journal by the `retrospective` skill. This file is the strategy's living memory — read at the start of every morning run, updated weekly.

**Status markers:**
- `[active]` — enough evidence (n ≥ 10), feeds into daily synthesis
- `[candidate]` — pattern observed but not yet conclusive (n < 10)
- `[retired]` — contradicted by later data; kept for history

## Active Lessons

_None yet. The engine has not been running long enough to generate active lessons._

## Candidate Lessons

_None yet._

## Retired Lessons

These are **retired correlations / priors** imported from the decade-scale reference document (`macro-analyst/references/bvb-historical-patterns.md`). They are recorded here so the engine and any future retrospective do not re-learn them from pre-regime-break data. Each entry cites the break point that invalidated the prior.

### [retired] TTF natural gas → SNG linear pass-through
Source: `bvb-historical-patterns.md` §3 (Energy sector) and §6 (Regime breaks).
Pre-OUG 27/2022 TTF-SNG correlation ran ~0.70. The 2022 windfall caps (regulated RON 150/MWh gas price floor, 80% electricity tax above RON 450/MWh) absorbed the upside; post-2022 correlation collapsed to ~0.30. The 2022 European gas price spike to €300 did **not** fully pass through to SNG profits.
Implication: do not size SNG longs on TTF moves alone; rule `COM-2` requires TTF >€50/MWh AND a named supply disruption before firing. Retired 2026-04-19.

### [retired] SNG as a high-yield name
Source: `bvb-historical-patterns.md` §3 (Energy) and §6 (Risk warnings).
SNG paid the largest-ever dividend in BVB energy history in July 2023 (RON 3.42 gross, 8.75% yield). Windfall tax absorption then collapsed the payout **96% YoY** to RON 0.16 in 2024. **Trailing yield is not forward yield** for state-owned energy stocks under an active windfall regime.
Implication: never use trailing dividend yield as a thesis anchor for SNG / SNP / SNN. Forward yield must be triangulated from explicit state dividend directives (OUG 109/2011 90% payout guidance) plus the current windfall-tax scope. Retired 2026-04-19.

### [retired] DIGI as a Romanian telecom proxy
Source: `bvb-historical-patterns.md` §3 (Tech/Telecom).
DIGI went from RON 11.60 ATL (May 2019) to RON 76.90 ATH (Feb 2026, +560%) driven entirely by **Spanish market consolidation** (MásOrange remedies, €120m spectrum acquisition, €750m FTTH sale to Macquarie). It is no longer driven by Romanian telecom fundamentals.
Implication: read DIGI as an event-driven name on EU/CNMC regulatory decisions and Spanish M&A, not as a play on Romanian telecom demand. Leverage watch is critical: net debt/EBITDA >3.5x triggers derating. Retired 2026-04-19.

### [retired] ALR as a clean LME aluminum proxy
Source: `bvb-historical-patterns.md` §3 (Industrial).
ALR-LME aluminum beta is only ~0.24, dampened by a long-term regulated electricity contract with Hidroelectrica. The strongest LME sensitivity appears at >$3,000/t — below that, ALR's cost structure dominates. ALR is **inversely sensitive to Romanian wholesale electricity prices** (electricity is ~40% of cash costs; the 2022 crisis crushed margins).
Implication: LME-driven setups on ALR require either a >$3,000/t threshold break or a simultaneous Romanian wholesale electricity move in the opposite direction. Retired 2026-04-19.

### [retired] Oil & gas sector as homogeneous (SNP/SNG move together)
Source: `bvb-historical-patterns.md` §6 (Risk warnings).
SNP was removed from the FTSE Global All Cap in February 2026 on liquidity failure (12-month exclusion), introducing a passive-flow divergence from SNG. The two names should now be treated as distinct exposures: SNP is a Brent-beta + FTSE-passive-outflow name; SNG is a post-windfall-cap state-energy name with collapsed yield.
Implication: do not size a long-oil thesis by buying SNP and SNG together — they respond differently. Size each on its own rule fires. Retired 2026-04-19.

### [retired] BET responds 1:1 to big US index moves
Source: `bvb-historical-patterns.md` §1 (Executive summary) and §4 (Signal framework).
BET's daily correlation is ~0.5 with DAX and ~0.5 with Stoxx 600 Banks; S&P 500 correlation is weaker and lagged. Big Nasdaq moves do not translate cleanly.
Implication: `macro-analyst` should read US markets for narrative color, but populate `dax_overnight_pct` and `stoxx_banks_weekly_pct` into the rulebook snapshot — those are the transmission channels. Retired 2026-04-19.

## Proposed Rule Changes

_None yet. When a lesson becomes `[active]` and conflicts with a rule in PROJECT.md, the retrospective skill will add a proposed edit here for user review. The engine never edits PROJECT.md directly._
