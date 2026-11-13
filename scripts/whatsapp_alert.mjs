#!/usr/bin/env node
/**
 * WhatsApp ERROR alert sender (owner request 2026-11-13: "each time we have
 * errors, let me know on whatsapp"). Use for failures only — briefings stay on
 * Telegram. Provider: Twilio WhatsApp API (UNTESTED until credentials exist).
 *
 * Required env (set on the Auto Trader environment):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 *   WHATSAPP_FROM   e.g. whatsapp:+14155238886 (Twilio sandbox/sender)
 *   WHATSAPP_TO     e.g. whatsapp:+40XXXXXXXXX (owner)
 *
 * Usage: node scripts/whatsapp_alert.mjs "message"   (or --file path, or stdin)
 * Exit: 0 sent, 2 missing credentials (non-fatal), 3 API rejected, 4 empty body.
 */
import fs from 'node:fs';
const i = process.argv.indexOf('--file');
let body = i > -1 ? fs.readFileSync(process.argv[i + 1], 'utf8')
  : process.argv[2] ? process.argv.slice(2).join(' ') : fs.readFileSync(0, 'utf8');
body = body.trim().slice(0, 1500);
if (!body) { console.error('[whatsapp_alert] empty body'); process.exit(4); }
const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, WHATSAPP_FROM: from, WHATSAPP_TO: to } = process.env;
if (!sid || !tok || !from || !to) { console.error('[whatsapp_alert] missing env vars — skipped'); process.exit(2); }
const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
  method: 'POST',
  headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'),
             'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ From: from, To: to, Body: '⚠️ BVB engine: ' + body }),
});
if (!res.ok) { console.error('[whatsapp_alert] API error', res.status, (await res.text()).slice(0, 300)); process.exit(3); }
console.log('[whatsapp_alert] sent');
