---
name: tax-tracker
description: Log every trade for Romanian tax reporting (Declarația Unică). Use this skill in the evening run whenever trades were executed during the day. It maintains a complete trade log with all data needed for the annual tax filing — purchase date, sale date, quantities, prices in RON, commissions, and computed gains/losses. At year-end, it generates a summary ready for the DU. Trigger after any trade execution, or when the user asks about tax obligations or wants to generate tax reports.
---

# Tax Tracker

Maintain a complete, accurate trade log for Declarația Unică filing.

## Romanian Tax Rules for IBKR (Non-Resident Broker)

Since IBKR is not a Romanian broker:
- Capital gains tax: 10% on net realized gains
- Losses can offset gains within the same year
- If the year ends negative, losses carry forward to offset up to 70% of next year's gains
- Dividends from Romanian companies: already taxed at source (8%), declare but no additional tax
- All amounts must be converted to RON using BNR exchange rate on the transaction date
- Filing deadline: May 25 of the following year

## Trade Log Format

Every trade must record:

```json
{
  "trade_id": "unique_id",
  "date": "2026-04-19",
  "symbol": "SNG",
  "isin": "ROSNGNACNOR3",
  "company_name": "S.N.G.N. Romgaz S.A.",
  "country": "RO",
  "action": "BUY|SELL",
  "quantity": 10,
  "price_per_share": 48.50,
  "currency": "RON",
  "total_value_ron": 485.00,
  "commission_ron": 0.49,
  "exchange_rate_bnr": 1.0,
  "notes": "Swing trade entry, RSI oversold bounce"
}
```

For BVB stocks traded in RON, exchange rate is 1.0. If any trades are in other currencies, fetch the BNR rate for that date.

## Gain/Loss Calculation

Use the committed script — it reads `fills/*` from the Firestore store (the authoritative trade record) and produces the FIFO-matched realized gain/loss:

```
node scripts/tax_fifo.mjs --year 2026             # summary
node scripts/tax_fifo.mjs --year 2026 --detail    # per-match detail
node scripts/tax_fifo.mjs --format=json           # machine-readable
```

**What the script does:**
- FIFO-matches every SELL to the earliest open BUY lot(s) of the same symbol
- Distributes commission per share on both sides (buy commission → cost basis; sell commission → reduces proceeds)
- Groups results by year × symbol; reports gains, losses, net, and estimated 10% tax
- Tracks partial lots (buy 20, sell 10 → 10 shares remain at original unit cost)
- Warns on short-sales or reconciliation gaps (sells exceeding open lots)

The `fills/*` collection is the single source of truth for the script. Never hand-edit fill docs; `trade-executor` is the only writer. If the script reports a reconciliation gap, investigate the fills — don't "fix" by editing them.

## Annual Summary Generation

When requested (typically in January-April for prior year), produce:

### Section 1: Capital Gains from Securities Transfer
```
COUNTRY | SYMBOL | TOTAL GAINS (RON) | TOTAL LOSSES (RON) | NET (RON)
RO      | SNG    | 450.00            | 0.00               | 450.00
RO      | TLV    | 0.00              | 120.00             | -120.00
...
TOTAL NET GAIN/LOSS: [X] RON
TAX DUE (10%): [X] RON
```

### Section 2: Dividend Income
```
COUNTRY | SYMBOL | GROSS DIVIDEND (RON) | TAX WITHHELD | TAX RATE | ADDITIONAL TAX DUE
RO      | SNG    | 200.00              | 16.00        | 8%       | 0.00 (covered)
```

### CASS (Health Insurance Contribution)
If total investment income exceeds 6 minimum gross salaries (check current threshold), CASS is due at 10% on the amount exceeding the threshold.

## Data Integrity Rules
- Never modify or delete a trade record after creation
- Every trade from the trade-executor MUST have a corresponding tax-tracker entry
- Reconcile with IBKR statement monthly — flag discrepancies
- Store BNR exchange rates for any non-RON transaction dates
