#!/usr/bin/env node
/**
 * Deterministic statistics over journal/trades.jsonl for the retrospective skill.
 *
 * Pairs entry/exit records by trade_id and computes per-group win rates, avg
 * P&L, and expectancy. Groups by trade_type, theme_tag, sector, exit_reason,
 * conviction bucket, and the (catalyst_occurred × mechanism_worked) failure-
 * mode grid.
 *
 * Node 18+ stdlib only.
 *
 * Usage:
 *     node scripts/journal_stats.mjs                  # all-time
 *     node scripts/journal_stats.mjs --window 7d      # last 7 days
 *     node scripts/journal_stats.mjs --window 30d     # last 30
 *     node scripts/journal_stats.mjs --since 2026-01-01
 *     node scripts/journal_stats.mjs --format=json
 *
 * Exit codes:
 *     0 — stats produced
 *     1 — no closed trades in the window
 *     2 — fatal (file missing, bad arg)
 */

import { openStore } from './store.mjs';

const CONVICTION_BUCKETS = [
  [0, 4, 'low'],
  [5, 7, 'mid'],
  [8, 10, 'high'],
];

function parseWindow(windowStr, since) {
  if (since) {
    const d = new Date(since);
    if (isNaN(d.getTime())) throw new Error(`bad --since: ${since}`);
    return d;
  }
  if (!windowStr) return null;
  const m = /^(\d+)([dw])$/.exec(windowStr);
  if (!m) throw new Error(`unrecognized --window format: ${windowStr}`);
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const ms = unit === 'd' ? n * 86400_000 : n * 7 * 86400_000;
  return new Date(Date.now() - ms);
}

function pairTrades(records) {
  const entries = new Map();
  const pairs = [];
  for (const r of records) {
    const tid = r.trade_id;
    if (!tid) continue;
    if (r.type === 'entry') entries.set(tid, r);
    else if (r.type === 'exit') {
      const entry = entries.get(tid);
      if (!entry) continue;
      pairs.push({ entry, exit: r, trade_id: tid });
    }
  }
  return pairs;
}

function convictionBucket(c) {
  if (c == null) return 'unknown';
  for (const [lo, hi, label] of CONVICTION_BUCKETS) {
    if (c >= lo && c <= hi) return label;
  }
  return 'unknown';
}

function round(n, d) {
  const k = Math.pow(10, d);
  return Math.round(n * k) / k;
}

function computeClusterStats(pairs) {
  if (!pairs.length) return { count: 0 };
  const pnls = pairs.map(p => p.exit.pnl_pct ?? 0);
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p <= 0);
  const n = pairs.length;
  const winRate = n ? wins.length / n : 0;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;
  const daysHeld = pairs
    .map(p => p.exit.days_held)
    .filter(d => d != null);
  const sortedPnls = [...pnls].sort((a, b) => a - b);
  return {
    count: n,
    win_rate_pct: round(winRate * 100, 1),
    avg_pnl_pct: round(pnls.reduce((a, b) => a + b, 0) / n, 2),
    median_pnl_pct: round(sortedPnls[Math.floor(n / 2)], 2),
    avg_win_pct: round(avgWin, 2),
    avg_loss_pct: round(avgLoss, 2),
    expectancy_pct: round(expectancy, 2),
    avg_days_held: daysHeld.length
      ? round(daysHeld.reduce((a, b) => a + b, 0) / daysHeld.length, 1)
      : null,
    trade_ids: pairs.slice(0, 10).map(p => p.trade_id),
  };
}

function groupBy(pairs, keyFn) {
  const groups = new Map();
  for (const p of pairs) {
    const k = keyFn(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  return groups;
}

function mapGroups(pairs, keyFn) {
  const out = {};
  for (const [k, v] of groupBy(pairs, keyFn).entries()) {
    out[k] = computeClusterStats(v);
  }
  return out;
}

/**
 * Slippage stats over fills.jsonl. Each fill carries `slippage_bps` (sim_executor
 * records it as (fill - limit)/limit for buys, (limit - fill)/limit for sells —
 * positive bps means we paid *up* vs our limit).
 */
function computeSlippageStats(fills, windowStart) {
  const rows = fills.filter(f => {
    if (f.slippage_bps == null) return false;
    if (!windowStart) return true;
    const t = new Date(f.filled_at || 0);
    return !isNaN(t.getTime()) && t >= windowStart;
  });
  if (!rows.length) return { count: 0 };
  const byAction = { BUY: [], SELL: [] };
  for (const f of rows) (byAction[f.action] ||= []).push(f.slippage_bps);
  const summarize = (arr) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      count: arr.length,
      avg_bps: round(arr.reduce((a, b) => a + b, 0) / arr.length, 2),
      median_bps: round(sorted[Math.floor(sorted.length / 2)], 2),
      worst_bps: round(Math.max(...arr), 2),
    };
  };
  return {
    count: rows.length,
    overall: summarize(rows.map(f => f.slippage_bps)),
    buys: summarize(byAction.BUY || []),
    sells: summarize(byAction.SELL || []),
  };
}

function parseArgs(argv) {
  const args = { window: null, since: null, format: 'text' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = (p) => a.startsWith(p + '=') ? a.slice(p.length + 1) : null;
    if (a === '--window') args.window = argv[++i];
    else if (eq('--window')) args.window = eq('--window');
    else if (a === '--since') args.since = argv[++i];
    else if (eq('--since')) args.since = eq('--since');
    else if (a === '--format') args.format = argv[++i];
    else if (eq('--format')) args.format = eq('--format');
    else if (a === '-h' || a === '--help') args.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!['text', 'json'].includes(args.format)) {
    throw new Error(`--format must be text|json, got ${args.format}`);
  }
  return args;
}

function padLeft(s, w) { s = String(s); return s.length >= w ? s : ' '.repeat(w - s.length) + s; }
function padRight(s, w) { s = String(s); return s.length >= w ? s : s + ' '.repeat(w - s.length); }

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`error: ${e.message}\n`); return 2; }

  if (args.help) {
    process.stdout.write('Usage: node scripts/journal_stats.mjs [--window Nd|Nw] [--since YYYY-MM-DD] [--format=text|json]\n');
    return 0;
  }

  const store = await openStore();
  const [records, fills] = await Promise.all([store.listJournal(), store.listFills()]);
  if (!records.length) {
    process.stderr.write('no journal entries\n');
    return 2;
  }

  let windowStart;
  try { windowStart = parseWindow(args.window, args.since); }
  catch (e) { process.stderr.write(`error: ${e.message}\n`); return 2; }

  let pairs = pairTrades(records);

  if (windowStart) {
    pairs = pairs.filter(p => {
      const ts = p.exit.timestamp || '';
      const t = new Date(ts);
      if (isNaN(t.getTime())) return false;
      return t >= windowStart;
    });
  }

  if (!pairs.length) {
    process.stderr.write('no closed trades in window\n');
    return 1;
  }

  const overall = computeClusterStats(pairs);

  const groups = {
    by_trade_type: mapGroups(pairs, p => p.entry.trade_type || 'unknown'),
    by_theme_tag: mapGroups(pairs, p => p.entry.theme_tag || 'untagged'),
    by_sector: mapGroups(pairs, p => p.entry.sector || p.exit.sector || 'unknown'),
    by_exit_reason: mapGroups(pairs, p => p.exit.exit_reason || 'unknown'),
    by_conviction: mapGroups(pairs, p => convictionBucket(p.entry.conviction)),
    by_failure_mode: mapGroups(pairs, p =>
      `${p.exit.catalyst_occurred ?? 'unknown'}|${p.exit.mechanism_worked ?? 'unknown'}`
    ),
  };

  const slippage = computeSlippageStats(fills, windowStart);

  const payload = {
    generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    window: args.window || args.since || 'all-time',
    n_closed: pairs.length,
    overall,
    groups,
    slippage,
  };

  if (args.format === 'json') {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return 0;
  }

  const lines = [];
  lines.push(`📊 JOURNAL STATS — window: ${payload.window}   closed trades: ${payload.n_closed}`);
  lines.push('='.repeat(72));
  lines.push(
    `Overall: win ${overall.win_rate_pct}%  avg ${overall.avg_pnl_pct}%  ` +
    `expectancy ${overall.expectancy_pct}%  avg days held ${overall.avg_days_held}`
  );
  for (const [groupName, rows] of Object.entries(groups)) {
    lines.push('');
    lines.push(`-- ${groupName} --`);
    const sorted = Object.entries(rows).sort((a, b) => b[1].count - a[1].count);
    for (const [key, r] of sorted) {
      lines.push(
        `  ${padRight(String(key), 40)} n=${padLeft(r.count, 3)}  ` +
        `win ${padLeft(r.win_rate_pct, 5)}%  ` +
        `avg ${padLeft(r.avg_pnl_pct.toFixed(2), 6)}%  ` +
        `exp ${padLeft(r.expectancy_pct.toFixed(2), 6)}%`
      );
    }
  }
  if (slippage.count) {
    lines.push('');
    lines.push('-- slippage (bps vs. limit; + = paid up) --');
    const fmt = (s) => s ? `n=${padLeft(s.count, 3)} avg ${padLeft(s.avg_bps, 7)}  med ${padLeft(s.median_bps, 7)}  worst ${padLeft(s.worst_bps, 7)}` : '(none)';
    lines.push(`  overall  ${fmt(slippage.overall)}`);
    lines.push(`  buys     ${fmt(slippage.buys)}`);
    lines.push(`  sells    ${fmt(slippage.sells)}`);
  }
  process.stdout.write(lines.join('\n') + '\n');
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => { process.stderr.write(`FATAL: ${err.stack || err.message || err}\n`); process.exit(2); }
);
