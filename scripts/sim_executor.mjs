#!/usr/bin/env node
/**
 * Simulated BVB execution engine — Node port of sim_executor.py.
 *
 * Owns three files under portfolio/:
 *     state.json      — current cash, positions, totals
 *     orders.jsonl    — open orders awaiting fill
 *     fills.jsonl     — historical fills, append-only
 *
 * Commands: place, settle, status.
 *
 * All writes are atomic (write to tmp, then rename) and idempotent where possible.
 *
 * Node 18+ stdlib only. No runtime deps.
 *
 * Test-friendly structure: exports a mutable `config` (paths, env) and `deps`
 * (fetchTodayBar) so tests can redirect paths to a tempdir and stub out the
 * Yahoo call without monkey-patching module-level bindings (which ESM makes
 * immutable).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import url from 'node:url';

// ---- constants ------------------------------------------------------------

export const COMMISSION_BPS = 10;          // 0.10% of trade value
export const COMMISSION_MIN_RON = 1.0;
export const CASH_RESERVE_PCT = 0.10;      // min 10% cash reserve
export const MAX_SINGLE_POSITION_PCT = 0.30;
export const MAX_SECTOR_PCT = 0.60;        // max 60% in a single sector
export const MAX_DAILY_DEPLOY_PCT = 0.50;
export const MAX_CONCURRENT_POSITIONS = 5;
export const FAT_FINGER_BAND = 0.10;       // limit must be within ±10% of current
export const STATE_FRESHNESS_HOURS = 36;

// Sector map — mirrors risk-monitor/SKILL.md and scripts/risk_report.mjs.
export const SECTOR_MAP = {
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

export function sectorOf(symbol) {
  for (const [sector, syms] of Object.entries(SECTOR_MAP)) {
    if (syms.has(symbol)) return sector;
  }
  return 'Unclassified';
}

// ---- mutable config (tests override) --------------------------------------

const DEFAULT_PORTFOLIO_DIR = process.env.PORTFOLIO_DIR || 'portfolio';

export const config = {
  portfolioDir: DEFAULT_PORTFOLIO_DIR,
  statePath: path.join(DEFAULT_PORTFOLIO_DIR, 'state.json'),
  ordersPath: path.join(DEFAULT_PORTFOLIO_DIR, 'orders.jsonl'),
  fillsPath: path.join(DEFAULT_PORTFOLIO_DIR, 'fills.jsonl'),
};

/** Re-point all three file paths to a new portfolio dir (tests use this). */
export function setPortfolioDir(dir) {
  config.portfolioDir = dir;
  config.statePath = path.join(dir, 'state.json');
  config.ordersPath = path.join(dir, 'orders.jsonl');
  config.fillsPath = path.join(dir, 'fills.jsonl');
}

// ---- file helpers ---------------------------------------------------------

export function readJson(filePath, dflt) {
  if (!fs.existsSync(filePath)) return dflt;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJsonAtomic(filePath, obj) {
  const dir = path.dirname(filePath) || '.';
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp_${crypto.randomBytes(8).toString('hex')}`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

export function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const rows = [];
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (t) rows.push(JSON.parse(t));
  }
  return rows;
}

export function writeJsonlAtomic(filePath, rows) {
  const dir = path.dirname(filePath) || '.';
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp_${crypto.randomBytes(8).toString('hex')}`);
  try {
    fs.writeFileSync(tmp, rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

export function appendJsonl(filePath, row) {
  fs.mkdirSync(path.dirname(filePath) || '.', { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(row) + '\n');
}

// ---- market data ----------------------------------------------------------

async function defaultFetchTodayBar(symbol) {
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
    const q = (r[0].indicators?.quote || [{}])[0];
    const timestamps = r[0].timestamp || [];
    const opens = q.open || [];
    const highs = q.high || [];
    const lows = q.low || [];
    const closes = q.close || [];
    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] != null) {
        const ts = timestamps[i];
        const barDate = ts
          ? new Date(ts * 1000).toISOString().slice(0, 10)
          : null;
        return {
          price: meta.regularMarketPrice ?? closes[i],
          open: opens[i] ?? null,
          high: highs[i] ?? null,
          low: lows[i] ?? null,
          close: closes[i],
          bar_date: barDate,
        };
      }
    }
    return null;
  } catch (e) {
    process.stderr.write(`[warn] price fetch failed for ${symbol}: ${e.message}\n`);
    return null;
  }
}

/** Dependency-injection slot for tests. `deps.fetchTodayBar` is called by settle/place. */
export const deps = {
  fetchTodayBar: defaultFetchTodayBar,
};

// ---- core logic -----------------------------------------------------------

export function commission(notional) {
  return Math.max((notional * COMMISSION_BPS) / 10_000, COMMISSION_MIN_RON);
}

export function totalValue(state) {
  return state.cash_ron + state.positions.reduce(
    (s, p) => s + p.quantity * (p.last_price ?? p.avg_cost), 0
  );
}

export function findPosition(state, symbol) {
  return state.positions.find(p => p.symbol === symbol) || null;
}

function cashReserved(orders) {
  return orders.filter(o => o.action === 'BUY')
    .reduce((s, o) => s + (o.cash_reserved_ron || 0), 0);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowIsoSec() {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

export function validateBuy(state, orders, symbol, qty, limit, currentPrice) {
  if (qty <= 0) return `quantity must be > 0, got ${qty}`;
  if (limit <= 0) return `limit must be > 0, got ${limit}`;
  if (currentPrice) {
    const band = FAT_FINGER_BAND * currentPrice;
    if (limit < currentPrice - band || limit > currentPrice + band) {
      return `limit ${limit} outside ±${(FAT_FINGER_BAND * 100).toFixed(0)}% of current ${currentPrice.toFixed(3)}`;
    }
  }

  const notional = qty * limit;
  const comm = commission(notional);
  const total = notional + comm;

  const availableCash = state.cash_ron - cashReserved(orders);
  const tv = totalValue(state);
  const minCashAfter = tv * CASH_RESERVE_PCT;

  if (availableCash - total < minCashAfter) {
    return `would breach 10% cash reserve: avail=${availableCash.toFixed(2)} ` +
           `need=${total.toFixed(2)} min_after=${minCashAfter.toFixed(2)}`;
  }

  const existing = findPosition(state, symbol);
  const existingValue = existing
    ? existing.quantity * (existing.last_price ?? existing.avg_cost)
    : 0;
  const addValue = qty * (currentPrice || limit);
  const proposedValue = existingValue + addValue;
  if (proposedValue > tv * MAX_SINGLE_POSITION_PCT) {
    return `would breach 30% single-stock cap: proposed_value=${proposedValue.toFixed(2)} ` +
           `limit=${(tv * MAX_SINGLE_POSITION_PCT).toFixed(2)}`;
  }

  const sector = sectorOf(symbol);
  const currentSectorValue = state.positions
    .filter(p => sectorOf(p.symbol) === sector)
    .reduce((s, p) => s + p.quantity * (p.last_price ?? p.avg_cost), 0);
  const proposedSectorValue = currentSectorValue + addValue - existingValue;
  if (proposedSectorValue > tv * MAX_SECTOR_PCT) {
    return `would breach 60% sector cap (sector=${sector}): ` +
           `proposed=${proposedSectorValue.toFixed(2)} limit=${(tv * MAX_SECTOR_PCT).toFixed(2)}`;
  }

  const today = todayIso();
  const todayDeploy = orders
    .filter(o => o.action === 'BUY' && (o.placed_at || '').startsWith(today))
    .reduce((s, o) => s + (o.cash_reserved_ron || 0), 0);
  if (todayDeploy + total > tv * MAX_DAILY_DEPLOY_PCT) {
    return `would breach 50% daily deployment cap: today=${todayDeploy.toFixed(2)} ` +
           `adding=${total.toFixed(2)} cap=${(tv * MAX_DAILY_DEPLOY_PCT).toFixed(2)}`;
  }

  if (existing === null && state.positions.length >= MAX_CONCURRENT_POSITIONS) {
    return `already at max ${MAX_CONCURRENT_POSITIONS} concurrent positions`;
  }

  return null;
}

export function guardState(state, { requireFresh = true } = {}) {
  const expectedMode = process.env.EXECUTION_MODE || 'simulation';
  if (state.mode !== expectedMode) {
    return `state.mode=${JSON.stringify(state.mode)} does not match ` +
           `EXECUTION_MODE=${JSON.stringify(expectedMode)} — refusing to operate`;
  }
  if (requireFresh && state.as_of) {
    const t = new Date(state.as_of);
    if (isNaN(t.getTime())) return `state.as_of is not a valid ISO timestamp: ${JSON.stringify(state.as_of)}`;
    const ageH = (Date.now() - t.getTime()) / 3_600_000;
    if (ageH > STATE_FRESHNESS_HOURS) {
      return `state.json is ${ageH.toFixed(1)}h old (> ${STATE_FRESHNESS_HOURS}h) — refusing to operate on stale state`;
    }
  }
  return null;
}

export function validateSell(state, symbol, qty) {
  const p = findPosition(state, symbol);
  if (p === null) return `no long position in ${symbol} to sell`;
  if (qty > p.quantity) return `sell qty ${qty} exceeds held ${p.quantity}`;
  return null;
}

// ---- commands -------------------------------------------------------------

export async function cmdPlace(args) {
  const state = readJson(config.statePath, null);
  if (state === null) {
    process.stderr.write(`error: ${config.statePath} not found\n`);
    return 2;
  }
  // `place` allows stale state (we may be placing orders before morning MTM)
  const gerr = guardState(state, { requireFresh: false });
  if (gerr) { process.stderr.write(`error: ${gerr}\n`); return 2; }

  const orders = readJsonl(config.ordersPath);

  const bar = await deps.fetchTodayBar(args.symbol);
  const currentPrice = bar ? bar.price : null;

  const action = String(args.action).toUpperCase();
  let err;
  if (action === 'BUY') {
    err = validateBuy(state, orders, args.symbol, args.quantity, args.limit, currentPrice);
  } else if (action === 'SELL') {
    err = validateSell(state, args.symbol, args.quantity);
  } else {
    err = `unknown action ${action}`;
  }
  if (err) { process.stderr.write(`REJECTED: ${err}\n`); return 1; }

  const notional = args.quantity * args.limit;
  const cashReservedRon = action === 'BUY' ? notional + commission(notional) : 0.0;

  const seq = String(orders.length + 1).padStart(2, '0');
  const order = {
    order_id: args.order_id || `${todayIso()}-${args.symbol}-${action.toLowerCase()}-${seq}`,
    placed_at: nowIsoSec(),
    symbol: args.symbol,
    sector: sectorOf(args.symbol),
    action,
    quantity: args.quantity,
    order_type: 'LMT',
    limit_price: args.limit,
    tif: args.tif,
    trade_type: args.trade_type,
    trade_id: args.trade_id,
    theme_tag: args.theme_tag ?? null,
    invalidation_conditions: args.invalidation || [],
    engine_managed: true,
    cash_reserved_ron: Math.round(cashReservedRon * 100) / 100,
  };
  orders.push(order);
  writeJsonlAtomic(config.ordersPath, orders);

  process.stdout.write(JSON.stringify({ status: 'accepted', order }, null, 2) + '\n');
  return 0;
}

export async function cmdSettle(/* args */) {
  const state = readJson(config.statePath, null);
  if (state === null) {
    process.stderr.write(`error: ${config.statePath} not found\n`);
    return 2;
  }
  const gerr = guardState(state, { requireFresh: false });
  if (gerr) { process.stderr.write(`error: ${gerr}\n`); return 2; }

  const orders = readJsonl(config.ordersPath);
  const now = new Date();
  const nowIso = nowIsoSec();

  // 1) mark every held symbol to market
  const marked = new Map();
  for (const p of state.positions) {
    const bar = await deps.fetchTodayBar(p.symbol);
    if (bar) {
      marked.set(p.symbol, bar);
      p.last_price = bar.price;
      p.last_updated = nowIso;
      const peak = p.peak_since_entry ?? p.avg_cost;
      p.peak_since_entry = Math.max(peak, bar.high ?? peak);
    }
  }

  // 2) settle open orders
  const remainingOrders = [];
  const newFills = [];
  const closedPositions = [];

  for (const o of orders) {
    const sym = o.symbol;
    let bar = marked.get(sym);
    if (!bar) {
      bar = await deps.fetchTodayBar(sym);
      if (bar) marked.set(sym, bar);
    }
    if (!bar) {
      remainingOrders.push(o);
      continue;
    }

    const placedDate = (o.placed_at || '').slice(0, 10);
    const limit = o.limit_price;

    // BVB fills are checked against the next session's OHLC once placed.
    // If the order was placed today or later relative to the bar date, defer.
    if (placedDate >= bar.bar_date) {
      remainingOrders.push(o);
      continue;
    }

    let filled = false;
    let fillPrice = null;

    if (o.action === 'BUY') {
      if (bar.low != null && bar.low <= limit) {
        const op = bar.open != null ? bar.open : limit;
        fillPrice = Math.min(limit, op);
        filled = true;
      }
    } else { // SELL
      if (bar.high != null && bar.high >= limit) {
        const op = bar.open != null ? bar.open : limit;
        fillPrice = Math.max(limit, op);
        filled = true;
      }
    }

    if (!filled) {
      if (o.tif === 'DAY' && placedDate < bar.bar_date) {
        // DAY order, prior session, didn't fill — drop
        continue;
      }
      remainingOrders.push(o);
      continue;
    }

    const qty = o.quantity;
    const notional = qty * fillPrice;
    const comm = commission(notional);
    const fill = {
      fill_id: `${o.order_id}-fill`,
      order_id: o.order_id,
      filled_at: nowIso,
      symbol: sym,
      sector: sectorOf(sym),
      action: o.action,
      quantity: qty,
      limit_price: Math.round(limit * 10000) / 10000,
      fill_price: Math.round(fillPrice * 10000) / 10000,
      slippage_bps: Math.round(
        ((o.action === 'BUY' ? (fillPrice - limit) : (limit - fillPrice)) / limit) * 10_000 * 100
      ) / 100,
      commission_ron: Math.round(comm * 100) / 100,
      total_ron: Math.round((notional + (o.action === 'BUY' ? comm : -comm)) * 100) / 100,
      trade_type: o.trade_type ?? null,
      trade_id: o.trade_id ?? null,
      theme_tag: o.theme_tag ?? null,
      invalidation_conditions: o.invalidation_conditions || [],
      engine_managed: o.engine_managed ?? true,
    };
    newFills.push(fill);
    appendJsonl(config.fillsPath, fill);

    if (o.action === 'BUY') {
      state.cash_ron -= notional + comm;
      const pos = findPosition(state, sym);
      if (pos) {
        const totalCost = pos.avg_cost * pos.quantity + notional;
        pos.quantity += qty;
        pos.avg_cost = Math.round((totalCost / pos.quantity) * 10000) / 10000;
        pos.last_price = fillPrice;
        if (pos.engine_managed == null) pos.engine_managed = o.engine_managed ?? true;
      } else {
        state.positions.push({
          symbol: sym,
          sector: sectorOf(sym),
          quantity: qty,
          avg_cost: Math.round(fillPrice * 10000) / 10000,
          last_price: fillPrice,
          last_updated: nowIso,
          trade_type: o.trade_type ?? null,
          trade_id: o.trade_id ?? null,
          theme_tag: o.theme_tag ?? null,
          invalidation_conditions: o.invalidation_conditions || [],
          engine_managed: o.engine_managed ?? true,
          opened_at: nowIso,
          peak_since_entry: fillPrice,
        });
      }
    } else { // SELL
      const pos = findPosition(state, sym);
      state.cash_ron += notional - comm;
      pos.quantity -= qty;
      if (pos.quantity === 0) {
        const daysHeld = pos.opened_at
          ? Math.floor((now.getTime() - new Date(pos.opened_at).getTime()) / 86400_000)
          : null;
        closedPositions.push({
          symbol: sym,
          trade_id: pos.trade_id ?? null,
          theme_tag: pos.theme_tag ?? null,
          exit_price: fillPrice,
          avg_cost: pos.avg_cost,
          realized_pnl_ron: Math.round(((fillPrice - pos.avg_cost) * qty - comm) * 100) / 100,
          days_held: daysHeld,
        });
        state.positions = state.positions.filter(p => p.symbol !== sym);
      }
    }
  }

  // 3) totals
  state.as_of = nowIso;
  const posValue = state.positions.reduce(
    (s, p) => s + p.quantity * (p.last_price ?? p.avg_cost), 0
  );
  const costBasis = state.positions.reduce((s, p) => s + p.quantity * p.avg_cost, 0);
  const tv = state.cash_ron + posValue;
  const unrealized = posValue - costBasis;
  state.totals = {
    position_value_ron: Math.round(posValue * 100) / 100,
    total_value_ron: Math.round(tv * 100) / 100,
    unrealized_pnl_ron: Math.round(unrealized * 100) / 100,
    unrealized_pnl_pct: costBasis
      ? Math.round((unrealized / costBasis) * 100 * 100) / 100
      : 0.0,
    cost_basis_ron: Math.round(costBasis * 100) / 100,
  };

  writeJsonlAtomic(config.ordersPath, remainingOrders);
  writeJsonAtomic(config.statePath, state);

  const report = {
    as_of: state.as_of,
    new_fills: newFills,
    closed_positions: closedPositions,
    open_orders_remaining: remainingOrders.length,
    totals: state.totals,
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  return 0;
}

export async function cmdStatus(/* args */) {
  const state = readJson(config.statePath, null);
  const orders = readJsonl(config.ordersPath);
  const fills = readJsonl(config.fillsPath);
  process.stdout.write(JSON.stringify({
    state,
    open_orders: orders,
    total_fills_ever: fills.length,
  }, null, 2) + '\n');
  return 0;
}

// ---- CLI ------------------------------------------------------------------

function parseArgs(argv) {
  const out = { cmd: null, symbol: null, action: null, quantity: null, limit: null,
                tif: 'DAY', trade_type: 'swing', trade_id: null, order_id: null,
                theme_tag: null, invalidation: [] };
  if (!argv.length) throw new Error('no command given');
  out.cmd = argv[0];
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    const eq = (p) => a.startsWith(p + '=') ? a.slice(p.length + 1) : null;
    const take = () => argv[++i];
    if (a === '--symbol')          out.symbol = take();
    else if (eq('--symbol'))       out.symbol = eq('--symbol');
    else if (a === '--action')     out.action = take();
    else if (eq('--action'))       out.action = eq('--action');
    else if (a === '--quantity')   out.quantity = parseInt(take(), 10);
    else if (eq('--quantity'))     out.quantity = parseInt(eq('--quantity'), 10);
    else if (a === '--limit')      out.limit = parseFloat(take());
    else if (eq('--limit'))        out.limit = parseFloat(eq('--limit'));
    else if (a === '--tif')        out.tif = take();
    else if (eq('--tif'))          out.tif = eq('--tif');
    else if (a === '--trade-type') out.trade_type = take();
    else if (eq('--trade-type'))   out.trade_type = eq('--trade-type');
    else if (a === '--trade-id')   out.trade_id = take();
    else if (eq('--trade-id'))     out.trade_id = eq('--trade-id');
    else if (a === '--order-id')   out.order_id = take();
    else if (eq('--order-id'))     out.order_id = eq('--order-id');
    else if (a === '--theme-tag')  out.theme_tag = take();
    else if (eq('--theme-tag'))    out.theme_tag = eq('--theme-tag');
    else if (a === '--invalidation') out.invalidation.push(take());
    else if (eq('--invalidation'))   out.invalidation.push(eq('--invalidation'));
    else throw new Error(`unknown argument: ${a}`);
  }

  // per-cmd required checks
  if (out.cmd === 'place') {
    const missing = ['symbol', 'action', 'quantity', 'limit', 'trade_id']
      .filter(k => out[k] == null || Number.isNaN(out[k]));
    if (missing.length) throw new Error(`missing required for place: --${missing.join(' --').replace('trade_id', 'trade-id')}`);
    const actU = out.action.toUpperCase();
    if (!['BUY', 'SELL'].includes(actU)) throw new Error(`--action must be BUY or SELL, got ${out.action}`);
    if (!['DAY', 'GTC'].includes(out.tif)) throw new Error(`--tif must be DAY or GTC, got ${out.tif}`);
    if (!['swing', 'event', 'trend'].includes(out.trade_type)) {
      throw new Error(`--trade-type must be swing|event|trend, got ${out.trade_type}`);
    }
  }
  return out;
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try { args = parseArgs(argv); }
  catch (e) { process.stderr.write(`error: ${e.message}\n`); return 2; }

  switch (args.cmd) {
    case 'place':  return cmdPlace(args);
    case 'settle': return cmdSettle(args);
    case 'status': return cmdStatus(args);
    default:
      process.stderr.write(`unknown command: ${args.cmd}\n`);
      return 2;
  }
}

// Run as CLI only when invoked directly (not when imported by tests).
const thisFile = url.fileURLToPath(import.meta.url);
const invokedAs = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedAs && invokedAs === thisFile) {
  main().then(
    (code) => process.exit(code),
    (err) => { process.stderr.write(`FATAL: ${err.stack || err.message || err}\n`); process.exit(2); }
  );
}
