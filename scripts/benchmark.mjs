#!/usr/bin/env node
// Fetch current BET and BET-TR index values from bvb.ro.
//   node scripts/benchmark.mjs                          -> print JSON
//   node scripts/benchmark.mjs --append <value> <cash>  -> also append a row to
//     state/benchmark.csv (portfolio value and cash come from BT Trade MCP, the
//     caller passes them in). Skips the append if the index date is already there.
//
// Zero dependencies. bvb.ro serves values in Romanian number format
// ("36.154,88") with a "dd.mm.yyyy / hh:mm:ss" timestamp.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(repoRoot, 'state', 'benchmark.csv');
const HEADER = 'date,bet,bet_tr,portfolio_value,cash';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) auto-trading-engine/1.0';

function parseRoNumber(s) {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

async function fetchIndex(code) {
  const url = `https://www.bvb.ro/FinancialInstruments/Indices/IndicesProfiles.aspx?i=${code}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${code}: HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/<b class="value">([\d.,]+)<\/b>\s*<br \/>\s*<span class="date small">(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) throw new Error(`${code}: value pattern not found — bvb.ro layout may have changed`);
  return { value: parseRoNumber(m[1]), date: `${m[4]}-${m[3]}-${m[2]}` };
}

const [bet, betTr] = await Promise.all([fetchIndex('BET'), fetchIndex('BET-TR')]);
const out = { date: bet.date, bet: bet.value, bet_tr: betTr.value, bet_tr_date: betTr.date };
console.log(JSON.stringify(out, null, 2));

if (process.argv[2] === '--append') {
  const [portfolioValue, cash] = [process.argv[3], process.argv[4]].map(Number);
  if (!isFinite(portfolioValue) || !isFinite(cash)) {
    console.error('usage: benchmark.mjs --append <portfolioValue> <cash>');
    process.exit(1);
  }
  mkdirSync(dirname(CSV), { recursive: true });
  const existing = existsSync(CSV) ? readFileSync(CSV, 'utf8').trimEnd() : HEADER;
  if (existing.split('\n').some((l) => l.startsWith(out.date + ','))) {
    console.error(`row for ${out.date} already present — not appending`);
  } else {
    const row = `${out.date},${out.bet},${out.bet_tr},${portfolioValue.toFixed(2)},${cash.toFixed(2)}`;
    writeFileSync(CSV, existing + '\n' + row + '\n');
    console.error(`appended: ${row}`);
  }
}
