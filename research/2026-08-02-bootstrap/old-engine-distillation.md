# Salvage Report: Old BVB Trading Engine (commit 94e4a7f) → New Long-Term Investor Engine

All facts below sourced from local git only (`git show 94e4a7f:<path>` in /home/user/auto-trading). The old tree was reset at commit 3f15519 ("Reset repository to empty state"); 94e4a7f is the last real commit. Old engine's knowledge base was last updated 2026-04-19/24; today is 2026-08-02, so all "current regime" claims are ~3.5 months stale and must be re-verified before use.

---

## 1. THE CROWN JEWEL: `macro-analyst/references/bvb-historical-patterns.md` (2015–2026 BET event catalog)

### 1.1 Core empirical finding
BET is driven by **three discrete regime states**, not US-style momentum factors:
- **(A) Romanian fiscal/ordinance shocks** — the dominant idiosyncratic risk factor.
- **(B) Political-event binaries** (elections, coalition crises) — concentrated in Sunday-to-Monday gaps.
- **(C) CEE-wide risk premia** transmitted via EUR/RON, sovereign CDS, and DAX/Stoxx 600 Banks (NOT the US; S&P 500 correlation is weak and lagged; DAX daily correlation ~0.5).

Only a handful of ±5% daily sessions in the whole decade — nearly all tied to domestic fiscal ordinances or election surprises. Global contagions (Brexit, COVID, SVB, Aug-2024 yen-carry) produced smaller per-day moves (−2 to −4%) but longer multi-week drawdowns, and BET moved with European peers **at lower beta** (retail-deposit banking structure, limited foreign ownership). COVID H1-2020: BET −13.21% vs BUX −22.27%, CAC −17.43%.

### 1.2 The three canonical fiscal-shock templates (most important pattern for any horizon)
| Event | Date | Damage | Round-trip |
|---|---|---|---|
| **OUG 114/2018** "greed tax" (2% energy turnover tax, gas cap, ROBOR-linked bank tax) | 18–19 Dec 2018 | **BET −11.2% in 2 sessions**; SNG/TGN −10–20% intraday; TLV −11.2%, BRD −10–11%; ~€3bn cap destroyed | GEO 19/2019 (29 Mar 2019) softened it → banks +6–7%, energy +6–8% in 2 days; sustained recovery |
| **Law 296/2023** (2% bank turnover tax, 0.5% oil & gas) | Sep–Oct 2023 | Banks −8–10% over a week; SNP −5% | Sustained but absorbed |
| **Law 141/2025** (VAT 19→21%, bank tax 2→4%, dividend WHT 10→16% from 2026) | Jul 2025 | BET & banks −6 to −10% over 2 weeks | Bond market rallied on fiscal credibility; BET later rallied to ATH |
All were announced **outside the normal budget cycle without consultation**. Leading tell: Finance Ministry weekend press briefings, "Ministerul Finanțelor pregătește" headlines about bank/energy/IT taxes with no prior budget law. **For a long-term engine: these are recurring −5 to −15% air pockets on SOEs/banks that historically partially recover within a quarter — i.e., scheduled-recurring buying opportunities and a reason never to size any single fiscal-exposed name too large.**

### 1.3 Election-crisis pattern (mean-reversion, not sell-and-hold)
- 24 Nov 2024 (Georgescu 1st round): Monday BET −1.45%, mid-caps −3 to −7.6% (MedLife, Aquila, TTS, Antibiotice). Pre-runoff panic 3 Dec 2024: −2.35%.
- 6 Dec 2024 Constitutional Court annulment: **+3.0%** (a top-15 day of the decade).
- 4 May 2025 (Simion >40%): Monday −2.52%; **EUR/RON broke 5.00 for the first time ever**; RO 10Y near 8.0%; Eurobonds at junk-like spreads despite IG rating.
- 18 May 2025 (Dan runoff win): Monday **+3.5%**, +7% cumulative by 28 May; RO 10Y −60bp.
Rule of thumb the decade teaches: first-round shocks producing Monday opens ≤−2.5% were **followed by relief rallies within 2–3 weeks**, but with intraweek drawdowns of 5–10% before resolution. Mid-caps have the highest political-event beta. For a long-term investor: political panics on BVB have been add points, not exit points — provided the sovereign rating holds.

### 1.4 Structural tailwinds of the decade (the long-term bull case skeleton)
- **Equitization of state champions**: Hidroelectrica IPO Jul 2023 (RON 9.28bn / ~€1.87bn, Romania's largest ever, 4.7x retail oversubscription, priced RON 104, debut +5.6%, daily turnover record RON 821m) lifted market cap ~49% YoY; BET +32% in 2023. H2O alone became ~15.7% of BET.
- **FTSE Russell Secondary Emerging upgrade (Sep 2020)** — changed foreign ownership and liquidity profile permanently.
- **Dividend machine**: 2022–2024 SOE windfall-dividend cycle gave Romania among the highest blue-chip dividend yields in Europe (7–10% gross on state energy names), structurally compressing downside beta in risk-off episodes. This is the single most long-term-investor-relevant structural fact.
- Pipeline (as of Apr 2026): Neptun Deep first gas 2027, defense spending to 2.5%+ GDP, potential MSCI EM upgrade (June 2026 review, est. +8–15% and ~$180m passive inflows to TLV/H2O/SNP/BRD), Ukraine-reconstruction optionality (TGN via BRUA/Vertical Corridor, TRP construction/PVC).

### 1.5 Sector playbook (per-ticker priors — verbatim decision-relevant content)
**Energy (SNP ~19% of BET, H2O ~16%, SNG, SNN, TGN, COTE):**
- SNP–Brent correlation **0.60–0.75, linear**. Brent >$80 → SNP +3–5%/week; Brent <$65 → −5–8%; Brent <$55 → dividend-risk derating (Feb–Mar 2020 SNP lost ~50%).
- **SNG–TTF pass-through structurally broke** after OUG 27/2022 windfall caps: correlation 0.70 → ~0.30. TTF must exceed €50/MWh to matter. The 2022 €300 TTF spike did NOT pass through to SNG profits.
- Regulatory shock is the dominant tail: −5 to −15% same-day on SNG/TGN/SNN, −3 to −7% SNP, partial recovery within a quarter.
- **State dividend policy memo (90% payout directive) is driver #2.** SNN: RON 4.16/sh 2023 (9.4% yield) → 3.78 → 2.70. SNG: RON 3.42 in 2023 (8.75%, biggest ever) → **RON 0.16 in 2024** (windfall tax absorbed profits) — never treat trailing yield as forward yield on state energy names under active windfall regimes; payouts can fall >90% YoY.
- **H2O: 100% payout policy** → pure yield proxy (RON 7.35/sh for 2024, ~7.2% yield); hydrology risk real (2024 drought: net profit −35%; reservoirs <70% of seasonal norm 4+ weeks in summer → historically −8 to −12% over 4–8 weeks).
- SNP removed from FTSE Global All Cap Feb 2026 (liquidity failure; 12-month passive-flow headwind).

**Banking (TLV ~20% of BET, BRD, EBS dual-listed):**
- **Rate cycle dominates**: hikes 1.25%→7.00% (Oct 2021–Jan 2023) drove TLV ~+28%; each 100bp ≈ 8–12% re-rating over 2–3 months (often pre-priced).
- Bank turnover taxes are the idiosyncratic tail (5–10% drawdowns each time).
- Secular re-rating driver: NPLs 10% (2016) → ~2.5% (2024) — structural, not cyclical.
- TLV = higher-beta growth (OTP Romania acquisition closed 2024, +~€19bn assets — changed NII sensitivity); BRD = defensive, 5–7% yield, SG-parent beta ~0.6 to Stoxx Banks. EBS on BVB = pure Vienna arbitrage, no independent signal. In global banking stress (SVB/CS Mar 2023): TLV −7–9%, BRD −8–10%, EBS −18–22%; Romanian retail-deposit banks underperform in shocks but **recover faster**.

**Utilities (TEL, TGN):** low commodity beta, high beta to **ANRE tariff resets** (TEL ~Jan 1; TGN ~Oct 1). TEL's Jun 2024 +40% system-services tariff → +7.35% in a day. TGN +233% YoY to Apr 2026 (post-cap reset + BRUA capex + Neptun Deep offtake) — flagged as extreme outlier / mean-reversion risk. Sensitive to NBR rates (RAB discount rate) and state dividend directives.

**Real estate (ONE, IMP):** **highest rate beta on BVB — every +100bp NBR hike ≈ −15 to −20% on ONE**; symmetric long case on cuts. Catalysts: quarterly presales (>20% YoY surprise = +5–7% in 48h), EUR/RON (presales in EUR).

**Consumer (SFG, AQ, WINE, M, CFH):** heterogeneous. SFG = highest lockdown beta (−75% in 2020). AQ = FMCG stability, 3.4–7.7% yield floor. WINE = export/FX beta. **M (MedLife) = acquisition-driven compounder: 60+ M&A deals, +365% from 2016 IPO to 2022, €1bn cap 2025** — the best long-term-holding template in the catalog. Mid-caps as a group carry the highest political-event beta.

**Industrial (TRP, CMP, ALR):** ALR's LME-aluminum beta only **0.24** (dampened by long-term Hidroelectrica electricity contract; inversely sensitive to RO wholesale power). TRP = PVC + construction-PMI play. CMP = German-auto supplier, −22% YoY into Apr 2026.

**Tech/Telecom (DIGI):** no longer a Romanian telecom — a **Spanish-M&A story** since 2023 (MásOrange remedies, €750m FTTH sale to Macquarie). ATL RON 11.60 (May 2019) → ATH RON 76.90 (Feb 2026, +560%), then −36% on Spain IPO rumors. Leverage tripwire: net debt/EBITDA >3.5x.

**SIF/funds (FP, SIF1/3/5, EVER, TRANSI):** trade at persistent NAV discount; NAV is what matters; catalysts are buybacks/NAV crystallization (from company-analyst cheat sheet).

### 1.6 Predictive signal framework (leading indicators, with in-sample thresholds)
- **FX/rates (strongest idiosyncratic):** EUR/RON >4.95 2 days → −1–2%; >5.00 → −2–4%; >5.10 → −3–6% banks-led. RO 10Y >7.40% with +40bp/10d = high-conviction bank stress. **RO 5Y CDS +20bp/3 sessions with no HU/PL equivalent = cleanest standalone BET stress signal; CDS leads cash equity by 1–3 days.** RO–DE 10Y spread >500bp precedes rating actions. RON breaking technical levels reprices faster than rating actions (May 2025 out-of-sample confirmation).
- **International:** DAX overnight futures = best opening read (BET follows ~60% within 2h). Stoxx Banks −3%/week → TLV/BRD −2–3%. VIX doubling to >25 → BET −2–4% in 3 days.
- **Commodities:** Brent +5%/week → SNP +3–7% (contributes +0.6–1.2% to BET alone). TTF >€50/MWh → SNG +3–5%. Hydrology (reservoirs) for H2O.
- **Political/fiscal calendar:** ordinance leaks = highest-conviction drawdown precursor; Sunday exit polls; court resolutions = +3–5% relief; PNRR approvals +0.5–1.5% / failures −1.5–3%.
- **Rating/index:** outlook cuts −2–4%; **downgrade to junk = −6 to −12% in a week from forced IG-mandate selling**; FTSE/MSCI rebalance windows ±3–8% for adds/deletes over T-40→T-1.

### 1.7 Seasonal/calendar patterns
- **Apr–May**: earnings + dividend-proposal season. **May–Jul ex-dividend cluster** (SNP mid-May, H2O early Jun, TLV mid-Jun, SNN Jun, SNG early Jul) mechanically drags BET −2 to −4% in June alone — never a sell signal; for a long-term investor this is the cash-reinvestment window.
- **Jul 15–Aug 20: liquidity collapses to ~70% of average** (old rule: cut size 40%, widen stops 30%). Note: today (2026-08-02) is inside this window — relevant for the new engine's first accumulation passes.
- **Oct–Nov**: Q3 reports; **Feb–Mar**: annual results. **Dec 15–30**: window-dressing bias +1–3%. NBR meets ~8x/year; Inflation Reports Feb/May/Aug/Nov. Jan–Apr sees dividend-driven flows.
- BVB microstructure: open 10:00 EET (pre-open auction 09:45), close 17:45; ±15% daily tunnel with suspension at limit; names trade in "waves" — weeks flat, then 10–15% in days.

### 1.8 Regime breaks flagged for model retraining (⚠ do not train across these seams)
1. Pre/post **H2O IPO (Jul 2023)** — BET composition changed; pre-2023 sector weights invalid.
2. Pre/post **OUG 27/2022** — TTF–SNG correlation 0.70 → 0.30.
3. Pre/post **TLV–OTP close (2024)** — NII sensitivity changed.
4. Pre/post **Negative-outlook cluster (Dec 2024–Mar 2025)** — sovereign-risk sensitivity amplified; historical betas underestimate tail.
5. Pre/post **FTSE Secondary Emerging (Sep 2020)** — foreign ownership/liquidity profile different.
6. Pre/post **electricity price-cap removal (1 Jul 2025)** — utility margin structure fundamentally changed; retail bills nearly doubled.

**Patterns declared no longer valid:** TTF→SNG linear pass-through; SNG as a high-yield name; DIGI as a Romanian telecom; ALR as a clean LME proxy; oil & gas as a homogeneous sector (SNP FTSE deletion diverges passive flows).

### 1.9 April-2026 regime assessment (the document's final state of the world)
- BET ATH 29,615.57 on 24 Feb 2026; ~28,900 (−1.7% from ATH) as of early Apr 2026 after ~**70% YoY rally** — driven by dividend compounding, expected NBR first cut (May 2026), MSCI Advanced Frontier upgrade (Jun 2025), and the *absence* of an actual downgrade. Characterized as "bad news absorbed, good news priced" — **bias mean-reversion over trend-following at these levels**.
- **All three agencies at BBB-/Baa3 Negative** (Fitch 24 Dec 2024 → S&P 24 Jan 2025 → Moody's 14 Mar 2025; S&P affirmed 3 Apr 2026). Outlook clustering within 80 days historically leads actual downgrade by 6–12 months absent fiscal correction. With 8.6%-of-GDP 2024 deficit, EDP escalated (20 Jun 2025), €869m PNRR suspended, CPI 9.31% (Feb 2026) — **called the highest-risk configuration in the entire dataset for a downgrade-to-junk, a discontinuity the historical data does not contain**. This is the one persistent tripwire even a long-term engine must keep armed.
- Three named forward setups (verify what actually happened after Apr 2026): May 2026 NBR first cut (long BET/banks/ONE), June 2026 MSCI EM review (TLV/H2O/SNP/BRD basket), junk-downgrade tail hedge.

---

## 2. `rules/bvb_rules.json` — 30 encoded rules, one-liners + long-term relevance verdicts

Metadata: v1.0.0, generated 2026-04-19 from the historical-patterns doc; confidence bands = in-sample hit rates (strong >70%, moderate 50–70%, weak <50%).

| ID | One-line summary | Long-term verdict |
|---|---|---|
| FX-1 | EUR/RON >5.05 for 2d + CDS +15bp w/w → short BET 5d | **Repurpose**: not a trade, but a valid "pause new buying" stress gauge |
| FX-2 | NBR-intervention RON rebound → long banks 3d | Swing noise — drop |
| FX-3 | EUR/RON >5.10 band-break → short BET 14d (strong) | **Keep signal**: band-break precedes CDS blowouts; de-risk/pause trigger |
| INT-1 | DAX overnight −1.5% → intraday short BET (strong) | Swing noise — drop (keep the DAX-transmission *fact*) |
| INT-2 | WIG20/BUX +1% with BET flat 2 sessions → 3d catch-up long | Swing noise — drop |
| INT-3 | VIX +30%/day and >25 → short BET 3d | Drop as short; **invert for LT**: VIX-spike days are accumulation days |
| COM-1 | Brent +4%/day → long SNP 1 day (strong) | Swing noise — drop; keep Brent–SNP beta 0.5–0.7 as valuation input |
| COM-2 | TTF +10% w/w on supply disruption → long SNG 10d (weak) | Drop; keep the broken-correlation caveat |
| COM-3 | Reservoirs <70% of norm 4+ summer weeks → short H2O 60d | **Repurpose**: hydrology as fundamental earnings/dividend input for holding H2O; don't add on drought |
| RAT-1 | RO 10Y >7.40% + >40bp/10d → short BET/banks (strong) | **Repurpose**: sovereign-stress gauge; also marks historically good entry yields for banks if rating holds |
| RAT-2 | RO CDS +20bp/3d with no HU/PL move → short BET (strong) | **Keep signal**: cleanest idiosyncratic-stress tripwire; leads equity 1–3 days |
| RAT-3 | Confirmed NBR first cut ≤5d before meeting → long BET 7d (strong) | Event-trade noise, but the **rate-cycle direction is a core LT driver** (banks, ONE) |
| RAT-4 | CPI surprise >+0.3pp → intraday short | Swing noise — drop |
| POL-1 | Fiscal-ordinance leak targeting SOEs → short 5d, −3 to −8% (strong; highest-conviction short in dataset) | **Keep, inverted**: expect the air pocket, don't panic-sell, buy the post-softening round-trip; cap SOE concentration |
| POL-2 | Sunday anti-system exit-poll lead → short Monday 2d (strong) | Swing as written; **LT version: election panic = staged add point** (see POL-3) |
| POL-3 | Court/official resolution after >5% selloff → long 1d, +3–5% (strong) | **Keep pattern**: crisis-resolution relief is the historically reliable mean-reversion; LT engine adds during the panic phase |
| POL-4 | PNRR payment approved → long 3d | Noise — drop (mild positive context only) |
| POL-5 | PNRR milestone failure → short 5d | Noise as trade; keep as fiscal-trajectory input to the downgrade tripwire |
| CAL-1 | Ex-div cluster day → no_trade; drop is mechanical (strong) | **Keep verbatim** — prevents misreading June's −2–4% mechanical drag; schedule dividend reinvestment |
| CAL-2 | Jul 15–Aug 20 → cut size 40%, widen stops 30% (strong) | **Keep adapted**: thin-liquidity execution discipline for accumulation (passive limits, patience) — live right now |
| CAL-3 | Dec 15–30 window dressing → long 14d | Seasonal noise — drop |
| RATAG-1 | Outlook Stable→Negative → short 2d | Drop as trade; feed the tripwire |
| RATAG-2 | **Downgrade to junk → max defensive, longs ≤20%, −6 to −12% expected** (strong; flagged live-risk Apr 2026) | **Keep as THE persistent tail tripwire** — the only scenario justifying LT de-risking; also pre-plan a forced-selling shopping list |
| RATAG-3 | BBB- affirmation after feared review → long 1d | Noise — drop |
| IDX-1 | FTSE rebalance T-40 window → long adds / short deletes (strong) | Flow trade — drop; retain awareness (don't initiate LT buys during inclusion pumps) |
| IDX-2 | MSCI EM upgrade → long TLV/H2O/SNP/BRD basket 90d, +8–15% (strong) | **Keep**: structural re-rating with multi-year follow-through; verify June 2026 outcome |
| GEO-1 | Ukraine escalation <100km from border → short 3d | Noise as trade; risk-awareness input |
| GEO-2 | Credible ceasefire → long reconstruction (TGN, TRP) 10d | **Keep as multi-year theme**, not a 10-day trade |
| REGIME-1 | Weighted risk-off score ≥5 (EUR/RON>5.05 w2, DAX<−1% w1, CDS+15bp w2, VIX>25 w1, 10Y>7.40% w2) → cash ≥60% | **Keep dampened**: for LT, ≥5 should mean "halt new deployment," not liquidate to 60% cash |
| REGIME-2 | Weighted risk-on score ≥6 (DAX>200DMA w1, EUR/RON<5.02 w1, CDS<120bp w2, 10Y<6.80% w2, NBR dovish w2) → cash ≤20% | **Keep dampened**: green light for accelerating scheduled accumulation |

**Net assessment:** ~19 of 30 rules are swing/flow noise at weeks-to-years horizons. The durable carry-forwards are: RATAG-2 (junk tripwire), REGIME-1/2 (deployment pacing), CAL-1/CAL-2 (mechanical/liquidity discipline), POL-1/POL-3 (fiscal-shock and crisis-resolution round-trip patterns, inverted into buying discipline), RAT-2/FX-3 (sovereign-stress early warning), IDX-2 and GEO-2 (structural themes), plus the sector betas embedded in COM-1/COM-3/RAT-3 as fundamental inputs.

---

## 3. `market-scanner/SKILL.md` — canonical ticker universe with liquidity tiers

**Tier A — BET core (20 names, high liquidity):**
`TLV, SNP, SNG, H2O, TGN, BRD, DIGI, EL, M, SNN, TEL, PE, FP, ONE, AQ, TRP, TTS, ATB, SFG, CFH`
(PE = Premier Energy, IPO 2024; TTS = Transport Trade Services/Constanța port; CFH = Cris-Tim, IPO Nov 2025; ATB = Antibiotice, promoted to BET core.)

**Tier B — BET-Plus beyond BET (thinner):**
`WINE, COTE, BVB, ROCE, ALR, BIO, CMP, IMP, LION, OIL, PPL, RRC, SIF1, SIF3, SIF5, STZ, TRANSI, UCM, EVER`

Liquidity rules: skip anything with 20-day ADV < 50,000 RON; cross-check against the official BET-PLUS composition page on every index reshuffle. Company-analyst refined this into BVB-calibrated bands: **Tradeable ≥500k RON ADV** (standard sizing) / **Thin 100–500k** (cap at min(15% portfolio, 10% of ADV), passive limits only, never cross the spread) / **Marginal 50–100k** (conviction ≥8 required, cap min(5% portfolio, 5% of ADV)) / **Reject <50k**. During Jul 15–Aug 20 tighten each band one step. Data: Yahoo Finance `<SYMBOL>.RO` primary, Stooq CSV fallback; never fabricate on data failure. These bands are directly reusable for a long-term accumulator (position-building speed limits).

---

## 4. Journal + retrospective design (`trade-journal/SKILL.md`, `retrospective/SKILL.md`)

### Journal entry record (on fill)
Fields: `trade_id` (YYYY-MM-DD-SYM-NN), timestamp, symbol, trade_type (swing|event|trend), quantity, entry_price, stop_loss, take_profit, **conviction (0–10)**, **thesis** (plain paragraph, readable in 6 months), **catalyst** (specific and dated, not "earnings"), **catalyst_window** (start/end), **mechanism** (the causal chain from catalyst to price — "if you can't articulate a mechanism, the thesis is weak; size down or skip"), **expected_exit_by**, **theme_tag**, **context** (macro, news, scanner_rank, competing_setups), exit_plan, **invalidation_conditions** (discrete testable thesis-killers; any one firing forces exit regardless of P&L).

### Exit record (on close)
Fields: exit_price, quantity_closed, days_held, pnl_ron/pnl_pct, `exit_reason` enum (take_profit|stop_loss|trailing_stop|time_stop|thesis_invalidated|override_exit|manual), **catalyst_occurred** (yes|no|delayed|partial), **mechanism_worked** (yes|no|yes_but_price_reversed|via_different_path), held_past_expected_exit (bool), invalidation_triggered, exit_narrative, **thesis_verdict** — *derived, not judged*: yes+yes→`correct`; yes+no→`wrong` (misdiagnosed causal chain); no→`inconclusive` (never tested); yes+reversed→`partially_correct` (right thesis, wrong exit); via_different_path→`partially_correct` (lucky — never generalize). Plus 0–3 specific `lessons`.

Integrity: append-only; corrections as new records with `correction_of`; every entry needs a matching exit; partial exits are separate exit records; missing context → `backfilled: true`. Two-tier storage: Firestore-via-gateway authoritative, graph memory as write-only enrichment never on the read path.

### Retrospective (weekly Fri, monthly first-Fri, on-demand after 3+ loss streaks or before any rule change)
- Stats script first (never hand-parse): clusters closed trades by trade_type, sector, exit_reason, thesis_verdict, conviction bucket (0–4/5–7/8–10), theme_tag, rule_id, and the **catalyst×mechanism failure-mode grid**. Computes count, win rate, avg/median P&L, days held, expectancy.
- Pattern triggers: cluster win rate deviating >15pts from overall; strong ± expectancy; same exit_reason 3+ times; any grid cell with 3+ consistent trades. Grid cells map to distinct corrections: catalyst-yes/mechanism-no = **diagnosis wrong** (update priors); yes/reversed = **exit wrong** (book partial at catalyst); catalyst-no = **thesis never tested** (timing research); different-path = **lucky, don't generalize**.
- Lesson quality bar: specific, evidenced (cluster + n), actionable, **falsifiable**. Never mine from <4 closed trades.
- **Promotion ladder: `[candidate]` (observed, n<10) → `[active]` (enough evidence, feeds daily synthesis) → `[retired]` (contradicted later; kept for history with reason)**. Also `[active-skip-rule]` for non-action lessons from skipped-setup counterfactuals. Cap active lessons at ~15 — consolidate beyond that. Lessons that conflict with PROJECT.md go into a "Proposed Rule Changes" section; **the skill never edits PROJECT.md — the user is the gate**. LESSONS.md/THEMES.md committed to the branch matching the account mode (demo vs live evolve independently); failed push = treated as a missed run.
- **Counterfactual loop (the blind-spot fix)**: every A/B-grade setup considered but not acted on is persisted as a `SkippedSetup` with an enumerated reason (competing_setup_higher_conviction, liquidity_below_threshold, regime_risk_off, cash_ceiling_hit, sector_cap_reached, position_cap_reached, daily_deploy_cap_hit, chased_price, thesis_too_weak, pending_event_too_close, other) plus an invalidation window (14d breakouts / 30d trends / event+7d). A `counterfactual-mapper` routine later scores price-since-skip, letting retros detect skip rules that leave money on the table (e.g., "regime_risk_off skips moved +8% → cash floor too aggressive"). Implied portfolio caps recoverable from the reason enum: 60% single-sector, 30% single-stock, 50%-of-cash daily deployment, never chase >3% past signal price.

**Carry-forward advice:** this whole design translates almost intact to long-term investing — swap `expected_exit_by` for thesis-review dates, keep catalyst/mechanism/invalidation discipline (they matter *more* over years), keep the derived-verdict grid, the [candidate]→[active]→[retired] ladder, and especially the skipped-setup counterfactual loop.

---

## 5. `company-analyst/SKILL.md` — per-company analysis checklist

Sources in priority order: (1) BVB issuer page (filings, corporate events calendar, 5y dividend history, free float), (2) Yahoo Finance (price/52w/mcap/yield + key statistics), (3) stockanalysis.com (multi-year income/balance/cash-flow statements), (4) targeted searches (earnings commentary, analyst targets, sector outlook), (5) ASF regulatory-action check.

Checklist order:
1. **Liquidity gate first** (the ADV bands in §3) — reject before wasting analysis effort.
2. **Financial performance**: revenue 3y CAGR + YoY; net-income margin trend and earnings quality (one-offs?); EBITDA/operating margin direction; FCF positive/consistent/growing; net debt/EBITDA; ROE/ROA vs sector.
3. **Valuation**: P/E (trailing+forward); **P/B for banks** (book value is the anchor); **EV/EBITDA for capital-intensive energy/utilities**; dividend yield vs its own 5y average; comps vs CEE peers (WIG, PSE) and Western EU sector averages.
4. **Dividend profile**: 5y amounts/yields/payout ratios; stated policy; next ex/record/payment dates; flag windfall-driven specials (SNN/SNG/SNP) as non-recurring.
5. **Ownership/insiders**: majors, state-ownership flag, free float, >5% crossings, insider activity 90d.
6. **Business quality**: market position (monopoly/oligopoly/competitive), regulatory environment, commodity/FX exposure, growth drivers, visible risks (caps, windfall taxes, refinancing).
7. **Catalyst timeline** (next 90 days): earnings, AGM resolutions, ex-div, sector regulatory events.
Output scorecard: snapshot + 5 sub-scores (financial health, valuation, dividend, growth, management) → fundamental score 1–10; thematic fit vs THEMES.md; thesis (2–3 sentences); top-3 risks; **fair-value range with method disclosed** (peer multiples | DCF | asset-based); recommendation with entry zone/size/stop/target. Sector cheat sheets: energy (ANRE + state dividend policy + windfall risk every review), banks (NIM↔BNR rate, NPL/cost of risk, CET1, BNR payout caps — don't extrapolate specials), developers (presales pipeline leads; land-bank value can hide problems — check cash flow), consumer (Romanian retail sales proxy; M&A re-rating), SIFs (NAV discount; lumpy dividends). Integrity: every numeric claim sourced; never estimate P/E by eyeballing; always timestamp `AS OF`; fair value is an estimate, show the method. **For the long-term engine this checklist needs almost no change — only the recommendation block's horizons (swing 3–15d / event 2–8w / trend 1–3m) need replacing with holding-period tiers of quarters-to-years.**

---

## 6. Meta-lessons from commit history — top 5 operational failure modes (61 commits, ~2 months of life)

1. **Broker integration was the biggest time sink and was never fully stable.** Five consecutive commits fighting IBKR Gateway in the sandbox (installer mirrors, install paths, X11/font libs, settings dirs) before abandoning it wholesale for BT Trade (`8809f95 swap IBKR for BT Trade`). BT Trade then needed its own life-support: a **token-keeper routine rotating tokens every 45 minutes** (d8a72fd), a **DNS-cache pre-warming hack** to avoid overflow (a40e2fd), and the *very last commit before the reset* was still a broker-response-shape bug (`94e4a7f bt_executor: unwrap nested gateway shape for cash/holdings`). Lesson: budget for broker plumbing as a first-class subsystem; validate/normalize API response shapes at one boundary; a long-term engine's lower trade frequency reduces (but doesn't remove) this surface.
2. **State persistence churned through four architectures because sandboxes are ephemeral.** git files → GCS (771eeef) → Firestore (5923777, 82422f7) → gateway-only HTTP API (52b70ff, 04e5e78, 745c527), with an explicit doc commit **forbidding reading cash/holdings from cached files** (81ff25a) — meaning stale-cache trading decisions actually happened or nearly did. Lesson: one authoritative remote store from day one; never let portfolio truth live in the repo or local files.
3. **Graph memory (graphiti) was wired in as load-bearing and then had to be demoted.** Wired in (3bb5b98), patched (79de38e), semantic search replaced with get_episodes after timeouts (5224bfb), and finally `2449f7e memory skills: stop treating graphiti as load-bearing; reroute trade recall to journal`. The retrospective SKILL itself documents live-verified query timeouts and a 60s-timeout/skip policy. Lesson: fancy memory is enrichment only; the append-only journal behind a plain HTTP store is the recall path.
4. **Multi-branch config (main/demo/live) kept drifting and breaking sync.** Auto-sync added (56f5aa6), fast-forward-only failed and needed issue-on-failure (2112304), then FF abandoned for merges (9563c21); LESSONS.md was being **pushed to hardcoded `main` instead of the running branch** (8419d69) — i.e., learned lessons were landing in the wrong environment. Lesson: minimize branch-per-environment coupling, or make "push to current branch" and sync-failure alerting explicit invariants.
5. **The scheduled morning routine was chronically fragile in its runtime environment.** Three separate `claude/debug-morning-routine` PRs merged (#5, #8, #11); `npm install` had to be mandated as step 0 of every run (b90405e); hardcoded gateway URL flip-flopped to required env var (8f90050 → 74ff41f); retry-on-502/503 added (b69ba65). Secondary observation: 6 of the final 12 commits were x-poster (Twitter-thread formatting) polish — cosmetic output work crowding out engine work in the last active week. Lesson: make routine runs self-bootstrapping and env-var-driven from the start, alert on degraded runs, and resist spending scarce iteration cycles on presentation layers.

---

## 7. What to carry into the new long-term engine (condensed)

- **Keep whole**: the historical-patterns document (§1) as the macro reference; the ticker universe + ADV liquidity bands (§3); the company-analyst checklist (§5) with horizons re-tiered; the journal schema with catalyst/mechanism/invalidation and derived verdicts, the [candidate]→[active]→[retired] lesson ladder, and the skipped-setup counterfactual loop (§4).
- **Keep as tripwires, not trades**: RATAG-2 junk-downgrade (the one de-risk trigger), RAT-2/FX-3 sovereign-stress early warnings, REGIME-1/2 as deployment-pacing gauges, POL-1 fiscal-ordinance detection.
- **Invert for a long-term buyer**: election/political panics (POL-2/3), VIX spikes (INT-3), and fiscal-shock air pockets are historically add points; ex-div drops (CAL-1) are mechanical; Jul 15–Aug 20 (CAL-2) demands patient passive-limit accumulation.
- **Drop**: all intraday/1–5-day directional rules (INT-1/2, COM-1/2, RAT-4, CAL-3, RATAG-1/3, IDX-1, FX-1/2 as trades).
- **Verify before relying on anything dated after 2026-04-24**: whether the May 2026 NBR cut happened, the June 2026 MSCI review outcome, the rating trajectory (junk risk), and current BET-Plus composition.


---CONFIDENCE---
All content is faithfully extracted from local git at commit 94e4a7f; nothing was verified against the outside world (per instructions, no web research). Key uncertainties: (1) The knowledge base is frozen at 2026-04-19/24 — today is 2026-08-02, so the "April 2026 regime assessment" (BET near ATH, all agencies BBB-/Negative, expected May 2026 NBR first cut, June 2026 MSCI EM review) describes events that have since resolved in unknown ways; the new engine must re-verify the rating trajectory, the NBR decision, the MSCI outcome, and current index composition before using any of it. (2) The historical event catalog itself was originally compiled from press reconstruction rather than tick data (the document says so), and its hit-rate/confidence labels are in-sample 2015–2026 estimates with no out-of-sample validation. (3) The failure-mode analysis in §6 is inferred from commit messages only — I did not diff the fix commits' code, so the severity ranking is a judgment call; the "stale cached cash/holdings" incident is implied by a docs commit, not proven to have caused a bad trade. (4) I could not verify whether LESSONS.md/THEMES.md ever accumulated real trade lessons (they were on demo/live branches that may not exist locally; only ~2 macro-snapshot commits appear in history), so the journal/retrospective machinery is well-designed but likely ran for only weeks — its empirical output, if any, was not recovered. (5) PROJECT.md itself (position caps 30%/sector 60%/daily-deploy 50%, 10% stops) was not read directly; those numbers are reconstructed from references in the scanner/retrospective skills.