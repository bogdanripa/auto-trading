---
name: telegram-reporter
description: Format and send trading briefings via Telegram. Use this skill at the end of every morning and evening trading run to deliver the daily analysis, decisions, and portfolio status to the user. It compiles outputs from all other skills into a clear, actionable Telegram message. Also use for urgent alerts (stop-loss hits, override notifications, gateway errors). Trigger at the end of every daily run, or when an urgent alert needs to be sent.
---

# Telegram Reporter

Compile analysis from all skills and deliver formatted briefings via Telegram.

## Telegram Integration

Send messages via a direct HTTP call to the Telegram Bot API. No plugin dependency — this works identically in local Claude Code sessions and in Anthropic scheduled routines.

### Required environment variables
- `TELEGRAM_BOT_TOKEN` — BotFather token for the bot
- `TELEGRAM_CHAT_ID` — numeric chat ID of the recipient

Both are configured in the scheduled routine's environment (https://claude.ai/code/routines → routine → Environment). Never commit either to this repo.

### Simulation vs. live execution — Telegram always sends

Telegram delivery is **independent of `EXECUTION_MODE`**. Whether the engine is in `simulation`, `demo`, or `live` mode, real Telegram messages go out on every run. The user needs to see the decisions, fills, and alerts either way — the whole point of simulation mode is to validate the end-to-end pipeline including the notification path.

The only thing that changes between modes is the *content* of the message:
- In `simulation`, fills come from `scripts/sim_executor.mjs` (modeled) — label them as simulated if useful, but do not suppress the briefing.
- In `demo` / `live`, fills come from the real BT Trade account via `scripts/bt_executor.mjs`.

Do **not** add a mode guard around the Telegram HTTP call. If the env vars are missing, log and skip; never silently drop the message because the engine is in simulation.

### Sending a message

```
POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage
Content-Type: application/json

{
  "chat_id": "<TELEGRAM_CHAT_ID>",
  "text": "<message body>",
  "parse_mode": "Markdown",
  "disable_web_page_preview": true
}
```

Curl equivalent for quick tests:
```
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"...\",\"parse_mode\":\"Markdown\"}"
```

### Handling long messages
Telegram caps messages at 4096 characters. If the briefing exceeds that, split at paragraph boundaries and send sequentially. Prefix the second+ messages with `(2/N)`, `(3/N)` etc.

### Failure handling
- Log the full API response on any non-200
- If the response body contains `"chat not found"` — the chat ID is wrong or the user hasn't messaged the bot yet
- If `"Unauthorized"` — the token is wrong or revoked
- On transient failures (network, 5xx), retry once after 5 seconds. Then give up — don't block the trading pipeline on Telegram delivery
- If delivery fails, the run still succeeds; log the error for the next run's morning briefing to surface

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
