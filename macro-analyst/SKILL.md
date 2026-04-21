---
name: macro-analyst
description: Establish the macro context for today's BVB trading decisions — FX (especially EUR/RON), rates (RO 10Y, CDS), global indices (DAX / Stoxx Banks as the primary transmission), commodities (Brent, TTF), central bank actions (BNR, Fed, ECB), and political/fiscal catalysts. Populates a structured market snapshot that drives the encoded rulebook. First step of every morning routine. Trigger at the start of every morning run, or when the user asks about macro conditions affecting Romanian equities.
---

# Macro Analyst

Two jobs, in order:

1. **Populate the market snapshot** (`rules/market_snapshot.json`) from live feeds. This drives the structured rulebook `rules/bvb_rules.json` via `scripts/evaluate_rules.mjs`.
2. **Narrate the macro context** — what shifted overnight, which central bank is in focus, which theme has a tailwind today.

The research anchor is `macro-analyst/references/bvb-historical-patterns.md` — a decade of BET event history, sector betas, and regime-break notes. Consult it whenever interpreting thresholds or writing new signals.

## Data philosophy

Three overlapping regimes drive BET returns per the reference document:
1. **Romanian fiscal/ordinance shocks** — the dominant idiosyncratic tail (OUG 114/2018, Law 296/2023, Law 141/2025)
2. **Political-event binaries** — elections, court resolutions
3. **CEE-wide risk transmitted through DAX / Stoxx 600 Banks / EUR-RON / CDS**

US markets correlate weakly and with lag; **DAX and Stoxx Banks are the primary transmission**. Populate the snapshot with that priority order, not S&P-first.

## The market snapshot

Every morning, build `rules/market_snapshot.json` following `rules/market_snapshot.template.json`. Leave fields `null` if you can't resolve them — `evaluate_rules.py` flags rules with missing inputs as *indeterminate*, not un-fired; guessing values corrupts the audit trail.

After populating, run:

```
node scripts/evaluate_rules.mjs --format=json > /tmp/rules_eval.json
# or for human-readable output:
node scripts/evaluate_rules.mjs --format=text
```

The evaluator output is the machine-readable macro verdict that goes into synthesis.

### Five signal families (matches rule families in the rulebook)

**FX and domestic rates — strongest idiosyncratic signals**
- `eur_ron_close` — from BNR XML (below). Thresholds: 5.02 / 5.05 / 5.10 are meaningful bands per the reference doc.
- `ro_10y_yield_pct`, `ro_10y_yield_delta_10d_bp` — from WebSearch / tradingeconomics.com. >7.40% with >+40bp/10d is a strong short signal (rule `RAT-1`).
- `ro_5y_cds_bp`, `ro_5y_cds_delta_3d_bp`, `ro_5y_cds_delta_wk_bp` — from WebSearch. +20bp in 3 sessions with no HU/PL equivalent is the cleanest stand-alone BET short.
- `cpi_surprise_pp` — CPI print minus consensus on release day.
- `nbr_policy_bias`, `nbr_first_cut_confirmed`, `days_to_nbr_meeting` — track the NBR meeting calendar (~8/year).

**International markets — best overnight read**
- `dax_overnight_pct` — DAX futures pre-open. BET follows ~60% of overnight move in the first 2 hours.
- `stoxx_banks_weekly_pct` — leads TLV/BRD.
- `wig20_daily_pct`, `bux_daily_pct` — CEE context, not leading.
- `vix` and `vix_1d_pct_change` — risk tone.

**Commodity family — sector-specific**
- `brent_daily_pct`, `brent_weekly_pct` — drives SNP (correlation 0.60-0.75). ⚠ TTF→SNG correlation broke from 0.70 to 0.30 post-OUG 27/2022; `ttf_eur_mwh` still matters above €50/MWh.
- `reservoirs_pct_norm` + consecutive-week counter — summer drought is a clean H2O short.

**Political / fiscal calendar — the highest-conviction short signals**
- `fiscal_ordinance_leak` — highest-conviction short in the decade. Monitor "Ministerul Finanțelor pregătește" headline pattern (WebSearch below).
- `election_first_round_antisystem_lead` — Sunday exit poll from anti-system candidate.
- `court_resolution_post_selloff` — relief-rally trigger after >5% political selloff.
- `pnrr_approval`, `pnrr_milestone_fail` — EU disbursement decisions.

**Rating and index events**
- `agency_outlook_change` — one of: `stable_to_negative`, `negative_to_stable`, `affirm_bbb_minus`, `downgrade_to_junk`. **⚠ April 2026: all three agencies sit BBB-/Baa3 Negative — `downgrade_to_junk` is a live tail hedge (`RATAG-2`).**
- `ftse_event_days_to_effective`, `msci_upgrade_emerging` — passive flow windows. MSCI June 2026 review is the big one for this year.

## Layer 1 — Structured Feeds

### BNR FX rates (official Romanian reference)
```
https://www.bnr.ro/nbrfxrates.xml
```
Parse XML `<DataSet>` for `EUR`, `USD`. Published ~13:00 EET on business days. Populate `eur_ron_close`. Compute `eur_ron_close_streak_days` by comparing against the previous run's cached value.

### Yahoo Finance for indices & commodities
```
https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?interval=1d&range=5d
```
Headers: `User-Agent: Mozilla/5.0`.

Priority symbols (in order of signal strength for BET):

| Instrument | Yahoo | Snapshot field |
|-----------|-------|-----------------|
| DAX | `^GDAXI` | `dax_overnight_pct`, `dax_daily_pct`, `dax_above_200dma` |
| Euro Stoxx Banks | `^SX7P` | `stoxx_banks_weekly_pct` |
| WIG20 (Poland) | `WIG20.WA` | `wig20_daily_pct` |
| BUX (Hungary) | `^BUX` | `bux_daily_pct` |
| VIX | `^VIX` | `vix`, `vix_1d_pct_change` |
| Brent oil | `BZ=F` | `brent_daily_pct`, `brent_weekly_pct` |
| TTF gas | `TTF=F` (may not resolve) | `ttf_eur_mwh`, `ttf_weekly_pct` |
| EUR/RON cross | `EURRON=X` | cross-check against BNR |
| BET | `^BETI` | context only (often stale outside RO hours) |
| S&P 500 | `^GSPC` | narrative color, not snapshot |
| Nasdaq | `^IXIC` | narrative color, not snapshot |

Extract `regularMarketPrice`, last two daily closes for deltas. `chartPreviousClose` is unreliable — use `closes[-2]` for day-over-day.

### Fail-open rule
If Yahoo returns `regularMarketPrice: None` on weekends/holidays — record last close, set snapshot field to null rather than faking.

## Layer 2 — Real-Time Web Search

Populate the non-market fields of the snapshot with targeted searches. Be surgical — the rulebook is the verdict; prose is for the synthesis briefing.

### Rates / CDS (for `ro_10y_yield_pct`, `ro_5y_cds_bp`)
```
WebSearch: "Romania 10 year bond yield <current month year>"
WebSearch: "Romania 5Y CDS basis points <current month year>"
```

### Central bank calendar (for `nbr_policy_bias`, `days_to_nbr_meeting`, `nbr_first_cut_confirmed`)
```
WebSearch: "BNR interest rate decision <current month year>"
WebSearch: "BNR next meeting date"
WebSearch: "Fed FOMC statement latest"
WebSearch: "ECB monetary policy decision <current month year>"
```

### Inflation (for `cpi_surprise_pp`)
```
WebSearch: "Romania inflation CPI <current month year>"
```
Compare print vs consensus; populate only on release days.

### Fiscal-ordinance leak detector — the highest-value query
```
WebSearch: "Ministerul Finantelor ordonanta taxe <current month year>"
WebSearch: "Romania fiscal package banks energy <current month year>"
```
**Pattern:** Finance Ministry press briefings or late-evening emergency ordinances with no prior parliamentary signaling. Set `fiscal_ordinance_leak: true` only on confirmed signals. False positives here are expensive — rule `POL-1` is the biggest short.

### Political risk
```
WebSearch: "Romania election <current month year>"
WebSearch: "Romania government coalition <current month year>"
WebSearch: "Romania PNRR disbursement EU <current month year>"
```

### Rating agencies
```
WebSearch: "S&P Fitch Moody's Romania rating <current month year>"
```
Map any confirmed action to `agency_outlook_change`. If none, leave null.

### Geopolitics (tight filter)
```
WebSearch: "Ukraine Romania border escalation <current month year>"
WebSearch: "Ukraine ceasefire <current month year>"
```

### Energy (BVB is energy-heavy)
```
WebSearch: "TTF natural gas price <current month year>"
WebSearch: "Brent oil price <current month year>"
WebSearch: "OPEC production decision latest"
```

## REGIME scoring

After populating the snapshot, `evaluate_rules.py` computes two regime scores:

- **REGIME-1 (risk-off)** — weighted sum; ≥5 triggers `max_defensive` (cash floor 60%). Components: EUR/RON >5.05 (w=2), DAX <-1% (w=1), CDS +15bp/week (w=2), VIX >25 (w=1), RO 10Y >7.40% (w=2).
- **REGIME-2 (risk-on)** — weighted sum; ≥6 triggers `max_long` (cash ceiling 20%). Components: DAX >200DMA (w=1), EUR/RON <5.02 (w=1), CDS <120bp (w=2), RO 10Y <6.80% (w=2), NBR dovish bias (w=2).

These are the primary input to `PROJECT.md`'s regime-aware cash-reserve bands. Neither firing → neutral posture (default 10-30% cash per PROJECT.md).

## Output Format (morning briefing)

```
📊 MACRO — [DATE]

REGIME: [RISK-OFF | NEUTRAL | RISK-ON]  (R1=X/9, R2=X/8)
Recommended cash: [X-Y]%

FIRING RULES: [N]
  [RULE-ID] <one-line trigger> → <action> (expect [low..high]% / [N] days)
  ...

SNAPSHOT HIGHLIGHTS
  EUR/RON: [rate] ([± vs prior, streak of X days above/below band])
  RO 10Y: [%] ([± bp 10-day])    RO 5Y CDS: [bp] ([± bp 3-day])
  DAX: [±%] overnight, [±%] daily    Stoxx Banks: [±% weekly]
  VIX: [level]    Brent: $[X] ([±%])    TTF: €[X]/MWh ([±%])
  NBR: next meeting [date], bias [hawkish|neutral|dovish]

INDETERMINATE RULES: [N]
  (rules that couldn't be evaluated because snapshot inputs are missing)

KEY DRIVERS (top 3 narrative themes today)
  1. [theme + source]
  2. ...
  3. ...

SECTOR IMPACT FOR BVB
  Energy (SNP, SNG, TGN): [tailwind | headwind | neutral] — [why]
  Banking (TLV, BRD): [...]
  Utilities (H2O, SNN, TEL, EL): [...]
  Other: [...]

THEME UPDATES (from THEMES.md [active] list)
  [Theme name]: [reinforced | contradicted | unchanged] — [1 line why]
  Proposed changes: [count] or "none"

RISK FLAGS
  [Any live rule from the "tripwire" set: RATAG-2, FX-3, POL-1]

SUMMARY (for synthesis)
[2-3 sentences — compact interpretation, names specific tickers worth a closer scanner look]
```

## Theme Layer (structural bias tracking)

News tells you what happened yesterday. Themes tell you what structural shift is underway and how to position. This layer runs *after* the snapshot+rules pass and is the bridge from global-macro to BVB-ticker.

### Every morning: read THEMES.md
Load the file, extract `[active]` themes and their BVB ticker mappings. This goes into the synthesis step as a conviction bias (see THEMES.md "How themes affect decisions").

### Every morning: scan for theme-relevant news
For each `[active]` theme, run a targeted search using its "Signals to track" list. Append any hits under "THEME UPDATES" in the macro output.

### Weekly (Friday morning): theme discovery
Broader structural scans:
```
WebSearch: "emerging investment theme <current month year>"
WebSearch: "CEE Romania investment thesis <current year>"
WebSearch: "structural shift markets <current month year>"
```

Reflect: narratives *not* in THEMES.md that showed up repeatedly this week. Common triggers: new geopolitical event, technology inflection, regulatory shift, macro regime change.

### Propose new themes (never promote autonomously)
When a structural pattern appears 3+ times in a week with a plausible BVB mapping, append a proposal to "Proposed New Themes / Status Changes" at the bottom of `THEMES.md`. User reviews weekly. Engine never edits `[active]`/`[candidate]` sections directly.

### BVB-or-bust filter
Before proposing any theme, ask: *can we express this view on BVB*? If the only beneficiaries are US/Taiwan/etc. names, it's context-only, not a tradable theme for us.

## Interpretation Rules (anchored to the reference doc)

- **DAX and Stoxx Banks are the primary transmission**, not S&P. Weight CEE > EU > US.
- **Energy weight is ~40-50% of BET-Plus** (H2O alone ~15.7%). Commodity prices get disproportionate attention in the sector-impact section.
- **EUR/RON band structure matters more than absolute levels.** 5.02, 5.05, 5.10 are historically-observed thresholds — a break of 5.10 after a tight range is `FX-3` territory.
- **BNR meets ~8 times a year on Mondays/Tuesdays.** On meeting days the decision dominates regardless of global action. Inflation Reports publish Feb/May/Aug/Nov.
- **Ex-dividend cluster (May-July)** mechanically drags BET 2-4% in June alone — `CAL-1` suppresses the signal.
- **Summer liquidity collapse (Jul 15 - Aug 20)** — `CAL-2` fires, size and stops auto-adjust.
- **April 2026 regime caveat:** 70% YoY rally to ATH biases toward mean-reversion. Trend-following signals are degraded; relief-rally triggers (POL-3, RATAG-3) are over-weighted.

## Failure Handling

- BNR XML unavailable → fall back to `EURRON=X` on Yahoo; flag "unofficial rate" in the briefing and set snapshot fields accordingly.
- Yahoo down → leave index/commodity fields null; evaluator will mark dependent rules as indeterminate.
- WebSearch returns nothing for a high-stakes field (fiscal leak, rating action) → leave `false` / `null` — **do not guess**. Missing is safer than wrong.
- Rulebook missing → hard fail the briefing; synthesis can't run without the regime context.

## Caching

Same policy as `bvb-news`: in-memory cache for the run, no persistence between runs. The routine should never hit the same URL twice within one run. The snapshot itself *is* written to `rules/market_snapshot.json` as the audit trail of what the rule evaluator saw today.

## Daily Snapshot Archive

After writing `rules/market_snapshot.json`, also archive it to durable storage keyed by date so regimes can be replayed historically:

```js
import { openStore } from '../scripts/store.mjs';
const store = await openStore();
const date = new Date().toISOString().slice(0, 10);   // 'YYYY-MM-DD'
await store.saveSnapshot(date, snapshot);
```

Backend: bt-gateway's `/api/v1/snapshots/{date}` endpoint, tenant+mode-scoped. No local-file fallback; the gateway is the only path in and out. This feeds the retrospective ("what did the macro picture look like the week before the ALR trade went wrong?") and enables rulebook-change backtesting ("if REGIME-1 had weighted inflation at 0.30 instead of 0.25, how would the March regime reads have differed?").

If macro-analyst also edits `THEMES.md`, that file must be committed and pushed to `main` at the end of the run — same rule as `LESSONS.md` in retrospective. An edit in the ephemeral sandbox that isn't pushed is lost.
