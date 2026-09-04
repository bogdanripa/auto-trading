# X (Twitter) posting — the public experiment channel

The owner runs this project as a **public experiment**. When a run has
something to report, it posts to X — a main post plus reply-chained posts as
needed (threads). Publisher: `scripts/x_publisher.mjs` (salvaged from the
previous engine at the owner's direction; handles OAuth, weighted 280-char
splitting, `$TICKER` cashtags with X's 1-per-tweet cap, and @-mentions in a
trailing reply).

## When to post

"Every day, **if there is something to report**" (owner's rule, **broadened
2026-09-04** at the owner's live direction). Prior to this date the bar
effectively excluded quiet no-action days by default — journal history shows
most no-trade days were skipped. That undercounted what "something to
report" should mean: the public value of this experiment is the *reasoning*,
not just the trades. Post when any of:
- orders placed or filled; positions opened/added/trimmed/closed
- a strategy change, a graded assumption with an interesting outcome
- a notable market event the engine acted on — or deliberately didn't
- weekly plan summaries (Sunday) and the monthly letter (1st)
- performance milestones vs the 2x-BET mandate, good or bad
- **material news on a held or watchlist name, even with no order** — a
  restart timeline, an earnings print, a guidance change, a dislocation
  tier crossed (in either direction) — reported as "here's what happened
  and why we did/didn't act", not just silently logged to the journal
- **a reasoned NO ACTION worth narrating** — e.g. a trigger that came close
  but didn't fire, a price still outside every entry band, a benchmark gap
  that moved meaningfully

**No post only when truly nothing happened**: no news on any held/watchlist
name, no watchlist-relevant price movement, portfolio/BET numbers
essentially flat from the last post, nothing new to say beyond a repeat of
yesterday's post. That bar is now the exception, not the default. Silence is
still better than a post with zero new information — but "we checked
everything and nothing changed" is itself only worth a skip if it's also
true that *yesterday's* post already said that.

## How to post

1. Compose the body AFTER the Telegram briefing, from the same facts —
   public-appropriate but honest: this experiment's value is transparency,
   including mistakes and lagging periods. Numbers stay real (portfolio value,
   %, vs BET). Structure with the emoji-headed section format
   (`📊 MARKET`, `🎯 ACTIONS`, …) — the splitter is section-aware.
2. Write the body to a temp file, then:
   `node scripts/x_publisher.mjs --file <path>` (set `X_DRY_RUN=1` first when
   testing changes). Plain tickers are auto-cashtagged — don't pre-`$` them.
3. Credentials come from env: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`,
   `X_ACCESS_TOKEN_SECRET`. If missing, the script exits code 2 — log it in
   the journal, continue the run, and mention the missing keys in the
   Telegram briefing so the owner can fix the environment.
4. Journal the thread's first-tweet URL (or id) with the run entry.

## Content rules

- Never present anything as investment advice; this is an automated
  experiment trading its own small account. If a post could read as a
  recommendation, reframe it as a decision report ("the engine bought",
  not "buy").
- No owner-personal information beyond what the experiment implies.
- Mistakes get posted with the same prominence as wins — the credibility of
  the experiment is the product.
- First-ever post should briefly introduce the experiment (autonomous
  Claude engine, real money, BVB, goal 2x BET, everything journaled in git).
- Verified company handles only in `scripts/ticker_x_handles.json` — never
  guess a handle; wrong @ is worse than none.
