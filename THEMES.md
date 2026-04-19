# BVB Engine — Structural Themes

Active structural themes that bias our sector/ticker selection on top of daily technical setups. Themes are macro narratives (monetary pivots, fiscal shocks, commodity regimes, geopolitical events) mapped to **specific BVB tickers** that benefit or suffer.

**Status markers (same scheme as LESSONS.md):**
- `[active]` — theme is tradeable right now; feeds every morning's synthesis
- `[candidate]` — observed but not confirmed; not yet driving decisions
- `[retired]` — theme has played out, been priced in, or was wrong; kept for history

**Key principle:** this is not a list of predictions. It's a list of structural biases we're willing to overweight during signal selection. A swing setup in a stock that fits an active theme gets a +1 conviction bump; a setup against an active theme requires stronger technicals to enter.

**Key constraint:** we trade BVB only. Every theme must end in a BVB ticker or explicitly say "no BVB play" (in which case the theme is noted for context but not actionable here).

**Anchored to:** `macro-analyst/references/bvb-historical-patterns.md` (decade-scale reference document, April 2026 snapshot). Rules that encode specific thresholds live in `rules/bvb_rules.json`. Themes in this file are the *narrative context* that tell synthesis *why* a firing rule should or shouldn't be acted on.

## Active Themes

### [active] NBR first-cut pivot (May 2026 meeting)
**Narrative:** NBR has held 6.50% for 12 consecutive meetings (since Aug 2024). Inflation peaked at 9.8-9.9% in Sep-Oct 2025 and is dragging toward target. The historical template (Oct 2021 hiking cycle start) shows banks re-rate +8-12% per 100bp over 2-3 months; the reverse is symmetric on first cuts. First cut is consensus for the May 2026 meeting.
**BVB mapping:**
- **TLV (Banca Transilvania)** — highest-beta growth bank, most direct re-rating candidate (though banks often pre-price)
- **BRD** — higher dividend yield (5-7%), more defensive version
- **ONE (One United Properties)** — highest rate-sensitivity on BVB; every +100bp historically delivered -15 to -20%. Reverse is the trade.
- **IMP (Impact Developer)** — same real-estate/rates dynamic, thinner liquidity
**Encoded rules:** `RAT-3` (long BET 5 days pre-meeting, expect +2-4%)
**Signals to track:** NBR Inflation Report (May 2026), MPC communication tone, CPI prints vs. consensus (`RAT-4`)
**Risk to thesis:** CPI re-acceleration, fiscal slippage forcing NBR to hold, rating downgrade pre-empting the cut
**Added:** 2026-04-19   **n_trades_tagged:** 0

### [active] MSCI Emerging Markets upgrade review (June 2026)
**Narrative:** MSCI upgraded Romania to Advanced Frontier in June 2025. Full Emerging Markets upgrade at the June 2026 review is a realistic scenario given market-cap/liquidity progress (H2O IPO, BET ATH 29,615, ~70% YoY rally). Estimated +$180m passive inflows; sample EM-upgrade precedents deliver +8-15% basket returns over 1-3 months.
**BVB mapping (basket play):**
- **TLV, H2O, SNP, BRD** — the four names most likely to hit MSCI Standard Index inclusion on a Romania EM upgrade
**Encoded rules:** `IDX-2` (long basket, expect +8-15% over 90d); `IDX-1` also fires in the T-40 to T-1 FTSE window
**Signals to track:** MSCI consultation documents, FTSE Russell reclassification notes, annual review dates
**Risk to thesis:** MSCI defers again; one rating agency downgrades before review (would disqualify)
**Added:** 2026-04-19   **n_trades_tagged:** 0

### [active] Rating downgrade tail — the discipline tripwire
**Narrative:** All three agencies (S&P Apr 2026, Moody's Mar 2025, Fitch Dec 2024) sit at BBB-/Baa3 with Negative outlook. 2024 budget deficit at 8.6% of GDP, EDP escalated by EU Council June 2025, €869m of PNRR suspended. This is the **highest-risk configuration in the 2015-2026 dataset** for a discontinuous regime change. A downgrade to BB+/Ba1 would force IG-mandate selling: historical analogs suggest -6 to -12% within a week.
**BVB mapping (what to avoid, not buy):**
- This is a **hedge discipline**, not a long thesis. When firing, the engine reduces longs to ≤20%.
- Banks (TLV, BRD) are the highest-beta negatively correlated names.
**Encoded rules:** `RATAG-2` (downgrade fires → max defensive, longs ≤20%). `RATAG-1` and `FX-3` (EUR/RON breaks 5.10) are leading indicators.
**Signals to track:** all three agency calendars, EUR/RON 5.00-5.10 band, RO 5Y CDS trend, PNRR disbursement news, fiscal-ordinance leaks (`POL-1`)
**Risk to thesis:** actually the bull case — an affirmation with stable outlook (fires `RATAG-3`) is +1-2% relief rally.
**Added:** 2026-04-19   **n_trades_tagged:** 0

### [active] Post-election relief regime
**Narrative:** Nicușor Dan (pro-EU) won the May 2025 runoff after annulment of the November 2024 first round. BET +7% cumulative through May 28, 2025. The current equity rally to ~28,900 is partly a relief premium on avoided anti-system outcome. This theme is **active but late-stage** — supportive of current longs, not a reason to add aggressively.
**BVB mapping:** broad BET, no single name
**Encoded rules:** `POL-3` (court/official resolution after >5% selloff → +3-5%) — fires on new political events, not the background rally
**Signals to track:** government stability, coalition dynamics, next fiscal package timing
**Risk to thesis:** coalition collapse triggers early elections; fiscal package leaks (`POL-1`) would override this theme
**Added:** 2026-04-19   **n_trades_tagged:** 0

## Candidate Themes

### [candidate] Neptun Deep gas production ramp (first gas 2027)
**Narrative:** OMV Petrom + Romgaz JV on Black Sea offshore gas. Platform/pipeline construction underway; first gas targeted late 2027. TGN midstream benefits from new Romanian gas volumes and the BRUA/Vertical Corridor capex cycle. TGN +233% YoY to April 2026 has already priced a lot of this.
**BVB mapping:**
- **SNG (Romgaz)** — 50% JV stake; but note post-2022 windfall-cap regime **broke TTF sensitivity** (0.70 → 0.30); dividend collapsed from RON 3.42 (2023) to RON 0.16 (2024)
- **SNP (OMV Petrom)** — 50% JV stake + operator; **removed from FTSE All Cap Feb 2026** (12-month exclusion, passive-flow headwind)
- **TGN (Transgaz)** — cleanest exposure; already up 233% YoY — mean-reversion risk
**Encoded rules:** no direct rule; `GEO-2` (Ukraine ceasefire → long reconstruction including TGN) overlaps
**Signals to track:** quarterly earnings from SNG/SNP, platform installation milestones, offshore tax regime commentary
**Upgrade criteria:** first-gas timeline confirmed on-schedule AND FTSE re-inclusion path for SNP
**Added:** 2026-04-19

### [candidate] AI / datacenter power demand → Romanian utilities
**Narrative:** EU datacenter buildout accelerates structural power demand. Romania has cheap, low-carbon base load (nuclear + hydro). Power generators and grid operators benefit. **Caveat:** OUG 27/2022 windfall caps and July 2025 electricity-cap removal change the pass-through math materially — do not assume pre-2022 sensitivities.
**BVB mapping:**
- **H2O (Hidroelectrica)** — 100%-payout hydro, BET's largest weight (~15.7%). Hydrology-dependent (`COM-3`: drought short signal).
- **SNN (Nuclearelectrica)** — nuclear base load; Cernavoda Unit 3-4 multi-year capex
- **TEL (Transelectrica)** — grid operator, regulated returns (Jan 1 ANRE reset)
- **EL (Electrica)** — distribution + supply, mixed
**Encoded rules:** `COM-3` (hydrology drought → short H2O)
**Signals to track:** EU datacenter announcements in CEE, ANRE tariff decisions (Jan TEL, Oct TGN)
**Upgrade criteria:** concrete CEE datacenter PPA signed with Romanian generator; reservoir levels healthy
**Added:** 2026-04-19

### [candidate] Defense spending acceleration to 2.5%+ of GDP
**Narrative:** Romania committed to 2.5%+ GDP defense spending post-Ukraine. BVB has limited direct defense names (no listed defense primes); closest beneficiaries are construction/industrial suppliers. Watch for index composition changes if defense-adjacent names IPO.
**BVB mapping:**
- No clean direct play today; TRP (industrial/PVC), CMP (auto supplier, weakened) are weak adjacencies
- Monitor any defense-sector IPO announcements
**Encoded rules:** none; `GEO-1/GEO-2` cover Ukraine escalation/ceasefire both ways
**Upgrade criteria:** a listed BVB name derives >25% revenue from defense contracts
**Added:** 2026-04-19

## Retired Themes

_None yet_ — but see `LESSONS.md` for **retired correlations** (TTF→SNG pass-through, SNG as high-yield, DIGI as RO telecom, ALR as LME proxy) that invalidate some historical plays.

## Proposed New Themes / Status Changes

_None pending. When macro-analyst spots a new structural shift or a change to an existing theme's status, it appends here for user review. The engine never promotes/retires themes autonomously._

---

## How themes affect decisions

**At entry (synthesis step):**
- A setup in a ticker that maps to an `[active]` theme: conviction +1 (scale 0-10)
- A setup that runs against an `[active]` theme: require an extra confirmation signal (news, earnings beat, technical breakout with volume) before entering
- `[candidate]` themes don't adjust conviction but inform the watch list
- **The rating-downgrade tail (`RATAG-2`) is not additive** — it overrides and caps longs at 20% when firing, regardless of other themes

**At exit:**
- If the theme retires while we still hold, the exit plan is re-evaluated — the thematic tailwind is gone, so the edge is weaker
- Trade-journal exit record captures which theme (if any) the trade was tagged with

**At review (retrospective):**
- Compute win rate per theme. A theme with 0% win rate over 5+ tagged trades is a retirement candidate.

## Regime caveat (April 2026)

The reference document flags: "after the 70% YoY rally to April 2026, the engine should **bias toward mean-reversion over trend-following at current levels**." This is surfaced to the synthesis layer as a caveat — it does not reset any rule thresholds, but it should make the engine skeptical of breakout setups and more willing to act on POL-3/RATAG-3 relief-rally triggers.
