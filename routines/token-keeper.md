# Token Keeper Routine — RETIRED

The token-keeper routine is no longer needed.

Session keepalive is now handled by **bt-gateway** — a Cloud Run service with
its own Cloud Scheduler job that calls `POST /api/internal/cron/refresh` every
45 minutes. The gateway manages the BT Trade session end-to-end (credentials
stored encrypted via Cloud KMS, tokens refreshed server-side, Telegram alert
sent to the user on refresh failure).

`scripts/bt_executor.mjs` is now a thin HTTP client to the gateway. It holds
no session state and requires no keepalive routine on this side.

## What to delete

If you have a `*/45 * * * *` Claude Code routine running the old
`node scripts/bt_executor.mjs refresh` command, you can delete it — it will
fail anyway since the script no longer touches BT Trade directly.

## If a session dies

A Telegram alert will arrive from your configured bt-gateway bot. The
gateway will re-login automatically on the next API call (which triggers the
ntfy OTP flow). No manual intervention needed unless alerts fire repeatedly.
