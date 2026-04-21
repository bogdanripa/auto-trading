#!/usr/bin/env node
/**
 * Fetch Yahoo Finance OHLCV for BVB symbols and compute technical indicators.
 *
 * Node 18+ stdlib only (uses built-in fetch). No runtime deps.
 *
 * Usage:
 *     node scripts/indicators.mjs SNG TLV BRD
 *     node scripts/indicators.mjs --symbols-file universe.txt
 *     node scripts/indicators.mjs --format=json SNG H2O     # machine-readable
 *     node scripts/indicators.mjs --format=table SNG H2O    # human-readable
 *
 * Exit codes:
 *     0 — all requested symbols returned data
 *     1 — at least one symbol had no data (partial output still written)
 *     2 — fatal (bad args, network totally dead, etc.)
 */

import fs from 'node:fs';

const YAHOO_CHART = (sym) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=100d`;
const UA = 'Mozilla/5.0';

async function fetchYahoo(symbol) {
  const url = YAHOO_CHART(symbol);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const result = data?.chart?.result || [];
    return result[0] || null;
  } catch (e) {
    process.stderr.write(`[warn] yahoo fetch failed for ${symbol}: ${e.message}\n`);
    return null;
  }
}

// Wilder's RSI — matches sim_executor.py exactly on the last `period+1` closes.
function rsiWilder(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  // Python range(-period, 0) → iterate indices len-period .. len-1
  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta;
    else losses += -delta;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100.0;
  const rs = avgGain / avgLoss;
  return 100.0 - 100.0 / (1.0 + rs);
}

function sma(values, window) {
  if (values.length < window) return null;
  let s = 0;
  for (let i = values.length - window; i < values.length; i++) s += values[i];
  return s / window;
}

function atrPct(highs, lows, closes, period = 14) {
  if (closes.length < period + 1) return null;
  const trs = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    const h = highs[i], l = lows[i], pc = closes[i - 1];
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = trs.reduce((a, b) => a + b, 0) / period;
  return (atr / closes[closes.length - 1]) * 100;
}

function trendLabel(price, sma20, sma50) {
  if (sma50 == null) return 'unknown';
  if (price > sma50 && (sma20 == null || sma20 > sma50)) return 'up';
  if (price < sma50) return 'down';
  return 'range';
}

async function compute(symbol) {
  const raw = await fetchYahoo(symbol);
  if (!raw) return null;
  const meta = raw.meta || {};
  const quote = raw?.indicators?.quote?.[0] || {};

  const closes = (quote.close || []).filter((c) => c !== null && c !== undefined);
  const highs  = (quote.high  || []).filter((h) => h !== null && h !== undefined);
  const lows   = (quote.low   || []).filter((l) => l !== null && l !== undefined);
  let vols     = (quote.volume || []).filter((v) => v !== null && v !== undefined);

  if (!closes.length) return null;

  // Align arrays — trim to common length from the right.
  const n = Math.min(closes.length, highs.length, lows.length);
  const cs = closes.slice(-n);
  const hs = highs.slice(-n);
  const ls = lows.slice(-n);
  if (vols.length > n) vols = vols.slice(-n);

  const price = meta.regularMarketPrice ?? cs[cs.length - 1];
  // chartPreviousClose is pre-range, not yesterday. Use second-to-last close.
  const prevClose = cs.length >= 2 ? cs[cs.length - 2] : meta.chartPreviousClose;

  const s20 = sma(cs, 20);
  const s50 = sma(cs, 50);
  const s200 = sma(cs, 200);

  const avgVol20 = vols.length >= 20
    ? vols.slice(-20).reduce((a, b) => a + b, 0) / 20
    : null;
  const todayVol = vols.length ? vols[vols.length - 1] : null;
  const volRatio = (avgVol20 && todayVol != null) ? (todayVol / avgVol20) : null;

  const h20 = hs.length >= 20 ? Math.max(...hs.slice(-20)) : null;
  const l20 = ls.length >= 20 ? Math.min(...ls.slice(-20)) : null;

  return {
    symbol,
    price,
    prev_close: prevClose,
    daily_change_pct: (prevClose && price) ? ((price - prevClose) / prevClose) * 100 : null,
    rsi14: rsiWilder(cs),
    sma20: s20,
    sma50: s50,
    sma200: s200,
    atr14_pct: atrPct(hs, ls, cs),
    volume_today: todayVol,
    volume_avg20: avgVol20,
    volume_ratio: volRatio,
    high_20d: h20,
    low_20d: l20,
    high_52w: meta.fiftyTwoWeekHigh ?? null,
    low_52w: meta.fiftyTwoWeekLow ?? null,
    trend: trendLabel(price, s20, s50),
    currency: meta.currency ?? null,
    exchange: meta.exchangeName ?? null,
    n_bars: cs.length,
  };
}

function padLeft(str, w) { str = String(str); return str.length >= w ? str : ' '.repeat(w - str.length) + str; }
function padRight(str, w) { str = String(str); return str.length >= w ? str : str + ' '.repeat(w - str.length); }

function fmtNum(v, w, d = 2) {
  if (v == null) return ' '.repeat(w - 1) + '-';
  return padLeft(v.toFixed(d), w);
}

function formatTable(rows) {
  const header =
    `${padRight('SYM', 6)} ${padLeft('PRICE', 9)} ${padLeft('CHG%', 6)} ${padLeft('RSI14', 6)} ` +
    `${padLeft('SMA20', 9)} ${padLeft('SMA50', 9)} ${padLeft('TREND', 7)} ${padLeft('VOL×', 5)} ` +
    `${padLeft('20dH', 9)} ${padLeft('20dL', 9)} ${padLeft('52wH', 9)} ${padLeft('ATR%', 5)}`;
  const lines = [header, '-'.repeat(header.length)];
  for (const r of rows) {
    if (!r) continue;
    lines.push(
      `${padRight(r.symbol, 6)} ` +
      `${fmtNum(r.price, 9, 3)} ` +
      `${fmtNum(r.daily_change_pct, 6, 2)} ` +
      `${fmtNum(r.rsi14, 6, 1)} ` +
      `${fmtNum(r.sma20, 9, 3)} ` +
      `${fmtNum(r.sma50, 9, 3)} ` +
      `${padLeft(r.trend, 7)} ` +
      `${fmtNum(r.volume_ratio, 5, 1)} ` +
      `${fmtNum(r.high_20d, 9, 3)} ` +
      `${fmtNum(r.low_20d, 9, 3)} ` +
      `${fmtNum(r.high_52w, 9, 3)} ` +
      `${fmtNum(r.atr14_pct, 5, 1)}`
    );
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { symbols: [], symbolsFile: null, format: 'json', suffix: '.RO' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--symbols-file') { args.symbolsFile = argv[++i]; }
    else if (a.startsWith('--symbols-file=')) { args.symbolsFile = a.split('=', 2)[1]; }
    else if (a === '--format') { args.format = argv[++i]; }
    else if (a.startsWith('--format=')) { args.format = a.split('=', 2)[1]; }
    else if (a === '--suffix') { args.suffix = argv[++i]; }
    else if (a.startsWith('--suffix=')) { args.suffix = a.split('=', 2)[1]; }
    else if (a === '-h' || a === '--help') { args.help = true; }
    else { args.symbols.push(a); }
  }
  if (!['json', 'table'].includes(args.format)) {
    throw new Error(`--format must be json|table, got ${args.format}`);
  }
  return args;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`error: ${e.message}\n`); return 2; }

  if (args.help) {
    process.stdout.write(
      'Usage: node scripts/indicators.mjs [--format=json|table] [--suffix=.RO] [--symbols-file=FILE] SYM [SYM ...]\n'
    );
    return 0;
  }

  const symbols = [...args.symbols];
  if (args.symbolsFile) {
    const content = fs.readFileSync(args.symbolsFile, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const t = line.trim();
      if (t && !t.startsWith('#')) symbols.push(t);
    }
  }

  if (!symbols.length) {
    process.stderr.write('error: no symbols given (positional args or --symbols-file)\n');
    return 2;
  }

  const rows = [];
  for (const sym of symbols) {
    const yahooSym = sym.includes('.') ? sym : `${sym}${args.suffix}`;
    const r = await compute(yahooSym);
    if (r) r.symbol = sym;  // report the bare ticker for downstream use
    rows.push(r);
  }

  const anyMissing = rows.some((r) => r === null);
  const present = rows.filter((r) => r !== null);

  if (args.format === 'json') {
    process.stdout.write(JSON.stringify(present, null, 2) + '\n');
  } else {
    process.stdout.write(formatTable(present) + '\n');
  }

  const missing = symbols.filter((_, i) => rows[i] === null);
  if (missing.length) {
    process.stderr.write(`\n[warn] no data for: ${missing.join(', ')}\n`);
  }

  return anyMissing ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => { process.stderr.write(`FATAL: ${err.stack || err.message || err}\n`); process.exit(2); }
);
