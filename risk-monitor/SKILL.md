---
name: risk-monitor
description: Monitor portfolio risk in real-time — check stop-losses, exposure limits, correlation risk, and override conditions. Use this skill in both morning and evening daily runs to ensure the portfolio stays within defined risk parameters. It catches positions that need attention, flags concentration risk, and evaluates whether any mechanical stop-loss overrides are justified. Trigger whenever risk assessment is needed before or after trading decisions.
---

# Risk Monitor

Continuously monitor portfolio risk and flag positions or conditions that require action.

## Quick Path: run the report script

For every run, the first action is to call the deterministic report:

```
node scripts/risk_report.mjs --format=json
```

The script reads the portfolio state and journal via bt-gateway (`store.getState()` and `store.listJournal()`), then emits per-position stop distances, trailing-stop distances, time-in-trade, and any invalidation conditions captured at entry. At the portfolio level it computes single-stock weight, per-sector weight, cash ratio, and overall health.

Exit codes are the machine-readable verdict:
- `0` — GREEN: all within limits, no stops approaching
- `1` — YELLOW: at least one warning (position within 2% of stop, exposure near a limit)
- `2` — RED: a stop hit, a limit breached, or an invalidation condition is live

Feed the JSON into the synthesis step. Use `--refresh-prices` to force a fresh Yahoo pull if state is stale. The rules below are the interpretation layer that runs on top of the script's numbers — the script never makes trade decisions, it only surfaces the facts.

## Stop-Loss Monitoring

For each open position, check:

### Hard Stop (-10%)
```
Current price vs entry price
If (current_price / entry_price - 1) <= -0.10:
  → TRIGGER: Position hit hard stop
  → Default action: SELL at market (use aggressive limit)
  → Unless: Override conditions are met (see below)
```

### Trailing Stop (-7% from peak, trend rides only)
```
Track highest price since entry for each position
If (current_price / peak_price - 1) <= -0.07:
  → TRIGGER: Trailing stop hit
  → Action: SELL
```

### Profit Target (+15-20%, swing trades only)
```
If (current_price / entry_price - 1) >= 0.15:
  → ALERT: Consider taking profits
  → If momentum still accelerating (RSI rising, volume increasing): HOLD
  → If momentum fading: SELL half, trail stop on remainder
```

## Override Evaluation

When a stop-loss is hit, the analysis layer can override IF AND ONLY IF:

**Legitimate override reasons:**
1. Market-wide selloff (BET index down >3%) with no company-specific bad news
2. Ex-dividend price adjustment (mechanical, not real loss)
3. Temporary liquidity-driven move (large block trade pushed price, already recovering)
4. Known catalyst within 5 trading days that hasn't played out yet

**NOT legitimate override reasons:**
- "It'll come back" without specific reasoning
- Averaging down hope
- Emotional attachment to a position
- The loss feels too big to realize

**Override format:**
```
⚠️ STOP-LOSS OVERRIDE
Position: [SYMBOL] at -[X]%
Override reason: [specific, factual reason]
New stop: -[X]% or [N] sessions, whichever first
Worst-case loss if override fails: [X] RON ([Y]% of portfolio)
Confidence in override: [High / Medium] (Low = don't override)
```

Never override more than ONE position at a time. If two positions hit stops simultaneously, that's a market signal — respect it.

## Exposure Checks

### Concentration Risk
- Single stock > 30% of portfolio → REDUCE
- Single sector > 60% of portfolio → FLAG (don't add more)
- Top 2 positions > 50% of portfolio → FLAG

### Sector Mapping

The authoritative sector map lives in `scripts/risk_report.mjs` (`SECTOR_MAP`). When you add a new name, update it there — the sector cap is enforced by trade-executor's pre-trade checks consulting the same map.

Current buckets:
```
Energy:             SNP, SNG, RRC, OIL
Utilities:          H2O, SNN, TEL, EL, TGN, COTE, TRANSI, PE
Banking:            TLV, BRD
Real Estate:        ONE, IMP
Consumer:           SFG, AQ, WINE, CFH
Healthcare:         M, BIO, ATB
Industrial:         TRP, CMP, ALR, TTS
Tech/Telecom:       DIGI
Financial Services: FP, BVB, EVER, SIF1-SIF5
```

### Correlation Risk
- Multiple energy stocks move together — holding SNN + SNP + SNG is effectively 3x energy exposure
- Banking stocks (TLV, BRD) are highly correlated
- Flag when portfolio has >2 positions in the same sector

### Cash Reserve
- Cash < 10% of portfolio → WARNING: Too fully invested
- Cash < 5% → CRITICAL: Sell something or stop buying

### Liquidity Risk (per position, BVB-calibrated)

A position is only as good as the exit. On BVB, where even "liquid" mid-caps trade a few hundred thousand RON per day, position size relative to ADV determines how many sessions it takes to exit cleanly — and how much slippage a forced exit will cost.

For every open position, the risk report computes:

- **`adv20_ron`** — the symbol's 20-day average daily value traded (from `scripts/indicators.mjs`).
- **`position_adv_pct`** = `position_value_ron / adv20_ron × 100` — position as % of a typical day's tape.
- **`exit_days_at_20pct`** = `position_value_ron / (0.20 × adv20_ron)` — trading sessions needed to unwind at a reasonable 20% participation rate (a rate that does not by itself move the price materially on BVB).

Flag thresholds:

| Metric | Green | Yellow | Red |
|---|---|---|---|
| `exit_days_at_20pct` | ≤ 3 sessions | 3–5 sessions | > 5 sessions |
| `adv20_ron` absolute | ≥ 500,000 RON | 100,000–500,000 RON | < 100,000 RON while holding |
| ADV vs. entry-day ADV | ≥ 70% | 50–70% (`LIQUIDITY_DETERIORATION` watch) | < 50% (`LIQUIDITY_DETERIORATION` — tape is drying up under us) |

Red on liquidity is distinct from red on P&L — a position can be green on stops and red on liquidity. Action when red on liquidity alone:

1. Do not add to the position (pyramiding a position that's already hard to exit compounds the problem).
2. Prefer a graceful trim (1/3 over 3 sessions) over a single-session full exit, unless a hard stop has also fired or an invalidation condition is live. When a hard stop and a liquidity red both fire, the stop wins — take the slippage and exit.
3. In the **summer liquidity-collapse window** (Jul 15 – Aug 20, rule `CAL-2`), pre-emptively re-run the report; ADV drops 30–50% sector-wide and green positions can flip to yellow/red without any trade on our side.

## Portfolio-Level Risk Metrics

Calculate and report:
- **Max drawdown**: Largest peak-to-trough decline since inception
- **Current drawdown**: Current value vs all-time high
- **Portfolio beta**: Approximate sensitivity to BET index moves
- **Concentration score**: Herfindahl index of position weights
- **Days since last trade**: Flag if >10 days (make sure we're not asleep)

## Daily Risk Report

```
🛡️ RISK REPORT — [DATE]

STOP-LOSS STATUS:
[For each position: distance to stop, status]

EXPOSURE:
- Largest position: [SYMBOL] at [X]%
- Largest sector: [SECTOR] at [X]%
- Cash ratio: [X]%

LIQUIDITY:
- Thinnest holding: [SYMBOL] — ADV20 [X] RON, exit at 20% participation ≈ [N] sessions
- Any position with exit_days > 5 → listed here explicitly

RISK FLAGS:
[Any limits breached or approaching]

OVERRIDES ACTIVE:
[Any current stop-loss overrides with remaining time/levels]

PORTFOLIO HEALTH: [GREEN / YELLOW / RED]
```

## Macro-Trigger RED Conditions

These come from the rulebook (`rules/bvb_rules.json`) evaluated by `scripts/evaluate_rules.mjs` on the macro-analyst's market snapshot. They are portfolio-level RED signals that override the position-level picture — even if every stop is untriggered, these alone flip the report to RED and force a posture shift on the next run.

- **FX-3 band break: EUR/RON > 5.10 intraday** — historical regime-break threshold. Fire RED: cash floor lifts to 60%, no new non-FX-hedged longs that session. Reference: `bvb-historical-patterns.md` §2 (FX regime).
- **RAT-2 CDS spike: 5Y RO CDS +20bp over 3 consecutive sessions** — sovereign-risk widening template (2023 August, 2024 post-election). Fire RED: freeze new longs, prioritise trimming rate-sensitive names (ONE, IMP, banks).
- **RATAG-2 tripwire: S&P or Fitch or Moody's downgrades Romania to sub-IG** — not a probability-weighted event, it is a hard cap. If fired: new-long allocation capped at 20% of portfolio, existing longs in rate-beta names (ONE/IMP/TLV/BRD) reviewed for partial trim the same session.
- **REGIME-1 risk-off score ≥ 5** (weighted sum across FX band, rate spread, CDS level, DAX/Stoxx weekly, political newsflow) — cash floor 60%, no new longs that day. The evaluator returns the current score; treat ≥5 as the escalation line.

When any of these fire, the Telegram alert must name the specific rule ID and the triggering value, not just say "risk-off."

## Escalation Rules
- GREEN: All within limits, no stops approaching, no macro RED triggers → Continue normal operations
- YELLOW: A position within 2% of stop, exposure near limits, or REGIME-1 score 3-4 → Extra scrutiny on next run
- RED: Stop hit, limit breached, override active, OR any macro-trigger RED above → Immediate action required, detailed Telegram alert naming the rule ID and value
