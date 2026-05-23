---
name: x-poster
description: Mirror the Telegram briefing to X (Twitter) as a thread. Adds a hashtag preamble — #BVB #demo or #BVB #live — to the first tweet so the user can filter by venue and mode. Run this skill immediately after telegram-reporter on every morning and evening run, and after any urgent alert that telegram-reporter dispatches. Trigger when the user asks to "also post to X", "mirror to Twitter", or wants to inspect/repost the last X thread.
---

# X Poster

Posts the exact same body that telegram-reporter just sent — as an X thread, with a hashtag preamble for filterability.

## Why a separate skill

- **Single responsibility:** Telegram and X have different APIs, rate limits, failure modes. Keeping them as two skills makes each easier to disable, debug, or rate-limit independently.
- **Identical content:** The user explicitly wants the X post to mirror the Telegram message. This skill reads what telegram-reporter just sent rather than re-deriving from raw skill outputs, so the two channels can never drift.

## Required environment variables

OAuth 1.0a user context credentials (set on the routine env, never in the repo):

- `X_API_KEY` — consumer key (a.k.a. "API Key")
- `X_API_SECRET` — consumer secret
- `X_ACCESS_TOKEN` — user access token
- `X_ACCESS_TOKEN_SECRET` — user access token secret

Mode detection (one of these must be set):

- `EXECUTION_MODE` — `demo` or `live` (preferred)
- `BT_GATEWAY_API_KEY` — falls back to inferring from the `bvb_demo_` / `bvb_live_` prefix

Optional:

- `X_VENUE_HASHTAG` — override the venue tag (default `BVB`)
- `X_DRY_RUN=1` — log the composed tweets but don't actually post (useful for testing)

## Where the body comes from

`telegram-reporter` writes the body it just sent to `/tmp/last_telegram_message.md`. This skill reads that file and pipes it into the publisher script. If the file is missing or empty, log it and skip — never block the run.

## How to run

```
node scripts/x_publisher.mjs --file /tmp/last_telegram_message.md
```

The script handles:

- **Hashtag preamble** — prepends `#BVB #demo` (or `#BVB #live`) to the first tweet
- **Threading** — splits long bodies at paragraph / line / sentence / word boundaries; chains via `reply.in_reply_to_tweet_id`
- **OAuth 1.0a signing** — done in-script, no external dependency
- **Rate-limit cushion** — 500ms between thread parts

## Exit codes — what to do with each

- **0** — success (or dry-run). Continue.
- **2** — missing creds. **Do not fail the run.** Log to stderr and continue; the user gets the Telegram message regardless.
- **3** — API error or partial failure. Log the stderr output (it contains the X API response). Continue with the next skill (none — this is the last step).
- **4** — empty input. Should not happen if telegram-reporter ran. Investigate.

## When this skill runs

- **Morning run:** immediately after `telegram-reporter`. Last step.
- **Evening run:** immediately after `telegram-reporter`. Last step (after retrospective on Fridays).
- **Urgent alerts:** when telegram-reporter dispatches an out-of-cycle alert, this skill should be invoked right after to mirror the alert to X.

## What this skill does NOT do

- Does not call any other skill's output directly. Only reads `/tmp/last_telegram_message.md`.
- Does not modify the body — no reformatting, no truncation beyond the natural thread-splitting. The body is whatever Telegram saw.
- Does not post quote-tweets, replies to specific users, or DMs. Only original tweets and self-reply threads.
- Does not delete tweets, edit them, or manage the X account in any other way.

## Failure handling

- Missing creds (exit 2) → log to stderr + Telegram report line. Skip.
- X API auth error → log full response. Skip. Don't retry — bad creds won't fix themselves.
- X API rate limit (429) → log. Skip this run. The script does NOT queue for retry; mirroring the next run is acceptable.
- Network / transient (5xx) → the script does one retry implicitly via the 500ms cushion; further retries would risk partial threads. If it fails, log and skip.

## Privacy / disclosure note

The user has explicitly chosen to mirror the Telegram content identically. This means cash balances, position sizes, broker IDs, and verbatim theses are posted publicly. If that ever changes, this skill is where to redact — pre-process the body before passing it to `x_publisher.mjs`. Until then, no filtering happens here.

## Verifying it worked

Each run posts a JSON line to stdout:

```json
{"ok": true, "tweet_ids": ["1234567890...", "..."], "count": 3}
```

`telegram-reporter` can include the count in its briefing footer ("📡 also posted to X (3 tweets)") so the user gets confirmation in the channel they're already watching.
