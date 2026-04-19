# BVB macro-analyst reference: A decade of BET drivers, signals and trading rules (2015–2026)

The Bucharest Stock Exchange has transitioned from a low-liquidity frontier exchange to a Secondary Emerging market whose BET index sits near all-time highs (~28,900 points, 24 Feb 2026 ATH of 29,615.57). **The single most important empirical finding for a swing-trading engine is that BET is now primarily driven by three overlapping regimes: (1) Romanian fiscal/ordinance shocks, (2) political-event risk around elections and coalition formations, and (3) CEE-wide risk premia transmitted through EUR/RON, sovereign CDS and the DAX/Stoxx 600 Banks**. Over 2015–2026, only a handful of sessions breached the ±5% daily threshold — nearly all of them tied to domestic fiscal ordinances (Dec 19, 2018 OUG 114: –11.2%) or to Sunday election surprises that spill into Monday opens. Global contagions (Brexit, SVB, Aug 2024 yen-carry unwind, COVID) produced smaller per-day moves (–2 to –4%) but longer multi-week drawdowns. The regime shift that most matters going forward: **all three rating agencies now sit at BBB-/Baa3 with Negative outlook** (affirmed Feb–Apr 2026), so any incremental fiscal slippage is now a binary downgrade-to-junk risk — a new state the historical dataset does not contain and that should be treated as a discontinuity for model training.

This document is structured as an operational reference rather than a narrative: an event catalog, a sector playbook, a signal framework, concrete trading rules, and risk warnings. Flagged regime breaks are marked ⚠ where historical relationships likely no longer hold.

## 1. Executive summary: patterns that repeat across the decade

**The Romanian fiscal ordinance is the dominant idiosyncratic risk factor.** Three events account for the vast majority of the decade's sharpest selloffs: **OUG 114/2018** (Dec 18–19, 2018; BET –11.2% in two sessions, energy names –10–20% intraday, banks –10–11%); **Law 296/2023** (Sept–Oct 2023; bank turnover tax 2%, oil & gas 0.5%; cumulative banks drawdown ~8–10% over a week); and **Law 141/2025** (July 2025; VAT 19→21%, bank turnover tax 2→4%, dividend WHT 10→16% from 2026; BET and banks –6 to –10% over two weeks). Each was announced outside the normal budget cycle and delivered without market consultation; this is now a **reliable short signal** when the Finance Ministry briefs press on "closing fiscal gaps" without prior leaks.

**Election risk is concentrated in Sunday-to-Monday gap trades.** The Nov 24, 2024 first-round shock (Georgescu) produced BET –1.45% Monday open with mid-caps –3–7.6%; the May 4, 2025 re-run first round (Simion) produced BET –2.52% and the leu breaking EUR/RON 5.00 for the first time ever. Both were followed by relief rallies on resolution: Dec 6, 2024 Constitutional Court annulment (+3.0%, one of the ten best days of the decade) and May 18–19, 2025 Dan runoff win (+3.5% Monday, +7% cumulatively through May 28).

**Global contagion transmits through DAX and Stoxx Banks, not through the US.** BET's strongest daily correlation is with the DAX (~0.5) and Stoxx 600 Banks (~0.5 with TLV/BRD); S&P 500 correlation is weaker and lagged. The DAX overnight futures gap is the single best "open-the-book" signal for BET direction. The BET decoupled from DAX **only** during domestic idiosyncratic events (the 2018 ordinance, the 2024–2025 election crisis) — in every other episode including COVID (H1 2020 BET –13.21% vs WIG –14.25%, BUX –22.27%, CAC –17.43%) and SVB/CS (March 2023), BET moved with European peers but with **lower beta** due to the market's retail-deposit banking structure and limited foreign ownership.

**The decade's structural tailwind has been the equitization of Romania's state-owned champions and the FTSE Russell secondary-emerging upgrade (Sep 2020).** The Hidroelectrica IPO of July 2023 (RON 9.28 bn, ~EUR 1.87 bn — Romania's largest ever, 4.7x retail oversubscription, priced RON 104, debut +5.6% to RON 110, intraday +7.7%) vaulted the Romanian market cap by ~49% YoY in 2023 and delivered BET +32% for the year. H2O alone is now ~15.7% of BET. Combined with the SNN/SNG/SNP windfall dividend cycle 2022–2024, Romania offered one of the **highest blue-chip dividend yields in Europe** (7–10% gross on state-owned energy names) — a flow dynamic that structurally compressed beta during risk-off episodes.

**A new regime is visible in 2025–2026.** Post–fiscal package (July 2025), NBR held at 6.50% for 12 consecutive meetings, inflation peaked at 9.8–9.9% in Sep–Oct 2025, the EDP was escalated by the EU Council (June 20, 2025), PNRR disbursements were partially suspended (€869m in June 2025), and all three agencies moved to Negative outlook. Yet BET rallied ~70% YoY to April 2026 on dividend compounding, a NBR first-cut expectation for May 2026, MSCI Advanced Frontier upgrade (June 2025), and the absence of an actual downgrade. **This rally is a textbook "bad news absorbed, good news priced" regime — caution on mean-reversion trades.**

## 2. Event catalog: chronology of major BVB moves (2015–April 2026)

The table below consolidates the most actionable dated events. "Speed" = time from news to full pricing; "Duration" = how long the regime persisted. Events rated by confidence where reconstructed from press rather than tick data.

| Date | Event | BET move | Category | Speed | Duration | Most affected |
|---|---|---|---|---|---|---|
| **15 Jan 2015** | SNB unpegs CHF; Romanian CHF mortgage book stress | BRD –5 to –8% week | Global/banking | Same day | ~4 weeks | BRD, BCR-Erste |
| **Apr 2016** | Law 77/2016 "Datio in Solutum" signed; NBR warns 50% of 2015 banking profit at risk | BRD –15% peak-to-trough over 2 months | Political/banking | Gradual | ~6 months to CC ruling | BRD, banks |
| **24 Jun 2016** | Brexit referendum | BET mild –2 to –3% single day; rapid recovery | Global contagion | Same day | <2 weeks | Banks briefly |
| **25 Oct 2016** | Constitutional Court Decision 623/2016 narrows Law 77 to "hardship" | Banks +8–10% over week | Political/banking | Same day | Sustained | BRD, TLV |
| **Dec 2016** | PSD wins parliamentary election; MedLife (M) IPO Dec 21 at RON 26 (+365% cumulative to 2022) | Political de-rating mild, IPO outperformed | Political + corporate | Gradual | Multi-year | M, banks |
| **Oct 2018** | Offshore Law 256/2018 (royalties, 50% domestic sale, 25% local staff) | SNP multi-month derating; triggers ExxonMobil exit | Regulatory/energy | Gradual | 4 years until 2022 reform | SNP, SNG |
| **18–19 Dec 2018** | **OUG 114/2018 "greed tax" announced** (2% energy turnover tax, RON 68/MWh household gas cap, ROBOR-linked bank asset tax) | **BET –11.2% in 2 sessions**; SNG/TGN –10–20% intraday; TLV –11.2%, BRD –10–11%; ~€3 bn market cap destroyed | Macro/fiscal | Same day | 3+ months | Banks, energy, DIGI |
| **29 Mar 2019** | GEO 19/2019 softens OUG 114 (ROBOR decoupled, bank tax 0.2–0.4% of assets, gas cap only households) | SNG/TGN +6–8%; TLV +7%, BRD +6% over 2 days | Macro/fiscal | Same day | Sustained | Banks, energy |
| **16 May 2017** | DIGI Communications IPO at ~RON 38–56 range, RON 944m raised (largest 2017 IPO) | Flat debut; fell to ATL RON 11.60 by May 2019 | Corporate | Gradual | 2-year derating | DIGI |
| **Nov 2017** | Sphera Franchise (SFG) IPO at RON 25.3; ATH RON 44.80 on 18 Dec 2017 (+40–50% first weeks) | Strong multi-week momentum | Corporate | Fast | ~3 years until COVID | SFG |
| **9 Feb 2018** | Purcari (WINE) IPO at RON 19 despite US "Volmageddon" week; retail 4x oversubscribed | Stable debut, +100% cumulative to 2026 | Corporate | Slow | Multi-year | WINE |
| **Nov 2019** | Iohannis re-elected; Orban PNL government forms | Mildly positive, no single-day >2% | Political | Gradual | Months | Broad |
| **Feb–Mar 2020** | **COVID-19 global crash; March 9/12/16/18 worst days** | BET –13.21% H1 2020 (ranked 9th best in Europe); March peak-to-trough ~–25%; recovery by Q2 2021 | Global contagion | Same day | 12–14 months | SFG –75% (restaurants), banks, SNP (oil collapse) |
| **6 Dec 2020** | Parliamentary elections; PNL/USR/UDMR coalition | BET mildly positive | Political | Slow | Months | Broad |
| **29 Oct 2020** | SFG ATL RON 11.30 (–75% peak-to-trough COVID) | Single-stock crisis | Sector/COVID | Gradual | 2-year recovery | SFG |
| **9 Mar 2021** | TeraPlast (TRP) announces special dividend post-Kingspan divestiture | TRP +14.6% intraday | Corporate | Same day | Sustained to ATH Oct 2021 | TRP |
| **12 Jul 2021** | ONE United Properties IPO at RON 2.00 (9.2x retail oversubscription) | +21% year-1 return, +20–30% H2 2021 on BET/FTSE inclusion | Corporate | Fast | Multi-quarter | ONE |
| **Oct 2021** | NBR starts hiking cycle (1.25% first hike); PNRR approved | TLV +25–35% Oct-Nov 2021 to peak; BRD +20% | Macro/monetary | Gradual | Multi-quarter | Banks |
| **29 Nov 2021** | Aquila (AQ) IPO at RON 5.50 (largest entrepreneurial IPO to date, RON 367m) | Flat debut; +25% by 2024 | Corporate | Slow | Multi-year | AQ |
| **24 Feb 2022** | **Russian invasion of Ukraine** | SNG +8–12% single day; SNP +5%; TLV/BRD –8–10%; sector rotation: energy ↑, banks/consumer ↓; EUR/RON stress and risk premium widening | Defense/geopolitical | Same day | Multi-quarter | Energy +, banks/consumer – |
| **Mar 2022** | OUG 27/2022 windfall/price cap (80% electricity tax > RON 450/MWh, gas RON 150/MWh exempt) | SNN, SNG –4 to –7% on announcement; recovered as exempt volumes preserved profits | Macro/regulatory | Same day | 2+ years extensions | SNN, SNG, H2O proxies |
| **3 May 2022** | Romgaz signs USD 1.06bn ExxonMobil Neptun Deep SPA | SNG flat same day; multi-month –10% derating on capex commitment | Corporate/energy | Slow | ~6 months | SNG |
| **May 2022** | Law 157/2022 amended Offshore Law (15–70% supplemental tax tiers, 40% investment deduction) | SNP/SNG +10–15% May–June 2022; unlocked Neptun Deep FID | Regulatory/energy | Fast | Sustained | SNP, SNG |
| **Jul 2023** | SNG ex-div RON 3.42 gross (8.75% yield) — biggest windfall special dividend in BVB energy history | Mechanical –RON 3.5 on ex-date | Corporate | Same day | N/A | SNG |
| **5 Jul 2023** | Hidroelectrica IPO pricing at RON 104 | BET-TR +2.9%, #15 best day of decade | Macro/capital markets | Same day | Sustained | H2O, BET mechanics |
| **12 Jul 2023** | **H2O debut** at RON 110 (+5.6%), intraday +7.7%; turnover RON 821m daily record | BET +1.5%, 15-month high; BET-TR peaked 26,765 by July 20 | Macro/capital markets | Same day | Sustained | H2O, BET |
| **Mar 2023** | SVB + Credit Suisse crisis | BET modest spillover, no 5% day; TLV drawdown ~7–9%, BRD ~8–10%, EBS –18–22% (ATX driver) | Global/financial | Same day | ~2 weeks | Banks, full recovery April |
| **Sept 2023** | Finance Min. Bolos announces bank/turnover taxes | TLV –2.4%, BRD –2.7% same day | Macro/fiscal | Same day | Week | Banks, SNP, SNG |
| **27 Oct 2023** | Law 296/2023 (2% bank turnover tax 2024–25, 0.5% oil & gas) | TLV/BRD cumulative –8% over week; SNP –5% | Macro/fiscal | Gradual | Sustained | Banks, energy |
| **5 Jun 2024** | TEL +40% regulated tariff hike announced | TEL +7.35% single day | Regulatory/utility | Same day | Sustained | TEL |
| **Jul 2024** | NBR starts easing: 7.00 → 6.75%; Aug to 6.50% (then 18-month hold) | BET hit ATH ~18,800 end-July | Macro/monetary | Gradual | Sustained | Broad |
| **5 Aug 2024** | Global "August panic" (US recession fears, yen-carry unwind) | BET-TR –3.6%, #18 worst day of decade | Global contagion | Same day | <3 weeks | Broad |
| **24 Nov 2024** | **Pres. 1st round — Călin Georgescu wins** (~23%) | Monday 25 Nov: BET –1.45%; mid-caps MedLife, Aquila, TTS –4%, Antibiotice –3%, SNP –1.2%, TLV –0.7% | Political | Next session | 10+ days | Broad, mid-caps hardest |
| **3 Dec 2024** | Pre-runoff sell-off (fear of Dec 8 Georgescu runoff) | BET –2.35% single day — largest of 2024 after Aug 5; Antibiotice –7.6%, TTS –6%, SPH –5%, WINE –4.9%, TPL –4.3% | Political | Same day | 3 days | Mid-caps |
| **6 Dec 2024** | **Constitutional Court annuls election** (Russian interference finding) | BET-TR **+3.0%** — #14 best day of decade (relief rally); banks led bounce | Political | Intraday | Partial; uncertainty persisted | Banks, broad |
| **24 Dec 2024** | Fitch cuts Romania outlook to Negative | Mild –1% drift | Macro/rating | Slow | Sustained | Broad |
| **30 Dec 2024** | OUG 156/2024 fiscal package (dividend tax 8→10%, IT/construction/agri exemptions end) | BET –1.2% last trading day | Macro/fiscal | Same day | Into early 2025 | Energy, banks, IT |
| **24 Jan 2025** | S&P cuts Romania outlook to Negative | Mild negative drift | Macro/rating | Slow | Sustained | Broad |
| **14 Mar 2025** | Moody's cuts outlook to Negative (all 3 agencies now Negative) | Mild; already priced | Macro/rating | Slow | Sustained | Broad |
| **4 May 2025** | **Pres. re-run 1st round — Simion wins >40%** | Monday 5 May: BET –2.52%; Electrica –3.8%, FP –3.4%, MedLife –3.2%, DIGI –3%; EUR/RON breaks 5.00 first time ever; RO 10Y spikes near 8.0%, Eurobonds trade at "junk-like" spreads | Political | Next session | 2 weeks to runoff | Broad |
| **18 May 2025** | **Nicușor Dan wins runoff (~54–46%)** | Mon 19 May: BET **+3.5%** relief rally; RON +1.5% (EUR/RON 5.1033→5.0315); RO 10Y –60bp to 7.4%; BET +7% cumulative to May 28 | Political | Next session | Sustained | Broad |
| **20 Jun 2025** | EU Council escalates Excessive Deficit Procedure; potential ESI/RRF suspension; €869m PNRR suspended | Mild negative drift | Macro/EU | Slow | Sustained | Broad |
| **Jul 2025** | **Law 141/2025** (VAT 19→21%, bank turnover tax 4%, dividend WHT 16% from 2026, pension contributions, wage freezes) | BET and banks cumulative –6 to –10% over 2 weeks; bond market rallied on fiscal credibility | Macro/fiscal | Same day | 3–4 weeks | Banks (TLV, BRD), gambling, utilities positive |
| **1 Jul 2025** | Electricity price cap removed; retail bills nearly double | Inflation spikes, utilities mixed | Regulatory | Gradual | Sustained through peak inflation | Utilities, consumer |
| **Sep–Oct 2025** | Inflation peak ~9.8–9.9%; fiscal package II (SOE reforms) | BET consolidates then rallies on successful consolidation narrative | Macro | Gradual | Ongoing | Broad |
| **Feb 2026** | SNP removed from FTSE Global All Cap (liquidity failure, 12-month exclusion) | Modest SNP derating on passive outflow | Index technical | Event day + rebalance window | 12+ months | SNP |
| **24 Feb 2026** | **BET ATH at 29,615.57** | Cyclical peak | Technical | N/A | Ongoing | Broad, TGN +233% YoY |
| **Apr 2026** | S&P affirms BBB-/Neg 3 Apr; BET –1.7% from ATH to ~28,900; CPI 9.31% Feb | Consolidation regime | Macro/rating | Slow | Ongoing | Broad |

## 3. Sector playbook: how each BVB sector reacts to each event class

### Energy (SNP ~19%, H2O ~16%, SNG, SNN, TGN, COTE)

The sector is the **largest BET weight by capitalization** and dominates index mechanics around the May–July ex-dividend cluster. Key behaviors:

- **Brent-SNP sensitivity is strong and linear** (correlation 0.60–0.75). Brent breaking $80 reliably delivers SNP +3–5% over a week; Brent <$65 delivers SNP –5–8%; Brent <$55 triggers dividend-risk derating (2020 Feb–Mar saw SNP lose ~50%). EUR/USD is a secondary control (weak-negative via dollar oil).
- **TTF gas–SNG sensitivity structurally broke after OUG 27/2022** windfall caps. Pre-2022 correlation was ~0.70; post-cap ~0.30 because regulated RON 150/MWh absorbs upside. TTF >€50/MWh reignites gain sensitivity; the 2022 European gas price spike to €300 did **not** fully pass through to SNG profits.
- **Regulatory shock is the dominant tail risk.** The stylized signature is: announcement of a "fiscal measure" targeting energy SOEs → –5 to –15% same-day on SNG/TGN/SNN; –3 to –7% on SNP; partial recovery within a quarter as implementation details soften. The OUG 114/2018 → OUG 19/2019 round-trip is the template.
- **State dividend policy memo (90% payout directive, OUG 109/2011 updates 2022)** is the second-biggest driver. SNN paid RON 4.16/share in 2023 (9.4% yield), RON 3.78 in 2024, RON 2.70 in 2025. SNG paid RON 3.42 in 2023 (8.75%) — the largest ever — then collapsed to RON 0.16 in 2024 as windfall tax absorbed profits. **Low-payout announcements trigger –3 to –8% drops**; high-payout announcements +2–5% pops.
- **H2O dividend policy is 100% payout**, making it a yield proxy; RON 7.35 in 2024 (paid June 2025, ~7.2% yield). Hydrology risk matters (2024 drought: net profit –35%).

### Banking (TLV ~20% weight, BRD, EBS dual-listed, BVB exchange itself)

- **Rate cycle is the dominant macro driver.** Hikes from 1.25% (Oct 2021) to 7% (Jan 2023) drove TLV from ~RON 2.50 to 3.20 (split-adjusted), ~+28%; each 100bp delivered ~8–12% re-rating over 2–3 months. The reverse is expected on the May 2026 first cut but in practice banks often pre-price it.
- **Bank-specific fiscal shocks (turnover tax) are the dominant idiosyncratic tail.** Law 296/2023 2% and Law 141/2025 doubling to 4% each produced 5–10% drawdowns over 1–2 weeks.
- **NPL trajectory 2016 10% → 2024 ~2.5% drove structural re-rating**; this is a secular, not cyclical driver.
- **BRD is more defensive, higher yield (5–7%), but has SG-parent beta** (~0.6 to Stoxx Banks). TLV is the higher-beta growth bank with stock-split history and the 2024 OTP Romania acquisition.
- **EBS on BVB is a pure Vienna arbitrage** — BVB tape has no independent signal value.
- **SVB/CS March 2023 contagion was asymmetric**: TLV –7–9%, BRD –8–10%, EBS –18–22% (because of ATX concentration). This confirms the stylized rule that **Romanian retail-deposit banks underperform in shocks but recover faster** than Austrian cross-border banks.

### Utilities (TEL, TGN)

Regulated revenue means low beta to commodity prices and high beta to **ANRE tariff decisions** (TEL reset ~Jan 1; TGN reset ~Oct 1 after May/June ANRE order). TEL's June 2024 +40% system services tariff hike delivered **+7.35% single day**; TGN's Oct 2023–Sept 2024 +58% regulated revenue cycle doubled net profit. Sensitive to ROBOR/NBR rates (discount rate for RAB) and to state dividend directives. TGN +233% YoY to April 2026 is an extreme outlier driven by post-cap regulatory reset + BRUA/Vertical Corridor capex + Neptun Deep offtake.

### Real estate (ONE, IMP)

Highest beta to rates on BVB. **Every +100bp NBR hike historically delivered ~-15 to -20% on ONE**; ONE fell 25%+ during the 2022 rate cycle peak (ROBOR 3M ~7.5%). Catalysts: quarterly presales (>20% YoY surprise = +5–7% in 48h), Bucharest imobiliare.ro index, "Noua Casa" program changes, EUR/RON (presales in EUR). The May 2026 expected first rate cut is a high-conviction ONE long setup.

### Consumer (SFG, AQ, WINE, M)

Extreme heterogeneity. **SFG has the highest COVID/lockdown beta** (–75% Mar–Oct 2020 to RON 11.30 ATL; +80% in 2023). AQ has FMCG distribution stability and 3.4–7.7% yield floor. WINE has export/FX beta (Poland, China shipments, EUR/RON). **M (MedLife)** has acquisition-driven alpha (60+ M&A deals, +365% cumulative from 2016 IPO to 2022, crossed €1bn market cap in 2025); added to FTSE Russell Emerging Markets March 2022 as a rerating catalyst. Mid-caps as a group **have the highest political event beta** (MedLife, Aquila, TTS, Antibiotice, Purcari all –3 to –7.6% on the 2024 election shock days).

### Industrial (TRP, CMP, ALR, EL)

**ALR aluminum beta to LME is only 0.24** — dampened by a long-term regulated electricity contract with Hidroelectrica; strongest correlation at LME >$3,000/t. ALR is **inversely sensitive to Romanian electricity wholesale prices** (~40% of cash costs crushed margins in 2022 crisis). TRP is a PVC + construction PMI play; ATH RON 1.036 on Oct 12, 2021 post-Kingspan divestiture; paid RON 226.6m special dividend (~24% gross yield) in July 2021. CMP is a German-auto supplier — –22% YoY into April 2026 on European auto slowdown.

### Tech/Telecom (DIGI)

A Spanish-telecom-consolidation play since 2023 rather than a Romanian telecom stock. **ATL RON 11.60 May 2019 → ATH RON 76.90 Feb 2026 (+560%)** on MásOrange remedies, €120m Spanish spectrum acquisition, FTTH sale to Macquarie consortium for up to €750m mid-2024. –36% correction from Feb 2026 ATH to RON 48.95 on Spain IPO rumors. Event-driven on EU/CNMC regulatory decisions. Leverage watch critical: net debt/EBITDA >3.5x → derating risk.

## 4. Predictive signal framework: what to monitor before BVB moves

The most powerful leading indicators organize into five families. Thresholds below are operational; strength ratings reflect hit-rate in the 2015–2026 sample.

**FX and domestic rates (strongest idiosyncratic signals).** EUR/RON closing **>4.95 for 2 days** → BET –1 to –2% within 0–3 days (moderate). EUR/RON **>5.00** (psychological) → –2 to –4% within 0–5 days (strong). EUR/RON **>5.10** (above NBR comfort band) → –3 to –6%, banks lead (strong). The RO 10Y yield **crossing 7.40%** with a 10-day rise of >40bp is a high-conviction short for banks. **RO 5Y CDS widening >20bp in 3 sessions with no equivalent HU/PL move** is the cleanest stand-alone BET short signal; CDS typically leads cash equity by 1–3 days in stress. The RO-DE 10Y spread >500bp historically precedes rating actions.

**International markets (best overnight read).** **DAX overnight futures are the single best opening signal** — BET follows ~60% of DAX overnight move within the first two hours. Stoxx 600 Banks weekly –3% reliably delivers TLV/BRD leading BET lower by 2–3%. MSCI EM –3% week delivers BET –1.5 to –2.5%. WIG20 co-moves same session (not leading). VIX doubling to >25 from <18 delivers BET –2 to –4% within 3 days.

**Commodity family (sector-specific).** Brent >+5% week → SNP +3–7% (SNP alone contributes +0.6–1.2% to BET). TTF >€50/MWh → SNG +3–5%. EUA carbon price inverse for utilities (H2O benefits), direct for conventional. Romanian hydrology data (reservoir levels <70% of norm for 4+ weeks summer) → H2O –8 to –12% over 4–8 weeks.

**Political/fiscal calendar.** **Fiscal ordinance leaks from Finance Ministry targeting listed SOEs are the highest-conviction short signal in the dataset** (template: OUG 114/2018 → –11.2%). Sunday election exit-poll shocks transmit fully at Monday open; if anti-system candidate leads, short at open, size up if CDS widened the prior Friday. Court resolutions of political crises deliver relief rallies (+3–5% Dec 6, 2024; +3.5% May 19, 2025). PNRR disbursement approvals add +0.5–1.5% over 3 days; milestone failures deliver –1.5 to –3%.

**Rating and index events.** Outlook changes Stable→Negative deliver –2 to –4% over 0–3 days (all three agencies made this move Dec 2024–Mar 2025). **Downgrade to junk (BB+/Ba1) would deliver –6 to –12% within a week** due to forced IG-mandate selling — this is currently a live tail risk since all three are BBB-/Baa3 Negative. FTSE/MSCI inclusion rebalance windows (T-40 to T-1) deliver +3–6% for additions, –3–8% for deletions (e.g., SNP Feb 2026 deletion). **MSCI EM upgrade from Advanced Frontier would deliver estimated +8–15% and ~$180m passive flows** — high-impact single event to monitor at the annual June review.

**Calendar structure.** April–May earnings season (Q1 + annual results with dividend proposals), June ex-dividend cluster (H2O early June, SNP mid-May, SNG early July, TLV mid-June, SNN June) mechanically drags BET by 2–4% in June alone. **July–August liquidity collapses to ~70% of average** — reduce position size 40% and widen stops 30%. Q3 reports October–November, annual results February–March. December last two weeks have a positive window-dressing bias (+1–3%). NBR meets ~8x/year on Mondays/Tuesdays; Inflation Reports published Feb/May/Aug/Nov.

## 5. Trading rules derived: concrete encodable rules

These rules are designed as boolean triggers with specific thresholds, direction, horizon and exit condition. Expected magnitudes are central estimates from the decade dataset.

| Rule ID | Trigger | Action | Horizon | Expected | Exit |
|---|---|---|---|---|---|
| **FX-1** | EUR/RON close >5.05 for 2 days AND RO 5Y CDS +15bp w/w | Short BET / reduce longs | 3–5 days | –2 to –4% | EUR/RON <5.02 or T+5 |
| **FX-2** | EUR/RON –0.5% intraday after NBR intervention | Long TLV, BRD | 1–3 days | Banks +1.5 to +3% | Target hit or T+3 |
| **FX-3** | EUR/RON >5.10 break after tight 30-day range at 5.05–5.10 | Short BET (band cracked) | 1–2 weeks | –3 to –5% | Reversal back into band |
| **INT-1** | DAX futures –1.5% at BVB open 09:45 EET | Short BET at open | Intraday | BET follows ~60% of DAX move | Cover by 14:00 EET |
| **INT-2** | WIG20 +1%, BUX +1%, BET flat for 2 sessions | Long BET (catch-up) | 1–3 days | +0.8 to +1.5% | Target hit |
| **INT-3** | VIX jumps >30% in a day AND closes >25 | Short BET next open | 3 days | –2 to –4% | T+3 or VIX <22 |
| **COM-1** | Brent +4% in one session | Long SNP at next open, beta 0.5–0.7 | 1 day | SNP +2–3% | EOD |
| **COM-2** | TTF jumps >10% w/w on supply disruption | Long SNG, beta 0.4–0.6 | 1–2 weeks | SNG +3–5% | TTF normalizes |
| **COM-3** | Romanian reservoirs <70% of norm 4+ weeks summer | Short H2O | 4–8 weeks | –8 to –12% | Hydrology recovery or T+60 |
| **RAT-1** | RO 10Y yield close >7.40% AND 10-day move >+40bp | Short BET / banks | 10 sessions | –2 to –4% | Yield <7.20% or T+10 |
| **RAT-2** | RO 5Y CDS +20bp in 3 sessions with no HU/PL equivalent | Short BET | 1 week | –2 to –3% | CDS retracement |
| **RAT-3** | Confirmed NBR first cut at May 2026 meeting | Long BET 5 days pre-meeting | Through meeting +2 days | +2 to +4% | T+7 post-meeting |
| **RAT-4** | CPI prints >+0.3pp above consensus | Short BET at open | Intraday | –0.8 to –1.5% | EOD |
| **POL-1** | New fiscal package targeting listed SOEs announced | Short BET immediately | 3–5 days | –3 to –8% | Target hit or softening signal |
| **POL-2** | Sunday exit poll shows anti-system 1st-round lead | Short BET at Monday open | 1–2 days | –4 to –8% | Court/official resolution |
| **POL-3** | Court/official resolution AFTER BET has sold off >5% | Long BET at next open | 1 day | +3 to +5% | EOD +1 |
| **POL-4** | EC approves PNRR payment request | Long BET | 3 days | +0.8 to +1.5% | T+3 |
| **POL-5** | PNRR milestone failed with payment suspension | Short BET | 2–5 days | –1.5 to –3% | T+5 |
| **CAL-1** | Blue-chip ex-dividend cluster day | Do NOT treat drop as signal; adjust for dividend | N/A | Mechanical | Post-ex |
| **CAL-2** | Jul 15 – Aug 20 | Reduce size 40%, widen stops 30% | Ongoing | Lower SNR | Sep 1 |
| **CAL-3** | Dec 15 – Dec 30 | Long BET (window dressing bias) | 2 weeks | +1 to +3% | Dec 30 |
| **RATAG-1** | Any agency outlook Stable→Negative | Short BET post-announcement | 2 days | –2 to –4% | T+2 |
| **RATAG-2** | ⚠ Any agency downgrades RO to junk | Reduce longs to 20%, consider outright short | 1 week | –6 to –12% | Rating reversal (rare) or T+10 |
| **RATAG-3** | Agency affirms BBB- with no deterioration after feared review | Long BET Monday open | 1 day | +1 to +2% | EOD |
| **IDX-1** | 40 days before FTSE GEIS effective date | Long additions / short deletions | To effective date | ±3 to ±6% | Effective date close |
| **IDX-2** | MSCI June 2026 upgrades RO to Emerging | Long liquid BET basket (TLV, H2O, SNP, BRD) | 1–3 months | +8 to +15% | Target hit or T+90 |
| **GEO-1** | Ukraine escalation within 100km of RO border | Short BET, reduce overnight | 3 days | –2 to –5% | De-escalation signal |
| **GEO-2** | Credible Ukraine ceasefire/truce | Long reconstruction theme (TGN, TRP, construction) | 3–10 days | +3 to +6% | Target hit |
| **REGIME-1** | Score ≥5 of: EUR/RON >5.05 (w=2), DAX <-1% (w=1), CDS +15bp w/w (w=2), VIX >25 (w=1), RO 10Y >7.40% (w=2) | Max defensive: cash >60% | Ongoing | Risk-off regime | Score <3 |
| **REGIME-2** | Score ≥6 of: DAX >200DMA (w=1), EUR/RON <5.02 (w=1), CDS <120bp (w=2), RO 10Y <6.80% (w=2), NBR dovish tone (w=2) | Max long: cash <20% | Ongoing | Risk-on regime | Score <4 |

## 6. Risk warnings: patterns that preceded major drawdowns

**Outside-budget-cycle fiscal announcements are the single most reliable drawdown precursor.** The December 2018 OUG 114 template repeats: Finance Ministry weekend press briefings or late-evening emergency ordinances with no prior parliamentary signaling have produced every major single-day drop >5% in the 2015–2026 sample. Pre-positioning: if Monday-morning press aggregators surface "Ministerul Finanțelor pregătește" headlines referencing bank, energy or IT taxes without a prior budget law, reduce exposure immediately.

**Rating-agency outlook clustering is a downgrade precursor.** All three agencies moved to Negative within 80 days (Dec 24, 2024 Fitch → Jan 24, 2025 S&P → Mar 14, 2025 Moody's). This clustering is a leading indicator for actual downgrade in 6–12 months absent fiscal correction. ⚠ **The current April 2026 state (all BBB-/Baa3 Negative, 8.6% of GDP deficit 2024, EDP escalated, inflation 9.3%) is the highest-risk configuration in the entire dataset for a downgrade-to-junk scenario that would be a discontinuous regime change.**

**EUR/RON breaking multi-year ceiling levels has historically preceded CDS blowouts.** The May 5, 2025 cross of 5.00 coincided with RO 10Y spiking to 8.0% and Eurobonds trading at junk-like spreads despite IG rating — an out-of-sample confirmation that **the RON breaking technical levels produces faster repricing than rating actions**.

**Election first-round surprises that produce Monday opens at –2.5% or worse have historically been followed by relief rallies within 2–3 weeks** — this is a mean-reversion setup, not a sell-and-hold. But position sizing must respect the tail: the Dec 2024 and May 2025 events each included intraweek drawdowns of 5–10% before resolution.

**Idiosyncratic single-stock events that signal broader regulatory risk:** the July 2023 SNG post-windfall dividend collapse from RON 3.42 to RON 0.16 (2024) illustrates that regulatory absorption of cash flows can cut payouts **>90%** year-over-year at state-owned names — never treat a trailing yield as forward yield for state energy stocks under active windfall regimes.

**Regime breaks to flag for model retraining:**
- Pre-H2O vs post-H2O (July 2023): BET composition shifted meaningfully; pre-2023 sector weights no longer apply.
- Pre-2022 vs post-2022 TTF–SNG correlation: collapsed from 0.70 to 0.30 after windfall caps.
- Pre-OTP vs post-OTP TLV (2024 close): TLV added ~EUR 19bn assets, changing its NII sensitivity.
- Pre-Negative-outlook vs post-Negative-outlook cluster (Dec 2024 onward): sovereign-risk sensitivity amplified; historical betas underestimate tail.
- Pre-FTSE Secondary Emerging (Sep 2020) vs post: foreign ownership and liquidity profile materially different.
- Pre-electricity-cap-removal vs post (July 2025): utility margin structure fundamentally changed.

**Patterns no longer valid:**
- TTF gas → SNG linear pass-through (broken by OUG 27/2022 caps).
- SNG as a high-yield name (payout collapsed post-2023).
- DIGI as a pure Romanian telecom (now Spanish-M&A driven).
- ALR as a clean LME aluminum proxy (electricity contract dampens).
- Oil & gas sector as homogenous (SNP removed from FTSE All Cap Feb 2026, passive flow divergence).

## Conclusion: what the decade teaches the engine

BET is not a market where US-style momentum factors dominate; it is a market where **three discrete regime states** govern returns: (A) fiscal-ordinance shock, (B) political-event binary, (C) global-risk-transmitted beta via DAX/Stoxx Banks. The engine's alpha should come from being **early to state changes** — specifically by monitoring the Finance Ministry press feed, Sunday evening electoral counts, and the EUR/RON 5.00–5.10 band — rather than from traditional technical signals that work in deeper markets. The next 12 months contain three high-conviction trade setups: the May 2026 NBR first cut (Rule RAT-3, long BET), the June 2026 MSCI review (Rule IDX-2, basket long on potential EM upgrade), and the tail-risk hedge against downgrade-to-junk (Rule RATAG-2, explicit short book). The structural bull case — Hidroelectrica, Neptun Deep (2027 first gas), defense-spending acceleration to 2.5%+ of GDP, EU reconstruction flows if Ukraine ceasefire materializes — remains intact but is increasingly priced after the 70% YoY rally to April 2026, so the engine should **bias toward mean-reversion over trend-following at current levels** and keep a rigorous rating-downgrade tripwire as the dominant tail-risk discipline.