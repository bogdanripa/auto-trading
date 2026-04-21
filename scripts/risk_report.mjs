#!/usr/bin/env node
/**
 * Risk report for the current portfolio.
 *
 * Reads portfolio/state.json and optionally fetches current prices for a
 * fresher mark-to-market. For every open position computes stop-loss distance,
 * trailing-stop distance, time-in-trade vs intended timeframe, and surfaces
 * invalidation conditions (from the last entry record in journal/trades.jsonl)
 * for the agent to evaluate.
 *
 * Also computes portfolio-level exposure: per-stock weight, per-sector weight,
 * cash ratio, concurrent position count, and overall health banner.
 *
 * Node 18+ stdlib only.
 *
 * Usage:
 *     node scripts/risk_report.mjs
 *     node scripts/risk_report.mjs --format=json
 *     node scripts/risk_report.mjs --refresh-prices
 *
 * Exit codes:
 *     0 — GREEN: all within limits
 *     1 — YELLOW: warnings (approaching limits, stops nearby)
 *     2 — RED: limits breached or stops hit
 */

import fs from 'node:fs';
import path from 'node:path';

const PORTFOLIO_DIR = process.env.PORTFOLIO_DIR || 'portfolio';
const JOURNAL_DIR = process.env.JOURNAL_DIR || 'journal';
const STATE_PATH = path.join(PORTFOLIO_DIR, 'state.json');
const TRADES_PATH = path.join(JOURNAL_DIR, 'trades.jsonl');

// Must match PROJECT.md / sim_executor defaults.
const HARD_STOP_PCT = 0.10;
const TRAILING_STOP_PCT = 0.07;
const TAKE_PROFIT_PCT = 0.15;
const MAX_SINGLE_POSITION_PCT = 0.30;
const MAX_SECTOR_PCT = 0.60;
const MIN_CASH_PCT = 0.10;
const MAX_CONCURRENT_POSITIONS = 5;

// Must mirror scripts/sim_executor.mjs. Keep in sync.
const SECTOR_MAP = {
  'Energy':             new Set(['SNP', 'SNG', 'RRC', 'OIL']),
  'Utilities':          new Set(['H2O', 'SNN', 'TEL', 'EL', 'TGN', 'COTE', 'TRANSI', 'PE']),
  'Banking':            new Set(['TLV', 'BRD']),
  'Real Estate':        new Set(['ONE', 'IMP']),
  'Consumer':           new Set(['SFG', 'AQ', 'WINE', 'CFH']),
  'Healthcare':         new Set(['M', 'BIO', 'ATB']),
  'Industrial':         new Set(['TRP', 'CMP', 'ALR', 'TTS']),
  'Tech/Telecom':       new Set(['DIGI']),
  'Financial Services': new Set(['FP', 'BVB', 'EVER', 'SIF1', 'SIF2', 'SIF3', 'SIF4', 'SIF5']),
};

const INTENDED_DAYS = { swing: 15, event: 56, trend: 90 };

function sectorOf(symbol) {
  for (const [sector, syms] of Object.entries(SECTOR_MAP)) {
    if (syms.has(symbol)) return sector;
  }
  return 'Unclassified';
}

function readJson(filePath, dflt) {
  if (!fs.existsSync(filePath)) return dflt;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const rows = [];
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (t) rows.push(JSON.parse(t));
  }
  return rows;
}

function lastEntryForTrade(trades, tradeId) {
  for (let i = trades.length - 1; i >= 0; i--) {
    const t = trades[i];
    if (t.type === 'entry' && t.trade_id === tradeId) return t;
  }
  return null;
}

async function fetchPrice(symbol) {
  const yahooSym = symbol.includes('.') ? symbol : `${symbol}.RO`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=5d`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const r = data?.chart?.result || [];
    if (!r.length) return null;
    const meta = r[0].meta || {};
    const closes = ((r[0].indicators?.quote || [{}])[0].close || []).filter(c => c != null);
    return meta.regularMarketPrice ?? (closes.length ? closes[closes.length - 1] : null);
  } catch (e) {
    process.stderr.write(`[warn] price fetch failed for ${symbol}: ${e.message}\n`);
    return null;
  }
}

function daysHeld(openedAt) {
  if (!openedAt) return null;
  const dt = new Date(openedAt);
  if (isNaN(dt.getTime())) return null;
  return Math.floor((Date.now() - dt.getTime()) / 86400_000);
}

function round(n, d) {
  if (n == null || Number.isNaN(n)) return null;
  const k = Math.pow(10, d);
  return Math.round(n * k) / k;
}

function analyzePosition(pos, trades) {
  const price = pos.last_price ?? pos.avg_cost;
  const cost = pos.avg_cost;
  const peak = pos.peak_since_entry ?? cost;
  const tradeType = pos.trade_type || 'swing';
  const tradeId = pos.trade_id;

  const pnlPct = cost ? (price / cost - 1) * 100 : 0;

  const hardStopPrice = cost * (1 - HARD_STOP_PCT);
  const distanceToHardStopPct = hardStopPrice ? (price / hardStopPrice - 1) * 100 : null;

  const trailingStopPrice = tradeType === 'trend' ? peak * (1 - TRAILING_STOP_PCT) : null;
  const distanceToTrailingPct = trailingStopPrice ? (price / trailingStopPrice - 1) * 100 : null;

  const takeProfitHit = pnlPct >= TAKE_PROFIT_PCT * 100 && tradeType === 'swing';

  const dh = daysHeld(pos.opened_at);
  const intended = INTENDED_DAYS[tradeType] ?? 15;
  const timeInTradeRatio = (dh != null && intended) ? dh / intended : null;

  const entry = tradeId ? lastEntryForTrade(trades, tradeId) : null;
  const invalidationConditions = entry
    ? (entry.invalidation_conditions || [])
    : (pos.invalidation_conditions || []);

  const effectiveStop = pos.stop_loss ?? hardStopPrice;

  const flags = [];
  if (price <= effectiveStop) {
    flags.push(`HARD_STOP_HIT (price ${price.toFixed(3)} <= stop ${effectiveStop.toFixed(3)})`);
  } else if (price <= effectiveStop * 1.02) {
    flags.push(`HARD_STOP_NEAR (within 2% of ${effectiveStop.toFixed(3)})`);
  }
  if (trailingStopPrice && price <= trailingStopPrice) {
    flags.push(`TRAILING_STOP_HIT (price ${price.toFixed(3)} <= trailing ${trailingStopPrice.toFixed(3)})`);
  }
  if (takeProfitHit) {
    flags.push(`TAKE_PROFIT_CANDIDATE (+${pnlPct.toFixed(1)}% vs +${(TAKE_PROFIT_PCT * 100).toFixed(0)}% target)`);
  }
  if (timeInTradeRatio != null && timeInTradeRatio > 1.0) {
    flags.push(`PAST_EXPECTED_HOLD (${dh}d vs ${intended}d intended for ${tradeType})`);
  }

  return {
    symbol: pos.symbol,
    sector: sectorOf(pos.symbol),
    trade_type: tradeType,
    trade_id: tradeId,
    theme_tag: pos.theme_tag ?? null,
    engine_managed: pos.engine_managed ?? true,
    price,
    avg_cost: cost,
    peak_since_entry: peak,
    pnl_pct: round(pnlPct, 2),
    quantity: pos.quantity,
    position_value_ron: round(pos.quantity * price, 2),
    effective_stop_price: effectiveStop ? round(effectiveStop, 3) : null,
    distance_to_hard_stop_pct: distanceToHardStopPct != null ? round(distanceToHardStopPct, 2) : null,
    trailing_stop_price: trailingStopPrice ? round(trailingStopPrice, 3) : null,
    distance_to_trailing_pct: distanceToTrailingPct != null ? round(distanceToTrailingPct, 2) : null,
    days_held: dh,
    intended_days: intended,
    time_in_trade_ratio: timeInTradeRatio != null ? round(timeInTradeRatio, 2) : null,
    invalidation_conditions: invalidationConditions,
    flags,
  };
}

function analyzePortfolio(state, positionRows) {
  const totalValue = state.cash_ron + positionRows.reduce((s, r) => s + r.position_value_ron, 0);
  const cashPct = totalValue ? (state.cash_ron / totalValue) * 100 : 100;

  const perSymbol = {};
  const perSector = {};
  if (totalValue) {
    for (const r of positionRows) {
      perSymbol[r.symbol] = r.position_value_ron / totalValue;
      perSector[r.sector] = (perSector[r.sector] || 0) + r.position_value_ron;
    }
  }
  const perSectorPct = {};
  for (const [k, v] of Object.entries(perSector)) {
    perSectorPct[k] = totalValue ? (v / totalValue) * 100 : 0;
  }

  const flags = [];
  for (const [sym, w] of Object.entries(perSymbol)) {
    if (w > MAX_SINGLE_POSITION_PCT) {
      flags.push(`SINGLE_STOCK_CAP_BREACH (${sym} at ${(w * 100).toFixed(1)}% > 30%)`);
    } else if (w > MAX_SINGLE_POSITION_PCT * 0.9) {
      flags.push(`SINGLE_STOCK_APPROACHING_CAP (${sym} at ${(w * 100).toFixed(1)}%)`);
    }
  }
  for (const [sect, pct] of Object.entries(perSectorPct)) {
    if (pct > MAX_SECTOR_PCT * 100) {
      flags.push(`SECTOR_CAP_BREACH (${sect} at ${pct.toFixed(1)}% > 60%)`);
    } else if (pct > MAX_SECTOR_PCT * 100 * 0.9) {
      flags.push(`SECTOR_APPROACHING_CAP (${sect} at ${pct.toFixed(1)}%)`);
    }
  }
  if (cashPct < MIN_CASH_PCT * 100) {
    flags.push(`CASH_RESERVE_BREACH (${cashPct.toFixed(1)}% < 10%)`);
  } else if (cashPct < MIN_CASH_PCT * 100 * 1.2) {
    flags.push(`CASH_RESERVE_LOW (${cashPct.toFixed(1)}%)`);
  }
  if (positionRows.length > MAX_CONCURRENT_POSITIONS) {
    flags.push(`TOO_MANY_POSITIONS (${positionRows.length} > ${MAX_CONCURRENT_POSITIONS})`);
  }

  let topPosition = null;
  let topPositionPct = 0;
  for (const [sym, w] of Object.entries(perSymbol)) {
    if (w * 100 > topPositionPct) {
      topPosition = sym;
      topPositionPct = w * 100;
    }
  }

  const sectorRounded = {};
  for (const [k, v] of Object.entries(perSectorPct)) sectorRounded[k] = round(v, 2);

  return {
    total_value_ron: round(totalValue, 2),
    cash_ron: round(state.cash_ron, 2),
    cash_pct: round(cashPct, 2),
    n_positions: positionRows.length,
    per_sector_pct: sectorRounded,
    top_position: topPosition,
    top_position_pct: round(topPositionPct, 2),
    flags,
  };
}

function classifyHealth(positionReports, portfolioReport) {
  for (const r of positionReports) {
    for (const f of r.flags) {
      if (f.startsWith('HARD_STOP_HIT') || f.startsWith('TRAILING_STOP_HIT')) return 'RED';
    }
  }
  for (const f of portfolioReport.flags) if (f.includes('BREACH')) return 'RED';
  if (positionReports.some(r => r.flags.length)) return 'YELLOW';
  if (portfolioReport.flags.length) return 'YELLOW';
  return 'GREEN';
}

function padLeft(s, w) { s = String(s); return s.length >= w ? s : ' '.repeat(w - s.length) + s; }
function padRight(s, w) { s = String(s); return s.length >= w ? s : s + ' '.repeat(w - s.length); }

function formatText(positionReports, portfolioReport, health) {
  const lines = [];
  const banner = { GREEN: '🟢 GREEN', YELLOW: '🟡 YELLOW', RED: '🔴 RED' }[health];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`🛡️  RISK REPORT — ${today}   [${banner}]`);
  lines.push('='.repeat(72));
  lines.push(
    `Cash: ${portfolioReport.cash_ron.toFixed(2)} RON (${portfolioReport.cash_pct.toFixed(1)}%)  ` +
    `Total: ${portfolioReport.total_value_ron.toFixed(2)} RON  ` +
    `Positions: ${portfolioReport.n_positions}`
  );
  if (Object.keys(portfolioReport.per_sector_pct).length) {
    const sorted = Object.entries(portfolioReport.per_sector_pct).sort((a, b) => b[1] - a[1]);
    lines.push(`Sectors: ${sorted.map(([k, v]) => `${k} ${v.toFixed(1)}%`).join(', ')}`);
  }

  lines.push('');
  lines.push('POSITIONS');
  lines.push(
    `${padRight('SYM', 6)} ${padLeft('QTY', 4)} ${padLeft('COST', 8)} ${padLeft('NOW', 8)} ` +
    `${padLeft('P&L%', 6)} ${padLeft('WGT%', 6)} ${padLeft('STOP', 8)} ${padLeft('∆STOP%', 7)} ${padLeft('HELD', 5)}  FLAGS`
  );
  for (const r of positionReports) {
    const wgt = portfolioReport.total_value_ron
      ? (r.position_value_ron / portfolioReport.total_value_ron) * 100
      : 0;
    const flagsStr = r.flags.length ? r.flags.join(' | ') : '-';
    lines.push(
      `${padRight(r.symbol, 6)} ${padLeft(r.quantity, 4)} ` +
      `${padLeft(r.avg_cost.toFixed(3), 8)} ${padLeft(r.price.toFixed(3), 8)} ` +
      `${padLeft(r.pnl_pct.toFixed(2), 6)} ${padLeft(wgt.toFixed(1), 6)} ` +
      `${padLeft((r.effective_stop_price ?? 0).toFixed(3), 8)} ` +
      `${padLeft((r.distance_to_hard_stop_pct ?? 0).toFixed(2), 7)} ` +
      `${padLeft(r.days_held ?? '-', 5)}  ${flagsStr}`
    );
  }

  if (positionReports.some(r => r.invalidation_conditions.length)) {
    lines.push('');
    lines.push('INVALIDATION CONDITIONS (agent must evaluate each against current state)');
    for (const r of positionReports) {
      if (!r.invalidation_conditions.length) continue;
      lines.push(`  ${r.symbol} [${r.trade_id}]:`);
      r.invalidation_conditions.forEach((c, i) => lines.push(`    ${i + 1}. ${c}`));
    }
  }

  if (portfolioReport.flags.length) {
    lines.push('');
    lines.push('PORTFOLIO-LEVEL FLAGS');
    for (const f of portfolioReport.flags) lines.push(`  • ${f}`);
  }

  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { format: 'text', refreshPrices: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--format') args.format = argv[++i];
    else if (a.startsWith('--format=')) args.format = a.split('=', 2)[1];
    else if (a === '--refresh-prices') args.refreshPrices = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!['text', 'json'].includes(args.format)) {
    throw new Error(`--format must be text|json, got ${args.format}`);
  }
  return args;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`error: ${e.message}\n`); return 2; }

  if (args.help) {
    process.stdout.write('Usage: node scripts/risk_report.mjs [--format=text|json] [--refresh-prices]\n');
    return 0;
  }

  const state = readJson(STATE_PATH, null);
  if (state === null) {
    process.stderr.write(`error: ${STATE_PATH} not found\n`);
    return 2;
  }
  const trades = readJsonl(TRADES_PATH);

  if (args.refreshPrices) {
    for (const pos of state.positions) {
      const p = await fetchPrice(pos.symbol);
      if (p) pos.last_price = p;
    }
  }

  const positionReports = state.positions.map(p => analyzePosition(p, trades));
  const portfolioReport = analyzePortfolio(state, positionReports);
  const health = classifyHealth(positionReports, portfolioReport);

  if (args.format === 'json') {
    const out = {
      generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      health,
      portfolio: portfolioReport,
      positions: positionReports,
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } else {
    process.stdout.write(formatText(positionReports, portfolioReport, health) + '\n');
  }

  return { GREEN: 0, YELLOW: 1, RED: 2 }[health];
}

main().then(
  (code) => process.exit(code),
  (err) => { process.stderr.write(`FATAL: ${err.stack || err.message || err}\n`); process.exit(2); }
);
