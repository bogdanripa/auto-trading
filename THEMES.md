# BVB Engine — Structural Themes

Active structural themes that bias our sector/ticker selection on top of daily technical setups. Themes are macro narratives (AI datacenter buildout, energy conflict, defense cycle, etc.) mapped to **specific BVB tickers** that benefit or suffer.

**Status markers (same scheme as LESSONS.md):**
- `[active]` — theme is tradeable right now; feeds every morning's synthesis
- `[candidate]` — observed but not confirmed; not yet driving decisions
- `[retired]` — theme has played out, been priced in, or was wrong; kept for history

**Key principle:** this is not a list of predictions. It's a list of structural biases we're willing to overweight during signal selection. A swing setup in a stock that fits an active theme gets a +1 conviction bump; a setup against an active theme requires stronger technicals to enter.

**Key constraint:** we trade BVB only. Every theme must end in a BVB ticker or explicitly say "no BVB play" (in which case the theme is noted for context but not actionable here).

## Active Themes

### [active] AI / datacenter power demand → Romanian utilities
**Narrative:** EU datacenter buildout accelerates structural power demand. Romania has cheap, low-carbon base load (nuclear + hydro) and grid interconnection ambitions. Power generators and grid operators benefit from both rising wholesale prices and capex tailwinds.
**BVB mapping:**
- **H2O (Hidroelectrica)** — cheap hydro, dividend-rich, beneficiary of rising wholesale
- **SNN (Nuclearelectrica)** — nuclear base load, Cernavoda Unit 3-4 project provides multi-year capex story
- **TEL (Transelectrica)** — grid operator, regulated returns, benefits from grid buildout capex
- **EL (Electrica)** — distribution + supply, mixed exposure
**Signals to track:** EU datacenter announcements in CEE, BNR inflation commentary on energy, ANRE tariff decisions, EU electricity market reform
**Risk to thesis:** price caps / windfall taxes reappear; regulatory clamp-down
**Added:** 2026-04-19   **n_trades_tagged:** 0

### [active] BNR higher-for-longer → Romanian banks
**Narrative:** BNR key rate stuck at 6.5% since mid-2024 with inflation still above target. NIM remains wide for BVB banks. Until BNR signals easing, bank earnings quality is high.
**BVB mapping:**
- **TLV (Banca Transilvania)** — largest retail book, benefits most from rate persistence
- **BRD** — smaller, but similar dynamics
**Signals to track:** BNR meetings (~8/year), inflation prints, wage growth, NPL ratios
**Risk to thesis:** BNR pivot on surprise inflation drop; asset quality deterioration
**Added:** 2026-04-19   **n_trades_tagged:** 0

## Candidate Themes

### [candidate] Neptun Deep gas production ramp 2027
**Narrative:** OMV Petrom + Romgaz JV on Black Sea offshore gas — production starts late 2027 per current timeline. Both companies have been deleveraging and signaling capex for this. Not yet priced in IF timeline holds.
**BVB mapping:**
- **SNG (Romgaz)** — 50% JV stake
- **SNP (OMV Petrom)** — 50% JV stake + operator
- **TGN (Transgaz)** — midstream benefit from new Romanian gas volumes
**Signals to track:** quarterly updates in SNG/SNP earnings, government statements on offshore tax regime, construction milestones
**Upgrade criteria:** clear on-schedule signal (e.g. platform installation confirmed) + recent earnings confirming 2027 timeline
**Added:** 2026-04-19

## Retired Themes

_None yet._

## Proposed New Themes / Status Changes

_None pending. When macro-analyst spots a new structural shift or a change to an existing theme's status, it appends here for user review. The engine never promotes/retires themes autonomously._

---

## How themes affect decisions

**At entry (synthesis step):**
- A setup in a ticker that maps to an `[active]` theme: conviction +1 (scale 0-10)
- A setup that runs against an `[active]` theme: require an extra confirmation signal (news, earnings beat, technical breakout with volume) before entering
- `[candidate]` themes don't adjust conviction but inform the watch list

**At exit:**
- If the theme retires while we still hold, the exit plan is re-evaluated — the thematic tailwind is gone, so the edge is weaker
- Trade-journal exit record captures which theme (if any) the trade was tagged with

**At review (retrospective):**
- Compute win rate per theme. A theme with 0% win rate over 5+ tagged trades is a retirement candidate.
