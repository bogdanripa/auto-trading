#!/usr/bin/env node
/**
 * X (Twitter) publisher — posts the same body that went to Telegram as a thread.
 *
 * Adds a preamble of hashtags so the user can filter by venue + mode:
 *   #BVB #demo   (for demo runs)
 *   #BVB #live   (for live runs)
 *
 * Free tier: 280 chars per tweet. Long bodies are split into a chain of replies
 * (Twitter threads). Smart split prefers paragraph breaks, then line breaks,
 * then sentence ends, then word boundaries. Never mid-word.
 *
 * Required env:
 *   X_API_KEY               OAuth1 consumer key
 *   X_API_SECRET            OAuth1 consumer secret
 *   X_ACCESS_TOKEN          OAuth1 user access token
 *   X_ACCESS_TOKEN_SECRET   OAuth1 user access token secret
 *   EXECUTION_MODE          'demo' or 'live' (used for the #demo / #live hashtag)
 *                           Falls back to inferring from BT_GATEWAY_API_KEY prefix.
 *
 * Optional env:
 *   X_VENUE_HASHTAG         Override the venue tag (default: BVB)
 *   X_DRY_RUN               '1' to log what would be posted without calling X
 *
 * Usage:
 *   node scripts/x_publisher.mjs --file /tmp/last_telegram_message.md
 *   node scripts/x_publisher.mjs           # reads body from stdin
 *
 * Exit codes:
 *   0  posted successfully (or dry-run)
 *   2  missing credentials — skipped, non-fatal for caller
 *   3  API rejected one or more tweets
 *   4  invalid input
 */

import crypto from 'node:crypto';
import fs from 'node:fs';

// ---------- config ----------------------------------------------------------

const TWEET_MAX = 280;
// 10-char buffer below the hard limit to absorb any miscount drift (combining
// marks, zero-width joiners in emoji sequences, etc.).
const SAFE_TWEET_MAX = 270;
const ENDPOINT = 'https://api.twitter.com/2/tweets';

// ---------- weighted character counting ------------------------------------
//
// Twitter's character counter weights most emoji and CJK characters as 2,
// not 1. The JS .length property returns UTF-16 code units, which gets the
// wrong answer for both (emoji are usually 2 code units, count as 2; CJK
// chars are 1 code unit, count as 2). This is a faithful-enough approximation
// — handles single emoji, ZWJ sequences (e.g. 👨‍👩‍👧 = one weighted unit of
// 2), and CJK. Won't perfectly match X's twitter-text reference impl on
// every exotic input, but for a trading briefing it's reliable.

const EMOJI_RE = /\p{Extended_Pictographic}/u;

function weightedLength(s) {
  let len = 0;
  let inEmojiSequence = false;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    // ZWJ (0x200D) glues code points into one emoji sequence — already counted.
    // Variation selector (0xFE0F) modifies the previous code point — free.
    if (cp === 0x200D || cp === 0xFE0F) continue;
    if (EMOJI_RE.test(ch)) {
      if (!inEmojiSequence) {
        len += 2;
        inEmojiSequence = true;
      }
      // Continuation of a ZWJ sequence — no extra cost.
      continue;
    }
    inEmojiSequence = false;
    // CJK Unified Ideographs, Hiragana, Katakana, Hangul → 2.
    if (
      (cp >= 0x3000 && cp <= 0x9FFF) ||
      (cp >= 0xAC00 && cp <= 0xD7AF) ||
      (cp >= 0xFF00 && cp <= 0xFFEF)
    ) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

function getMode() {
  const explicit = process.env.EXECUTION_MODE?.toLowerCase();
  if (explicit === 'demo' || explicit === 'live') return explicit;
  const gw = process.env.BT_GATEWAY_API_KEY || '';
  if (gw.startsWith('bvb_live_')) return 'live';
  if (gw.startsWith('bvb_demo_')) return 'demo';
  return 'demo';  // safest default
}

/**
 * Returns the hashtag preamble for the first tweet of the thread.
 *
 * Default set is opinionated for discoverability on FinTwit and Romanian
 * market hashtag streams. Override via X_HASHTAGS env (space-separated, no
 * leading '#' needed — they'll be prefixed if missing).
 *
 * The `#<mode>` tag is always appended last so the user can filter posts by
 * demo / live without configuring anything per-environment.
 */
function getHashtags() {
  const mode = getMode();
  const custom = process.env.X_HASHTAGS;
  let tags;
  if (custom && custom.trim()) {
    tags = custom.trim().split(/\s+/).map(t => t.startsWith('#') ? t : `#${t}`);
  } else {
    const venue = process.env.X_VENUE_HASHTAG || 'BVB';
    tags = [`#${venue}`, '#stocks', '#fintwit', '#Romania', '#algotrading'];
  }
  tags.push(`#${mode}`);
  return tags.join(' ');
}

/**
 * Returns optional @-mentions to prepend to the first tweet.
 * Configure via X_MENTIONS env, comma- or space-separated list of handles
 * (with or without leading '@'). Empty string / unset → no mentions.
 *
 * Example: X_MENTIONS="@BVBRomania @bnr_ro"
 */
function getMentions() {
  const raw = process.env.X_MENTIONS;
  if (!raw || !raw.trim()) return '';
  const handles = raw.trim().split(/[,\s]+/).filter(Boolean)
    .map(h => h.startsWith('@') ? h : `@${h}`);
  return handles.join(' ');
}

// ---------- cashtag conversion ---------------------------------------------
//
// BET-Plus universe (incl. legacy + Tier B). Standalone occurrences are
// converted to $TICKER form before splitting so X auto-links them to its
// per-symbol pages and FinTwit aggregators (StockTwits, TradingView) index
// the post under that symbol.
//
// Sorted longest-first so longer tickers match before shorter prefixes
// (e.g. SIF1 before SIF). 'M' (Medlife) is treated specially because the
// bare letter M shows up as a magnitude suffix ("EUR 60.4M") in briefings —
// we exclude any 'M' preceded by a digit, dot, or already-prefixed $.
//
// 'BVB' is in this list but we apply conversion to the body BEFORE attaching
// the hashtag preamble — so `#BVB` in the preamble is never mangled.

const BVB_TICKERS = [
  // Tier A — BET core
  'TLV', 'SNP', 'SNG', 'H2O', 'TGN', 'BRD', 'DIGI', 'EL', 'M', 'SNN',
  'TEL', 'PE', 'FP', 'ONE', 'AQ', 'TRP', 'TTS', 'ATB', 'SFG', 'CFH',
  // Tier B — BET-Plus beyond BET
  // Deliberately excluded:
  //   'BVB' — the bare letters appear as part of "BVB ENGINE" in every briefing
  //           title and as the #BVB hashtag. Engine doesn't currently trade
  //           the exchange's own ticker; add back with stricter context if it does.
  'WINE', 'COTE', 'ROCE', 'ALR', 'BIO', 'CMP', 'IMP', 'LION', 'OIL',
  'PPL', 'RRC', 'SIF1', 'SIF3', 'SIF5', 'STZ', 'TRANSI', 'UCM', 'EVER',
];

function convertCashtags(body) {
  // Longest first prevents "SIF" eating part of "SIF1".
  const sorted = [...BVB_TICKERS].sort((a, b) => b.length - a.length);
  let result = body;
  for (const t of sorted) {
    if (t === 'M') {
      // Single-letter ticker — only convert when surrounded by clean word
      // boundaries AND not preceded by a digit/dot/$ (rules out "60.4M",
      // "$M" already done, etc.)
      result = result.replace(/(?<![\d.$])\bM\b(?!\w)/g, '$$M');
    } else {
      // Standard case: word-boundary on both sides, not already cashtagged.
      const re = new RegExp(`(?<!\\$)\\b${t}\\b`, 'g');
      result = result.replace(re, `$$${t}`);
    }
  }
  return result;
}

function readBody() {
  const fileIdx = process.argv.indexOf('--file');
  if (fileIdx !== -1 && process.argv[fileIdx + 1]) {
    return fs.readFileSync(process.argv[fileIdx + 1], 'utf8');
  }
  // Read from stdin.
  return fs.readFileSync(0, 'utf8');
}

// ---------- threading -------------------------------------------------------

/**
 * A "section" is a logical chunk of a briefing — typically introduced by an
 * emoji-headed header line like:
 *
 *   📊 MACRO 🟢
 *   📈 PORTFOLIO
 *   🎯 TODAY'S ACTIONS
 *
 * Pattern: line starts with one or more pictographic characters, then space,
 * then either an uppercase letter or another pictographic. This recognizes
 * the briefing template in telegram-reporter/SKILL.md.
 */
// Header pattern: one-or-more pictographic chars (with optional variation
// selector) + space + UPPERCASE LETTER. The uppercase-letter requirement is
// what distinguishes a real header ("📊 MACRO", "📈 PORTFOLIO") from a body
// line that happens to start with emoji+space ("💰 25,915 RON", "📊 24,012").
const SECTION_HEADER_RE = /^(?:\p{Extended_Pictographic}️?)+ +[A-Z]/u;

function isSectionHeader(line) {
  if (!line || !line.trim()) return false;
  return SECTION_HEADER_RE.test(line);
}

/** Split body into sections (each = header line + content until next header). */
function parseSections(body) {
  const lines = body.split('\n');
  const sections = [];
  let current = [];
  for (const line of lines) {
    if (isSectionHeader(line) && current.length > 0) {
      sections.push(current.join('\n').trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join('\n').trim());
  return sections.filter(s => s.length > 0);
}

/**
 * Greedy fallback splitter — used when a single section is on its own bigger
 * than SAFE_TWEET_MAX. Splits prefer paragraph > line > sentence > word.
 * Never splits mid-word. Returns chunks under the weighted-length budget.
 */
function greedyChunkSplit(text, budget) {
  text = text.trim();
  if (weightedLength(text) <= budget) return [text];

  const chunks = [];
  let remaining = text;

  while (weightedLength(remaining) > budget) {
    // Find the latest natural cut point whose prefix fits.
    // Paragraph breaks (\n\n) are intentional content divisions — always
    // preferred, no minimum-size floor. Lower-priority breaks (line, sentence,
    // word) keep the 50% floor to avoid tiny shards mid-prose.
    let cut = -1;
    for (const sep of ['\n\n', '\n', '. ', '! ', '? ', ' ']) {
      const floor = sep === '\n\n' ? 0 : budget * 0.5;
      let pos = remaining.length;
      while (pos > 0) {
        const idx = remaining.lastIndexOf(sep, pos - 1);
        if (idx === -1) break;
        const candidate = remaining.slice(0, idx + (sep === ' ' ? 0 : sep.length - 1));
        if (weightedLength(candidate) <= budget) {
          if (weightedLength(candidate) >= floor) {
            cut = candidate.length;
            break;
          }
          pos = idx;
        } else {
          pos = idx;
        }
      }
      if (cut !== -1) break;
    }
    if (cut === -1) {
      // No natural break found — hard-chop at the largest prefix that fits.
      // Iterate by code point (not UTF-16) to avoid splitting surrogate pairs.
      let acc = '';
      for (const ch of remaining) {
        if (weightedLength(acc + ch) > budget) break;
        acc += ch;
      }
      cut = acc.length;
    }
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

/**
 * Section-aware splitter. Each section is its own tweet (or starts one).
 * Adjacent short sections may merge into a single tweet if both fit.
 * Sections too large for one tweet fall back to greedy split internally.
 *
 * `firstBudget` lets the caller reserve room for a hashtag preamble on the
 * first chunk only.
 */
function splitIntoTweets(body, { firstBudget = SAFE_TWEET_MAX } = {}) {
  body = body.trim();
  if (!body) return [];

  const sections = parseSections(body);

  // Body doesn't look like a sectioned briefing → treat it as one big section
  // and let the greedy splitter handle it.
  if (sections.length < 2) {
    return greedySplitWithFirstBudget(body, firstBudget, SAFE_TWEET_MAX);
  }

  const tweets = [];
  let current = '';
  let budget = firstBudget;

  const flush = () => {
    if (current.trim()) tweets.push(current.trim());
    current = '';
    budget = SAFE_TWEET_MAX;
  };

  for (const section of sections) {
    if (weightedLength(section) > budget) {
      // Section by itself is too big to fit in the remaining budget.
      flush();
      if (weightedLength(section) > SAFE_TWEET_MAX) {
        // Even on its own it overflows — internal greedy split.
        const sub = greedyChunkSplit(section, SAFE_TWEET_MAX);
        // First sub-chunk may be subject to firstBudget if this is also the
        // first tweet overall.
        if (tweets.length === 0 && firstBudget < SAFE_TWEET_MAX) {
          const headSub = greedyChunkSplit(section, firstBudget);
          tweets.push(headSub[0]);
          const tail = section.slice(headSub[0].length).trim();
          if (tail) tweets.push(...greedyChunkSplit(tail, SAFE_TWEET_MAX));
        } else {
          tweets.push(...sub);
        }
      } else {
        current = section;
      }
      continue;
    }
    if (current && weightedLength(current + '\n\n' + section) <= budget) {
      current = current + '\n\n' + section;
    } else if (!current) {
      current = section;
    } else {
      flush();
      current = section;
    }
  }
  flush();
  return tweets;
}

function greedySplitWithFirstBudget(body, firstBudget, restBudget) {
  if (weightedLength(body) <= firstBudget) return [body];
  // Take a first-tweet-sized chunk via the greedy splitter, then split the
  // remainder against the full budget.
  const head = greedyChunkSplit(body, firstBudget)[0];
  const tail = body.slice(head.length).trim();
  return [head, ...greedyChunkSplit(tail, restBudget)];
}

/**
 * Prepend the hashtag preamble to the first tweet only. Done by reserving the
 * preamble's weighted-length budget UPFRONT when splitting, so the first tweet
 * is composed at the right size on the first pass — no re-splitting required.
 */
function withPreamble(body, preamble) {
  const preambleCost = weightedLength(preamble) + 2;  // +2 for "\n\n"
  const tweets = splitIntoTweets(body, {
    firstBudget: SAFE_TWEET_MAX - preambleCost,
  });
  if (tweets.length === 0) return [];
  tweets[0] = `${preamble}\n\n${tweets[0]}`;
  return tweets;
}

// ---------- OAuth 1.0a ------------------------------------------------------

function percentEncode(s) {
  return encodeURIComponent(s)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function oauthHeader({ method, url, consumerKey, consumerSecret, token, tokenSecret }) {
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
  };
  // Body params are NOT included in the signature base for application/json.
  const paramStr = Object.keys(params)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');
  const base = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramStr),
  ].join('&');
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = crypto.createHmac('sha1', key).update(base).digest('base64');
  params.oauth_signature = signature;
  return 'OAuth ' + Object.keys(params)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(params[k])}"`)
    .join(', ');
}

// ---------- posting ---------------------------------------------------------

async function postTweet({ text, replyTo, creds }) {
  const body = replyTo
    ? { text, reply: { in_reply_to_tweet_id: replyTo } }
    : { text };

  const auth = oauthHeader({
    method: 'POST',
    url: ENDPOINT,
    consumerKey: creds.X_API_KEY,
    consumerSecret: creds.X_API_SECRET,
    token: creds.X_ACCESS_TOKEN,
    tokenSecret: creds.X_ACCESS_TOKEN_SECRET,
  });

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'authorization': auth, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = JSON.stringify(json);
    throw new Error(`X API ${res.status}: ${err}`);
  }
  const id = json?.data?.id;
  if (!id) throw new Error(`X API no tweet id in response: ${JSON.stringify(json)}`);
  return id;
}

// ---------- main ------------------------------------------------------------

async function main() {
  const creds = {
    X_API_KEY: process.env.X_API_KEY,
    X_API_SECRET: process.env.X_API_SECRET,
    X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET,
  };

  const missing = Object.entries(creds).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    console.error(`[x_publisher] Missing env vars: ${missing.join(', ')}. Skipping post.`);
    process.exit(2);
  }

  let body = readBody();
  if (!body.trim()) {
    console.error('[x_publisher] Empty body — nothing to post.');
    process.exit(4);
  }

  // Apply cashtag conversion before splitting so the character counts reflect
  // the final form. Cashtag '$' adds 1 char per ticker — must be in the budget.
  body = convertCashtags(body);

  // Preamble = optional @-mentions + hashtags. Mentions, if any, lead so they
  // show up cleanly above the tag cloud.
  const mentions = getMentions();
  const hashtags = getHashtags();
  const preamble = mentions ? `${mentions}\n${hashtags}` : hashtags;

  const tweets = withPreamble(body, preamble);
  console.error(`[x_publisher] Composed ${tweets.length} tweet(s) for thread.`);

  if (tweets.length > 10) {
    console.error(`[x_publisher] WARNING: thread is ${tweets.length} tweets — readers typically drop off after 7-10.`);
  }

  if (process.env.X_DRY_RUN === '1') {
    tweets.forEach((t, i) => {
      const weighted = weightedLength(t);
      const flag = weighted > TWEET_MAX ? ' ❌ OVER LIMIT' : '';
      console.error(`---- tweet ${i + 1}/${tweets.length} (${weighted} weighted / ${t.length} raw chars)${flag} ----`);
      console.error(t);
    });
    console.error('[x_publisher] DRY RUN — no tweets sent.');
    process.exit(0);
  }

  let replyTo = null;
  const ids = [];
  for (let i = 0; i < tweets.length; i++) {
    try {
      const id = await postTweet({ text: tweets[i], replyTo, creds });
      ids.push(id);
      replyTo = id;
      console.error(`[x_publisher] posted ${i + 1}/${tweets.length} id=${id}`);
    } catch (e) {
      console.error(`[x_publisher] failed at tweet ${i + 1}/${tweets.length}: ${e.message}`);
      process.exit(3);
    }
    // Light rate-limit cushion between thread parts.
    if (i < tweets.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  console.log(JSON.stringify({ ok: true, tweet_ids: ids, count: ids.length }));
}

main().catch(e => {
  console.error(`[x_publisher] FATAL: ${e.message}`);
  process.exit(3);
});
