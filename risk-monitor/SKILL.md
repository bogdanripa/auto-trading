---
name: risk-monitor
description: Monitor portfolio risk in real-time — check stop-losses, exposure limits, correlation risk, and override conditions. Use this skill in both morning and evening daily runs to ensure the portfolio stays within defined risk parameters. It catches positions that need attention, flags concentration risk, and evaluates whether any mechanical stop-loss overrides are justified. Trigger whenever risk assessment is needed before or after trading decisions.
---

# Risk Monitor

Continuously monitor portfolio risk and flag positions or conditions that require action.

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
```
Energy: SNN, H2O, SNP, SNG, TGN, COTE, OIL
Banking: TLV, BRD
Utilities: TEL, TRANSI
Real Estate: ONE, IMP
Consumer: SFG, AQ, WINE
Healthcare: M, BIO, ATB
Industrial: TRP, CMP, ALR, EL
Tech/Telecom: DIGI
Financial Services: FP, BVB, EVER, SIF1-SIF5
```

### Correlation Risk
- Multiple energy stocks move together — holding SNN + SNP + SNG is effectively 3x energy exposure
- Banking stocks (TLV, BRD) are highly correlated
- Flag when portfolio has >2 positions in the same sector

### Cash Reserve
- Cash < 10% of portfolio → WARNING: Too fully invested
- Cash < 5% → CRITICAL: Sell something or stop buying

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

RISK FLAGS:
[Any limits breached or approaching]

OVERRIDES ACTIVE:
[Any current stop-loss overrides with remaining time/levels]

PORTFOLIO HEALTH: [GREEN / YELLOW / RED]
```

## Escalation Rules
- GREEN: All within limits, no stops approaching → Continue normal operations
- YELLOW: A position within 2% of stop, or exposure near limits → Extra scrutiny on next run
- RED: Stop hit, limit breached, or override active → Immediate action required, detailed Telegram alert
