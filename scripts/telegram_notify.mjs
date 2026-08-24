#!/usr/bin/env node
/**
 * Telegram briefing sender — replaces the old `telegram` skill, whose config
 * file (/sessions/<session>/telegram-skill/config.json) only existed inside
 * one specific session and was absent from every scheduled run's container
 * (8 consecutive failures, 2026-08-07 through 2026-08-24 — see
 * journal/2026-08.md). This script reads credentials from env vars instead,
 * which the Auto Trader environment carries into every run.
 *
 * Required env:
 *   TELEGRAM_BOT_TOKEN   Bot API token (from @BotFather)
 *   TELEGRAM_CHAT_ID     Numeric chat id to send to (the owner's private chat)
 *
 * Usage:
 *   node scripts/telegram_notify.mjs --file /tmp/briefing.md
 *   node scripts/telegram_notify.mjs           # reads body from stdin
 *
 * Behavior:
 *   - Splits on Telegram's 4096-char limit, preferring paragraph/line breaks.
 *   - Tries Markdown first; on a 400 (parse error — Telegram's legacy
 *     Markdown parser is picky about stray _*[]` characters), retries the
 *     same chunk as plain text rather than failing the whole briefing. This
 *     mirrors a failure actually hit in production (2026-08-13, message 903).
 *
 * Exit codes:
 *   0  sent successfully (all chunks)
 *   2  missing credentials — skipped, non-fatal for caller
 *   3  API rejected a chunk even as plain text
 *   4  invalid input (empty body)
 */

import fs from 'node:fs';

// Telegram's hard limit is 4096 chars; this leaves a safety margin below it.
// Telegram counts UTF-16 code units the same way JS .length does, so no
// weighting is needed here (unlike X's weighted emoji/CJK counting).
const SAFE_LIMIT = 4000;

function readBody() {
  const fileIdx = process.argv.indexOf('--file');
  if (fileIdx !== -1 && process.argv[fileIdx + 1]) {
    return fs.readFileSync(process.argv[fileIdx + 1], 'utf8');
  }
  return fs.readFileSync(0, 'utf8');
}

/** Greedy splitter: paragraph > line > sentence > word, never mid-word. */
function splitIntoChunks(text, limit = SAFE_LIMIT) {
  text = text.trim();
  if (!text) return [];
  if (text.length <= limit) return [text];

  const chunks = [];
  let remaining = text;
  while (remaining.length > limit) {
    let cut = -1;
    for (const sep of ['\n\n', '\n', '. ', ' ']) {
      const idx = remaining.lastIndexOf(sep, limit);
      if (idx > 0) {
        cut = idx + (sep === ' ' ? 0 : sep.length);
        break;
      }
    }
    if (cut === -1) cut = limit; // hard chop, no natural break found
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function sendChunk({ token, chatId, text, parseMode }) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = { chat_id: chatId, text };
  if (parseMode) payload.parse_mode = parseMode;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.ok, status: res.status, json };
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const missing = [];
  if (!token) missing.push('TELEGRAM_BOT_TOKEN');
  if (!chatId) missing.push('TELEGRAM_CHAT_ID');
  if (missing.length > 0) {
    console.error(`[telegram_notify] Missing env vars: ${missing.join(', ')}. Skipping send.`);
    process.exit(2);
  }

  const body = readBody();
  if (!body.trim()) {
    console.error('[telegram_notify] Empty body — nothing to send.');
    process.exit(4);
  }

  const chunks = splitIntoChunks(body, SAFE_LIMIT);
  console.error(`[telegram_notify] Sending ${chunks.length} message(s).`);

  const messageIds = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    // Try Markdown first, fall back to plain text on a parse error (HTTP 400).
    let result = await sendChunk({ token, chatId, text: chunk, parseMode: 'Markdown' });
    if (!result.ok && result.status === 400) {
      console.error(`[telegram_notify] chunk ${i + 1}/${chunks.length}: Markdown parse failed, retrying as plain text.`);
      result = await sendChunk({ token, chatId, text: chunk });
    }
    if (!result.ok) {
      console.error(`[telegram_notify] chunk ${i + 1}/${chunks.length} failed: ${JSON.stringify(result.json)}`);
      process.exit(3);
    }
    messageIds.push(result.json.result?.message_id);
    console.error(`[telegram_notify] sent ${i + 1}/${chunks.length} message_id=${result.json.result?.message_id}`);
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 300));
  }

  console.log(JSON.stringify({ ok: true, message_ids: messageIds, count: messageIds.length }));
}

main().catch(e => {
  console.error(`[telegram_notify] FATAL: ${e.message}`);
  process.exit(3);
});
