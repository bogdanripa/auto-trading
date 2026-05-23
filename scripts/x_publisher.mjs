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
// Leave a little safety margin so a stray emoji doesn't blow the limit.
// (Twitter counts most emoji as 2 chars; the JS .length is UTF-16 code-units.)
const SAFE_TWEET_MAX = 270;
const ENDPOINT = 'https://api.twitter.com/2/tweets';

function getMode() {
  const explicit = process.env.EXECUTION_MODE?.toLowerCase();
  if (explicit === 'demo' || explicit === 'live') return explicit;
  const gw = process.env.BT_GATEWAY_API_KEY || '';
  if (gw.startsWith('bvb_live_')) return 'live';
  if (gw.startsWith('bvb_demo_')) return 'demo';
  return 'demo';  // safest default
}

function getHashtags() {
  const venue = process.env.X_VENUE_HASHTAG || 'BVB';
  const mode = getMode();
  return `#${venue} #${mode}`;
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
 * Greedy split into ≤SAFE_TWEET_MAX chunks. Splits prefer (in order):
 * paragraph break (\n\n), single newline, sentence end (. / ! / ?), word break.
 * Never splits mid-word.
 */
function splitIntoTweets(body) {
  body = body.trim();
  if (body.length === 0) return [];

  const tweets = [];
  let remaining = body;

  while (remaining.length > 0) {
    if (remaining.length <= SAFE_TWEET_MAX) {
      tweets.push(remaining.trim());
      break;
    }
    const slice = remaining.slice(0, SAFE_TWEET_MAX);
    let cut = -1;
    for (const sep of ['\n\n', '\n', '. ', '! ', '? ', ' ']) {
      const idx = slice.lastIndexOf(sep);
      if (idx > SAFE_TWEET_MAX * 0.5) {
        cut = idx + (sep === ' ' ? 0 : sep.length - 1);
        break;
      }
    }
    if (cut === -1) cut = SAFE_TWEET_MAX;  // last-resort: hard chop
    tweets.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  return tweets;
}

/**
 * Prepend the hashtag preamble to the first tweet only.
 * If adding the preamble pushes the first tweet over the limit, the body is
 * re-split with a reduced budget on the first chunk.
 */
function withPreamble(tweets, preamble) {
  if (tweets.length === 0) return [];
  const first = `${preamble}\n\n${tweets[0]}`;
  if (first.length <= SAFE_TWEET_MAX) {
    return [first, ...tweets.slice(1)];
  }
  // First chunk doesn't fit with the preamble — re-split with a smaller budget.
  const budget = SAFE_TWEET_MAX - preamble.length - 2;  // -2 for "\n\n"
  const overflow = tweets[0].slice(budget).trim();
  const head = `${preamble}\n\n${tweets[0].slice(0, budget).trim()}`;
  const rest = [overflow, ...tweets.slice(1)].filter(Boolean);
  return [head, ...rest];
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

  const body = readBody();
  if (!body.trim()) {
    console.error('[x_publisher] Empty body — nothing to post.');
    process.exit(4);
  }

  const tweets = withPreamble(splitIntoTweets(body), getHashtags());
  console.error(`[x_publisher] Composed ${tweets.length} tweet(s) for thread.`);

  if (process.env.X_DRY_RUN === '1') {
    tweets.forEach((t, i) => {
      console.error(`---- tweet ${i + 1}/${tweets.length} (${t.length} chars) ----`);
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
