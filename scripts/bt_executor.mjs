#!/usr/bin/env node
/**
 * bt-gateway HTTP client — replaces the old direct BT Trade client.
 *
 * All broker operations now go through the bt-gateway Cloud Run service.
 * The gateway owns the BT Trade session, handles OTP via ntfy, keeps
 * tokens fresh via its own 45-minute cron, and exposes a REST API.
 *
 * CLI surface is identical to the old bt_executor.mjs so all skills work unchanged.
 *
 * Mode is encoded in the API key prefix:
 *   bvb_demo_...  → BT Trade demo/paper
 *   bvb_live_...  → BT Trade live (real RON)
 *
 * Required env vars:
 *   BT_GATEWAY_API_KEY — bvb_demo_... or bvb_live_...
 *
 * Optional env vars:
 *   BT_GATEWAY_URL — override the hardcoded gateway URL (useful for local dev)
 *
 * Exit codes: 0 success, 1 validation, 2 gateway/broker error, 3 runtime error
 */

import { openStore } from './store.mjs';

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args.flags[key] = true;
      } else {
        args.flags[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) { console.error(`FATAL: ${name} env var is required`); process.exit(1); }
  return v;
}

const GATEWAY_URL = 'https://bt-gateway-o2qixn6u6q-ey.a.run.app';

function gatewayBase() { return (process.env.BT_GATEWAY_URL ?? GATEWAY_URL).replace(/\/+$/, ''); }
function apiKey()       { return requireEnv('BT_GATEWAY_API_KEY'); }

async function gw(path, { method = 'GET', body } = {}) {
  const url = `${gatewayBase()}${path}`;
  const init = {
    method,
    headers: { 'authorization': `Bearer ${apiKey()}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(30_000),
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  // Retry on 502/503/504 with exponential backoff. Cloud Run returns these
  // during rolling deploys, cold-start overlap, and when the warm instance
  // is temporarily saturated (e.g. by an in-flight BT OTP login). min-instances
  // guarantees warmth, not availability during scale-up.
  const BACKOFF_MS = [1000, 3000, 6000, 12000];  // 4 retries, ~22s total
  let res;
  let lastErr;
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
      lastErr = null;
    } catch (e) {
      lastErr = e;
      res = null;
    }
    const transient = lastErr || (res && (res.status === 502 || res.status === 503 || res.status === 504));
    if (!transient) break;
    if (attempt === BACKOFF_MS.length) break;  // no more retries
    const waitMs = BACKOFF_MS[attempt];
    const code = lastErr ? `network (${lastErr.message})` : `${res.status}`;
    console.error(`[bt_executor] transient gateway error (${code}), retry ${attempt + 1}/${BACKOFF_MS.length} in ${waitMs}ms…`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  if (!res) throw new Error(`Gateway unreachable after retries: ${lastErr?.message || 'unknown'}`);

  let json;
  try { json = await res.json(); }
  catch { throw new Error(`Gateway returned non-JSON (status ${res.status})`); }

  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? `HTTP ${res.status}`;
    throw new Error(`${json?.error?.code ?? 'GATEWAY_ERROR'}: ${msg}`);
  }

  return json.data ?? json;
}

function inferMode(live) {
  const key = apiKey();
  if (live) {
    if (!key.startsWith('bvb_live_')) {
      console.error('ERROR: --live passed but BT_GATEWAY_API_KEY is not a live key');
      process.exit(1);
    }
    return 'live';
  }
  if (key.startsWith('bvb_live_')) {
    console.error('ERROR: live API key but --live not passed. Refusing.');
    process.exit(1);
  }
  return 'demo';
}

async function cmdStatus(mode, store) {
  const [cash, holdingsData] = await Promise.all([gw('/api/v1/cash'), gw('/api/v1/holdings')]);
  const out = { mode, cash, holdings: holdingsData };

  try {
    const positions = Array.isArray(holdingsData)
      ? holdingsData : (holdingsData.positions ?? holdingsData.items ?? []);
    const cashRon = cash.available ?? cash.availableAmount ?? cash.cash ?? cash.total ?? 0;
    await store.savePortfolioState({ mode, as_of: new Date().toISOString(), cash_ron: cashRon, positions });
  } catch (e) { console.error(`[bt_executor] savePortfolioState failed: ${e.message}`); }

  return out;
}

async function cmdOrders()          { return gw('/api/v1/orders'); }
async function cmdHoldings()        { return gw('/api/v1/holdings'); }
async function cmdRefresh()         { return { ok: true, ...await gw('/api/v1/session/refresh', { method: 'POST' }) }; }

async function cmdPlace(flags) {
  for (const r of ['symbol', 'action', 'quantity', 'limit', 'trade-id']) {
    if (flags[r] === undefined) throw new Error(`--${r} is required`);
  }
  const side = String(flags.action).toLowerCase();
  if (side !== 'buy' && side !== 'sell') throw new Error(`--action must be BUY or SELL`);
  const tif = String(flags.tif || 'DAY').toUpperCase();
  const order = {
    symbol: String(flags.symbol).toUpperCase(), side,
    quantity: Number(flags.quantity), price: Number(flags.limit),
    orderType: 'limit', valability: tif === 'GTC' ? 'gtc' : 'day',
  };
  const result = await gw('/api/v1/orders', { method: 'POST', body: order });
  return { submitted: order, trade_id: flags['trade-id'], result };
}

const HELP = `Usage: node scripts/bt_executor.mjs <command> [flags]

Commands: status, orders, holdings, place, refresh
Flags:    --live (validates API key is a live key)
Env:      BT_GATEWAY_URL, BT_GATEWAY_API_KEY
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd || cmd === 'help' || cmd === '--help') { console.log(HELP); process.exit(cmd ? 0 : 1); }

  const mode = inferMode(!!args.flags.live);
  const store = await openStore();

  try {
    let out;
    switch (cmd) {
      case 'status':   out = await cmdStatus(mode, store); break;
      case 'orders':   out = await cmdOrders();            break;
      case 'holdings': out = await cmdHoldings();          break;
      case 'place':    out = await cmdPlace(args.flags);   break;
      case 'refresh':  out = await cmdRefresh();           break;
      case 'logout':
        console.error('logout removed — gateway manages BT Trade session lifecycle.'); process.exit(1); break;
      default:
        console.error(`unknown command: ${cmd}`); process.exit(1);
    }
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.exit(0);
  } catch (err) {
    console.error(`ERROR (${cmd}): ${err.message}`);
    if (process.env.BT_DEBUG) console.error(err.stack);
    process.exit(2);
  }
}

main().catch(err => { console.error(`FATAL: ${err.stack || err.message}`); process.exit(3); });
