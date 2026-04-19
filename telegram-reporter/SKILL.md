---
name: telegram-reporter
description: Format and send trading briefings via Telegram. Use this skill at the end of every morning and evening trading run to deliver the daily analysis, decisions, and portfolio status to the user. It compiles outputs from all other skills into a clear, actionable Telegram message. Also use for urgent alerts (stop-loss hits, override notifications, gateway errors). Trigger at the end of every daily run, or when an urgent alert needs to be sent.
---

# Telegram Reporter

Compile analysis from all skills and deliver formatted briefings via Telegram.

## Telegram Integration

Use the project's telegram skill to send messages. The bot should be configured with the user's chat ID and bot token.

## Message Types

### Morning Briefing (after morning run)
Full analysis summary. Structure:

```
🌅 BVB ENGINE — Morning [DD.MM.YYYY]

📊 MACRO [sentiment emoji: 🟢🟡🔴]
[2-3 sentences from macro-analyst]

📰 NEWS
[Top 2-3 items from bvb-news, one line each]

📈 PORTFOLIO
💰 [Cash] RON | 📊 [Invested] RON | 🏦 [Total] RON
[Each position: SYMBOL qty @ avg → current (±X%)]

🎯 TODAY'S ACTIONS
[Each order being placed with brief reasoning]
or "No trades today — nothing meets our criteria."

⚠️ ALERTS
[Stop-loss warnings, overrides, risk flags]
[Omit section if none]

🔭 WATCHING
[Top 2-3 stocks approaching setups]
```

### Evening Briefing (after evening run)
Shorter, focused on what happened:

```
🌙 BVB ENGINE — Evening [DD.MM.YYYY]

✅ FILLS
[What executed today: SYMBOL qty @ price]
or "No fills today."

📊 EOD PORTFOLIO
💰 [Cash] RON | 📊 [Invested] RON | 🏦 [Total] RON
Day: [±X%] | Total: [±X%]
[Each position with EOD P&L]

📰 LATE NEWS
[Anything relevant since morning]
or "Nothing material."

🔮 TOMORROW
[Key things to watch: earnings, ex-dates, macro events]
```

### Urgent Alert
For time-sensitive events outside normal runs:

```
🚨 BVB ENGINE ALERT

[What happened]
[Action taken or recommended]
[Current portfolio impact]
```

### Weekly Summary (Sunday evening)
```
📊 BVB ENGINE — Week [N] Summary

PERFORMANCE
This week: [±X%]
Month to date: [±X%]  
Total: [±X%]

TRADES THIS WEEK
[List of all trades with P&L]

PORTFOLIO
[Current positions with performance since entry]

TOP LEARNINGS
[What worked, what didn't, strategy observations]
```

## Formatting Rules

- Keep it concise. Telegram is mobile — short lines, no walls of text.
- Use emojis sparingly but consistently for quick visual scanning
- Numbers: always include RON amounts AND percentages
- Round to 2 decimal places for prices, 1 decimal for percentages
- Use 🟢 for positive, 🔴 for negative, 🟡 for neutral/warning
- Bold (**text**) for key actions and important numbers
- No markdown headers (Telegram renders them poorly) — use emoji labels instead

## Error Reporting

If any skill in the pipeline failed:
```
⚠️ ENGINE WARNING
[Skill name] encountered an error: [brief description]
Trading decisions made with incomplete data.
[What was affected and how the engine handled it]
```

If the engine couldn't run at all:
```
🔴 ENGINE DOWN
[Reason — gateway unreachable, API error, etc.]
No trades will be placed until resolved.
Last known portfolio state: [summary]
```
