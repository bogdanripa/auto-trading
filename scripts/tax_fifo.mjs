#!/usr/bin/env node
/**
 * FIFO cost basis + realized gain/loss for Declarația Unică.
 *
 * Reads portfolio/fills.jsonl (the authoritative trade record) and produces:
 *   - per-sell realized gain/loss in RON (FIFO matching)
 *   - annual summary grouped by symbol and year
 *   - total net gain/loss and estimated 10% tax
 *
 * Node 18+ stdlib only.
 *
 * Usage:
 *     node scripts/tax_fifo.mjs                  # all time, summary to stdout
 *     node scripts/tax_fifo.mjs --year 2026      # single year
 *     node scripts/tax_fifo.mjs --detail         # print every sell's match
 *     node scripts/tax_fifo.mjs --format=json    # machine-readable
 *
 * Romanian tax rules applied:
 *   - 10% capital gains tax on net realized gains
 *   - Losses within the same year offset gains
 *   - Losses that exceed gains in a year carry forward up to 70% of next year
 *     (NOT implemented here — flagged for user to handle manually per year)
 */

import { openStore } from './store.mjs';

const TAX_RATE_CAPITAL_GAINS = 0.10;

/**
 * Process fills chronologically, FIFO-match sells to buys.
 * @returns {{ realized: object[], openLots: Record<string, object[]> }}
 */
function computeFifo(fills) {
  const sorted = [...fills].sort((a, b) => (a.filled_at || '').localeCompare(b.filled_at || ''));
  const openLots = new Map();   // symbol -> array of {fill_id, date, quantity, unit_cost, trade_id}
  const realized = [];

  for (const f of sorted) {
    const sym = f.symbol;
    const action = f.action;
    const qty = parseInt(f.quantity, 10);
    const price = parseFloat(f.fill_price);
    const commission = parseFloat(f.commission_ron || 0);
    const fillId = f.fill_id || f.order_id || `${f.filled_at || '?'}-${sym}-${action}`;
    const filledAt = f.filled_at || '';

    if (action === 'BUY') {
      const unitCost = (qty * price + commission) / qty;
      if (!openLots.has(sym)) openLots.set(sym, []);
      openLots.get(sym).push({
        fill_id: fillId,
        date: filledAt.slice(0, 10),
        quantity: qty,
        unit_cost: unitCost,
        trade_id: f.trade_id || null,
      });
    } else if (action === 'SELL') {
      let remaining = qty;
      const commPerShare = qty ? commission / qty : 0;
      const lots = openLots.get(sym) || [];
      while (remaining > 0 && lots.length) {
        const lot = lots[0];
        const take = Math.min(remaining, lot.quantity);
        const gain = take * (price - lot.unit_cost - commPerShare);
        realized.push({
          sell_fill_id: fillId,
          sell_date: filledAt.slice(0, 10),
          buy_fill_id: lot.fill_id,
          buy_date: lot.date,
          symbol: sym,
          quantity: take,
          buy_unit_cost: lot.unit_cost,
          sell_unit_price: price,
          sell_commission_share: commPerShare * take,
          gain_ron: Math.round(gain * 100) / 100,
        });
        lot.quantity -= take;
        remaining -= take;
        if (lot.quantity === 0) lots.shift();
      }
      if (remaining > 0) {
        process.stderr.write(
          `[warn] sell for ${sym} on ${filledAt} exceeds open lots by ${remaining}; short-sale or reconciliation bug\n`
        );
      }
    }
  }

  const openOut = {};
  for (const [sym, lots] of openLots.entries()) {
    if (lots.length) openOut[sym] = lots;
  }
  return { realized, openLots: openOut };
}

function round2(n) { return Math.round(n * 100) / 100; }

function summarizeYear(matches, year) {
  const yearStr = String(year);
  const yearMatches = matches.filter(m => m.sell_date.startsWith(yearStr));

  const bySymbol = {};
  for (const m of yearMatches) {
    if (!bySymbol[m.symbol]) bySymbol[m.symbol] = { gains: 0, losses: 0, n_trades: 0 };
    const b = bySymbol[m.symbol];
    if (m.gain_ron >= 0) b.gains += m.gain_ron;
    else b.losses += -m.gain_ron;
    b.n_trades += 1;
  }

  const totalGains = Object.values(bySymbol).reduce((s, b) => s + b.gains, 0);
  const totalLosses = Object.values(bySymbol).reduce((s, b) => s + b.losses, 0);
  const net = totalGains - totalLosses;

  const bySymbolOut = {};
  for (const s of Object.keys(bySymbol).sort()) {
    const v = bySymbol[s];
    bySymbolOut[s] = {
      gains_ron: round2(v.gains),
      losses_ron: round2(v.losses),
      net_ron: round2(v.gains - v.losses),
      n_matched_sells: v.n_trades,
    };
  }

  return {
    year,
    by_symbol: bySymbolOut,
    totals: {
      total_gains_ron: round2(totalGains),
      total_losses_ron: round2(totalLosses),
      net_ron: round2(net),
      estimated_tax_ron: round2(Math.max(net, 0) * TAX_RATE_CAPITAL_GAINS),
      loss_carryforward_if_negative: net < 0 ? round2(-net * 0.70) : 0.0,
    },
  };
}

function padLeft(s, w) { s = String(s); return s.length >= w ? s : ' '.repeat(w - s.length) + s; }
function padRight(s, w) { s = String(s); return s.length >= w ? s : s + ' '.repeat(w - s.length); }
function fnum(n, w, d = 2) { return padLeft(Number(n).toFixed(d), w); }

function formatText(summary, detail, matches) {
  const lines = [];
  const year = summary.year;
  lines.push(`DECLARAȚIA UNICĂ — Realized capital gains/losses (${year})`);
  lines.push('='.repeat(60));
  lines.push(
    `${padRight('SYMBOL', 8)} ${padLeft('GAINS', 12)} ${padLeft('LOSSES', 12)} ${padLeft('NET', 12)} ${padLeft('#SELLS', 7)}`
  );
  for (const [sym, row] of Object.entries(summary.by_symbol)) {
    lines.push(
      `${padRight(sym, 8)} ${fnum(row.gains_ron, 12)} ${fnum(row.losses_ron, 12)} ${fnum(row.net_ron, 12)} ${padLeft(row.n_matched_sells, 7)}`
    );
  }
  lines.push('-'.repeat(60));
  const t = summary.totals;
  lines.push(
    `${padRight('TOTAL', 8)} ${fnum(t.total_gains_ron, 12)} ${fnum(t.total_losses_ron, 12)} ${fnum(t.net_ron, 12)}`
  );
  lines.push('');
  lines.push(`Net realized: ${t.net_ron.toFixed(2)} RON`);
  if (t.net_ron > 0) {
    lines.push(`Estimated tax (10%): ${t.estimated_tax_ron.toFixed(2)} RON`);
  } else {
    lines.push(
      `Loss year — up to ${t.loss_carryforward_if_negative.toFixed(2)} RON ` +
      `carries forward (70% cap) to offset next year's gains.`
    );
  }

  if (detail) {
    lines.push('');
    lines.push('DETAIL — FIFO matches (sell → matched buy):');
    lines.push(
      `${padRight('SELL_DATE', 12)} ${padRight('SYM', 6)} ${padLeft('QTY', 4)} ${padLeft('BUY@', 8)} ${padLeft('SELL@', 8)} ${padLeft('GAIN', 10)} ${padRight('BUY_DATE', 12)}`
    );
    const yearMatches = matches.filter(m => m.sell_date.startsWith(String(year)));
    yearMatches.sort((a, b) =>
      a.sell_date.localeCompare(b.sell_date) || a.symbol.localeCompare(b.symbol)
    );
    for (const m of yearMatches) {
      lines.push(
        `${padRight(m.sell_date, 12)} ${padRight(m.symbol, 6)} ${padLeft(m.quantity, 4)} ` +
        `${fnum(m.buy_unit_cost, 8, 3)} ${fnum(m.sell_unit_price, 8, 3)} ` +
        `${fnum(m.gain_ron, 10)} ${padRight(m.buy_date, 12)}`
      );
    }
  }

  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { year: null, detail: false, format: 'text' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--year') args.year = parseInt(argv[++i], 10);
    else if (a.startsWith('--year=')) args.year = parseInt(a.split('=', 2)[1], 10);
    else if (a === '--detail') args.detail = true;
    else if (a === '--format') args.format = argv[++i];
    else if (a.startsWith('--format=')) args.format = a.split('=', 2)[1];
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
    process.stdout.write(
      'Usage: node scripts/tax_fifo.mjs [--year N] [--detail] [--format=text|json]\n'
    );
    return 0;
  }

  const store = await openStore();
  const fills = await store.listFills();
  if (!fills.length) {
    process.stderr.write('no fills recorded yet\n');
    if (args.format === 'json') {
      process.stdout.write(JSON.stringify({ year: args.year, by_symbol: {}, totals: {} }, null, 2) + '\n');
    }
    return 0;
  }

  const { realized, openLots } = computeFifo(fills);

  if (args.year === null) {
    const years = new Set(realized.filter(m => m.sell_date).map(m => m.sell_date.slice(0, 4)));
    args.year = years.size ? parseInt([...years].sort().pop(), 10) : 2026;
  }

  const summary = summarizeYear(realized, args.year);
  summary.open_lots_remaining = {};
  for (const [sym, lots] of Object.entries(openLots)) {
    summary.open_lots_remaining[sym] = lots.map(l => ({
      date: l.date,
      qty: l.quantity,
      unit_cost: Math.round(l.unit_cost * 10000) / 10000,
    }));
  }

  if (args.format === 'json') {
    const payload = { summary };
    if (args.detail) {
      payload.matches = realized.filter(m => m.sell_date.startsWith(String(args.year)));
    }
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else {
    process.stdout.write(formatText(summary, args.detail, realized) + '\n');
  }

  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => { process.stderr.write(`FATAL: ${err.stack || err.message || err}\n`); process.exit(2); }
);
