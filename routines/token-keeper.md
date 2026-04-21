# Token Keeper Routine

A tiny Claude Code routine that keeps the BT Trade session alive between
morning/evening trading runs.

## Why

BT Trade's refresh token expires ~1h after issue. The morning routine runs at
07:30 and the evening routine at 17:30 — a 10-hour gap that outlives the
refresh token, so the evening run would always start with a fresh login.
Fresh logins work fine (OTP delivery is automated via ntfy for SMS, email
for demo), but they're slower, add a latency bump to the evening briefing,
and — if done too often — trip BT's fraud heuristics.

The keeper fires every 45 minutes, rotates the tokens via
`client.auth.refresh()`, and the new snapshot is written to Firestore by the
`onSessionChange` hook in `scripts/bt_executor.mjs`.

## Safety

`scripts/bt_executor.mjs refresh` runs in **resume-only** mode: if there's no
snapshot in Firestore, or the stored refresh token is already dead, it exits
with an error instead of attempting a fresh login. The keeper's job is to
extend an existing session — establishing one is the scheduled morning/
evening routine's job. Splitting the two roles keeps login frequency low.

## Schedule

Every 45 minutes, 24/7. The refresh token's ~1h server-side expiry means
firing every 45 min leaves a safety margin for one missed fire (network blip,
routine restart) before we lose the session.

Cron: `*/45 * * * *`

## Env vars

Same set as the trading routines:

- `FIRESTORE_PROJECT=auto-trader-493814`
- `GCS_SA_KEY_JSON=<single-line service-account JSON, roles/datastore.user>`
- `BT_USER`, `BT_PASS`
- `EXECUTION_MODE=demo` (or `live` — must match the main routines)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (for failure alerts)

`BT_NTFY_TOPIC` is **not** required — the keeper never logs in from scratch.

## Routine prompt

Paste this into a new routine at https://claude.ai/code/routines, scheduled
`*/45 * * * *`:

---

```
You are the BT Trade token-keeper. Your only job is to keep the BT Trade
session snapshot in Firestore fresh so the morning and evening trading
routines can resume silently without a 2FA prompt.

Steps (strict order, no skipping):

1. Run `npm install` at the repo root. The sandbox is ephemeral, so
   node_modules/ is always absent at start.

2. Run: `node scripts/bt_executor.mjs refresh`
   (demo vs live is picked up from the `EXECUTION_MODE` env var — no CLI flag.)

3. Interpret the exit code:
   - 0 → tokens rotated successfully. Print the JSON result and stop. Do
     NOT post to Telegram on success — 32 notifications/day is noise.
   - 2 → refresh failed. This is expected occasionally (network blip,
     stored session was invalidated). Post a single short alert to
     Telegram via `telegram-reporter` with the stderr tail, then stop.
     Do NOT attempt to re-run or log in.

Hard rules:
- Never call any command other than `refresh`. This routine is not allowed
  to place orders, read holdings, or touch portfolio state.
- Never attempt a fresh login. The `refresh` subcommand enforces this
  server-side (resume-only mode); don't try to work around it.
- Never commit anything. This routine makes no git changes.
```

---

## Failure handling

If the keeper alerts, the next morning/evening run will fall through to a
fresh login and re-establish the session automatically (OTP delivery is
automated). No manual intervention needed unless alerts fire repeatedly —
that would indicate a Firestore permissions issue or a BT-side account
lockout.
