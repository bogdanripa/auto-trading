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

Optional — discoverability tuning:

- `X_HASHTAGS` — full custom hashtag set (space-separated, with or without `#`). When set, replaces the default `#BVB #stocks #fintwit #Romania #algotrading`. The `#<mode>` tag (`#demo` / `#live`) is always appended regardless.
- `X_VENUE_HASHTAG` — only the venue tag (default `BVB`). Ignored when `X_HASHTAGS` is set.
- `X_MENTIONS` — comma- or space-separated list of @-handles to prepend to **every** post (with or without `@`). Use for accounts that should be tagged regardless of which tickers the post discusses — e.g. the exchange itself, the central bank, regulator. Example: `X_MENTIONS="@BVBRomania @bnr_ro"`. Empty / unset → no static mentions.
- **`scripts/ticker_x_handles.json`** — ticker → handle map for per-post **dynamic** mentions. When a post discusses TLV, x-poster auto-adds the @ from this file's `"TLV"` entry. Empty string = no @ for that ticker. **Fill in handles only after verifying them yourself.** See "Dynamic ticker mentions" below.

Optional — testing:

- `X_DRY_RUN=1` — log the composed tweets but don't actually post

## Cashtag auto-conversion

BVB-Plus tickers in the body are automatically converted to FinTwit-style `$TICKER` cashtags before the body is split. This makes posts indexable by per-symbol pages on X, StockTwits, TradingView, etc.

Handled tickers (BET-Plus universe):
- **Tier A:** TLV, SNP, SNG, H2O, TGN, BRD, DIGI, EL, M, SNN, TEL, PE, FP, ONE, AQ, TRP, TTS, ATB, SFG, CFH
- **Tier B:** WINE, COTE, ROCE, ALR, BIO, CMP, IMP, LION, OIL, PPL, RRC, SIF1, SIF3, SIF5, STZ, TRANSI, UCM, EVER

Special cases:
- **`M`** (Medlife) — only matched when not preceded by digit/dot, so `EUR 60.4M` is NOT converted but `M (Medlife) RSI 25` IS.
- **`BVB`** — excluded from auto-conversion because every briefing title is "BVB ENGINE…" and the venue hashtag is `#BVB`. If the engine ever trades the exchange's own ticker, add it back with stricter context.

Body content writers don't need to manually $-prefix anything — the publisher does it on the way out.

### X enforces max 1 cashtag per tweet

X's anti-spam policy (introduced 2024) rejects any tweet with 2+ `$TICKER` references — HTTP 403 from POST /2/tweets. Our publisher handles this AFTER splitting the thread: per tweet, the first `$TICKER` is kept intact; every subsequent cashtag in the same tweet is reverted to plain `TICKER`. The same ticker usually appears cashtagged in another tweet of the same thread (different section), so discoverability is preserved across the thread even if a single tweet only carries one cashtag.

The relevant tradeoff: a portfolio-section tweet listing 4 holdings will only auto-link the first one to X's per-symbol page. Acceptable because the ticker @-handles (see "Dynamic ticker mentions" below) already notify each company's account anyway, and the same tickers are usually cashtagged in news/conviction sections.

## Dynamic ticker mentions

After detecting tickers in the body, the publisher looks up each one in `scripts/ticker_x_handles.json` and prepends the corresponding @-handle to the first tweet. This means a post discussing TLV automatically tags `@TLVbank` (or whatever's in the JSON), surfacing it to that account's followers.

Detection runs **before** cashtag conversion, so the regex sees the original `BRD` not `$BRD` — handles are looked up correctly regardless of cashtagging.

### Composition + caps

The first tweet's mentions line is composed as:

```
<static mentions from X_MENTIONS>  +  <ticker mentions from JSON, ordered by first appearance in body>
```

Caps (to prevent spammy posts):

- Max 3 static mentions
- Max 5 ticker mentions
- Max 6 total (after dedup — a static handle that's also in the JSON only appears once)

Excess handles beyond the cap are dropped silently. If a post mentions 7 tickers, only the first 5 (by body order) get @-tagged.

### Filling in handles

Open `scripts/ticker_x_handles.json` and replace empty strings with verified handles:

```json
{
  "TLV": "@TLVbank",
  "BRD": "",                       ← still unverified, no @ will be added
  "ONE": "@OneUnitedProp"
}
```

Don't guess. Wrong @ is worse than no @.

### When the JSON is empty / missing

`getTickerMentions()` logs a warning and returns no mentions. Static mentions (from `X_MENTIONS`) still work. The post goes out, just without ticker-specific tagging. Safe default.

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
