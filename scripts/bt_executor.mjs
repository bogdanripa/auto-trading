#!/usr/bin/env node
/**
 * BT Trade execution engine — live/demo counterpart to sim_executor.py.
 *
 * Routes through the @bogdanripa/bt-trade library (vendored under
 * vendor/bt-trade/) to hit the real BT Trade HTTP API. Supports BT Trade's
 * demo environment (paper trading) and real-money mode via a single flag.
 *
 * CLI surface mirrors sim_executor.py where it makes sense, so trade-executor
 * can route on EXECUTION_MODE without conditional arg shaping:
 *
 *   node scripts/bt_executor.js status
 *   node scripts/bt_executor.js place \
 *        --symbol TGN --action BUY --quantity 2 --limit 89.00 --tif DAY \
 *        --trade-type swing --trade-id 2026-04-19-TGN-01
 *   node scripts/bt_executor.js orders       # open/recent orders
 *   node scripts/bt_executor.js holdings     # positions
 *
 * There is deliberately no `settle` command — BT Trade fills real orders on
 * its own; we just poll order status. sim_executor.py's `settle` is a
 * simulation-only concept.
 *
 * IMPORTANT SAFETY RULES
 * ----------------------
 * - BT Trade demo and live share the same API surface, but orders placed in
 *   live mode move real RON. Demo is the default for this script. Pass
 *   --live to opt into real money. `trade-executor/SKILL.md` should never
 *   pass --live unless EXECUTION_MODE=live.
 * - One login per process. We instantiate the client once in main() and
 *   reuse it across any work requested. Triggering multiple logins in quick
 *   succession risks being flagged by BT's 2FA / fraud heuristics.
 * - OTP delivery is via ntfy.sh. The phone Shortcut that forwards SMS to
 *   the ntfy topic MUST already be wired up. Topic name comes from
 *   BT_NTFY_TOPIC (same var the library's ntfyOtpProvider uses).
 *
 * Required env vars:
 *   BT_USER          — BT Trade username
 *   BT_PASS          — BT Trade password
 *   BT_NTFY_TOPIC    — ntfy.sh topic the SMS bridge publishes to
 *
 * Exit codes:
 *   0  — success, JSON result printed to stdout
 *   1  — validation / precondition failure
 *   2  — BT Trade API error (login, network, 4xx/5xx from server)
 *   3  — unexpected runtime error
 */

import dns from 'node:dns/promises';
import { BTTradeClient, ntfyOtpProvider } from '../vendor/bt-trade/src/index.js';
import { openStore } from './store.mjs';

// ---------- DNS pre-warm ----------
//
// The sandbox (Anthropic routine) has a tight DNS cache. When we boot the
// Firestore SDK first, Google's auth + metadata + Firestore endpoints flood
// the cache; a subsequent bt-trade lookup for evo.bt-trade.ro then blows the
// cache with "DNS cache overflow" and the whole run dies.
//
// Pre-warming the BT Trade host before any Firestore I/O keeps the BT entry
// hot in the cache regardless of whatever Google adds later.
async function prewarmBtTradeDns({ demo }) {
  const host = 'evo.bt-trade.ro';
  try { await dns.lookup(host); }
  catch (e) { console.error(`[bt_executor] DNS prewarm for ${host} failed: ${e.message}`); }
}

// ---------- argv parsing ----------

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      // Flags without a following value (or followed by another --flag)
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

// ---------- env / config ----------

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`FATAL: ${name} env var is required`);
    process.exit(1);
  }
  return v;
}

// ---------- shared client lifecycle ----------

/**
 * Create + login a BTTradeClient. Called exactly once per process.
 * @param {{ demo: boolean }} opts
 */
async function makeClient({ demo }) {
  const topic = process.env.BT_NTFY_TOPIC; // only required if we end up doing a fresh login

  // STEP 1: Pre-warm BT Trade DNS BEFORE any Firestore I/O. See prewarmBtTradeDns
  // comment for the DNS-cache-overflow background.
  await prewarmBtTradeDns({ demo });

  // STEP 2: Lazy-opened store. First touch defers the Firestore SDK init
  // (which is expensive: OAuth + metadata + endpoint DNS lookups) until we
  // actually need to load or save a session snapshot.
  let storePromise = null;
  const getStore = () => (storePromise ??= openStore());

  // onSessionChange is called after login, every refresh, and on logout.
  // Persisting every time means the store doc always reflects the freshest
  // tokens, so the keeper routine (and subsequent runs) can resume cleanly.
  // This hook lazily opens the store on first fire — so a pure BT-Trade-only
  // command path (e.g. a smoke test that never triggers a token refresh) can
  // complete without ever touching Firestore.
  const onSessionChange = async (snap) => {
    try {
      const store = await getStore();
      await store.saveBtSession(snap);
    } catch (e) {
      // DO NOT silently swallow — if Firestore was requested (FIRESTORE_PROJECT
      // set) and failed, the routine needs to see it. Session changes that
      // don't land durably mean re-2FA on the next run.
      console.error(`[bt_executor] saveBtSession failed: ${e.message}`);
    }
  };

  const client = new BTTradeClient({
    demo,
    otpProvider: topic ? ntfyOtpProvider({ topic }) : undefined,
    onSessionChange,
  });

  // STEP 3: Try to resume. We have to hit the store to read the prior snapshot;
  // there's no way around it for the resume path. But BT Trade's DNS is already
  // warmed above, so Firestore's init can't starve it.
  const store = await getStore();
  const prior = await store.loadBtSession();
  if (prior && prior.accessToken && prior.refreshToken) {
    try {
      client.restore(prior);
      // Validate the session with a cheap call; if the refresh token is dead
      // this will throw and we fall through to a fresh login.
      await client.profile.get();
      return client;
    } catch (e) {
      console.error(`[bt_executor] resume failed (${e.message}); falling back to fresh login`);
    }
  }

  if (!topic) {
    console.error('FATAL: BT_NTFY_TOPIC is required for fresh login (no resumable session available)');
    process.exit(1);
  }
  const username = requireEnv('BT_USER');
  const password = requireEnv('BT_PASS');
  await client.login({ username, password });
  return client;
}

async function firstPortfolioKey(client) {
  const accounts = await client.accounts.list();
  if (!accounts.length) {
    throw new Error('No BT Trade accounts found for this user');
  }
  // There's typically one portfolioKey per BT user. If/when a user has
  // multiple (e.g. RON + EUR segregated), we can add a --account selector.
  return accounts[0].portfolioKey;
}

// ---------- subcommands ----------

async function cmdStatus(client) {
  const [accounts, profile] = await Promise.all([
    client.accounts.list(),
    client.profile.get(),
  ]);
  const portfolioKey = accounts[0]?.portfolioKey;
  if (!portfolioKey) throw new Error('No portfolioKey available');

  // RON balance is the primary cash metric for our BVB-focused engine.
  // currencyId is user-specific; pull from profile's selected panel currency
  // which is the same one the web UI uses.
  const currencyId = profile.selectedPortfolioPanelCurrencyID;
  const [cash, holdings] = await Promise.all([
    client.portfolio.getCashDetails({ portfolioKey, currencyId }),
    client.portfolio.getHoldings({ portfolioKey }),
  ]);

  return { mode: client.demo ? 'demo' : 'live', portfolioKey, cash, holdings };
}

async function cmdOrders(client) {
  const portfolioKey = await firstPortfolioKey(client);
  return client.orders.search({ portfolioKey });
}

async function cmdHoldings(client) {
  const portfolioKey = await firstPortfolioKey(client);
  return client.portfolio.getHoldings({ portfolioKey });
}

/**
 * Proactively rotate the access+refresh tokens. Designed to be called every
 * ~45 min by a dedicated keeper routine so the refresh token never ages out
 * past its ~1h server-side expiry. onSessionChange persists the new tokens
 * to Firestore automatically.
 */
async function cmdRefresh(client) {
  const before = client.toSnapshot();
  await client.auth.refresh();
  const after = client.toSnapshot();
  return {
    ok: true,
    access_token_rotated: before?.accessToken !== after?.accessToken,
    refresh_token_rotated: before?.refreshToken !== after?.refreshToken,
    expires_at: after?.expiresAt ? new Date(after.expiresAt).toISOString() : null,
    refresh_token_expires: after?.refreshTokenExpires ?? null,
  };
}

/**
 * Revoke the server-side session and clear the persisted snapshot from Firestore.
 * Only use when you explicitly want to force a fresh 2FA login on the next run.
 */
async function cmdLogout(client) {
  await client.logout();              // also fires onSessionChange(null) → Firestore clear
  return { ok: true, logged_out: true };
}

async function cmdPlace(client, flags) {
  const required = ['symbol', 'action', 'quantity', 'limit', 'trade-id'];
  for (const r of required) {
    if (flags[r] === undefined) {
      throw new Error(`--${r} is required`);
    }
  }

  const portfolioKey = await firstPortfolioKey(client);
  const symbol = String(flags.symbol).toUpperCase();

  // Resolve the BVB market for this symbol. BT Trade's searchInstrument returns
  // all listings matching a ticker; for BVB shares there's typically a single
  // row with market 'BVB'. If multiple markets come back, we prefer BVB.
  const matches = await client.markets.searchInstrument(symbol);
  if (!matches.length) throw new Error(`No instrument found for symbol '${symbol}'`);
  const instrument =
    matches.find(m => (m.market || '').toUpperCase() === 'BVB') || matches[0];

  const side = String(flags.action).toLowerCase();   // 'buy' | 'sell'
  if (side !== 'buy' && side !== 'sell') {
    throw new Error(`--action must be BUY or SELL, got ${flags.action}`);
  }

  const tif = String(flags.tif || 'DAY').toUpperCase();
  const valability = tif === 'GTC' ? 'gtc' : 'day';

  const order = {
    portfolioKey,
    symbol: instrument.code,
    marketId: instrument.marketId,
    quantity: Number(flags.quantity),
    price: Number(flags.limit),
    side,
    type: 'limit',     // engine only places limit orders; see PROJECT.md
    valability,
  };

  // Preview first so we log fees + netValue alongside the result. Cheap — it
  // doesn't commit anything. The result is attached to the response so the
  // trade-executor skill can surface fees in the Telegram briefing.
  const preview = await client.orders.preview(order);
  const result = await client.orders.placeOrder(order);

  return {
    submitted: order,
    trade_id: flags['trade-id'],
    preview,
    result,
  };
}

// ---------- main ----------

const HELP = `Usage: node scripts/bt_executor.js <command> [flags]

Commands:
  status           Account + cash + holdings snapshot
  orders           List recent orders
  holdings         List current positions
  place            Place a limit order (requires --symbol --action --quantity --limit --trade-id)
  refresh          Rotate access+refresh tokens (for the keeper routine)
  logout           Revoke the server-side session and clear Firestore snapshot

Global flags:
  --live           Use real-money mode (default: demo/paper)
                   trade-executor should only pass this when EXECUTION_MODE=live.
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(HELP);
    process.exit(cmd ? 0 : 1);
  }

  const demo = !args.flags.live;

  let client;
  try {
    client = await makeClient({ demo });
  } catch (err) {
    console.error(`FATAL: login failed: ${err.message}`);
    process.exit(2);
  }

  try {
    let out;
    switch (cmd) {
      case 'status':   out = await cmdStatus(client);           break;
      case 'orders':   out = await cmdOrders(client);           break;
      case 'holdings': out = await cmdHoldings(client);         break;
      case 'place':    out = await cmdPlace(client, args.flags); break;
      case 'refresh':  out = await cmdRefresh(client);           break;
      case 'logout':   out = await cmdLogout(client);            break;
      default:
        console.error(`unknown command: ${cmd}\n\n${HELP}`);
        process.exit(1);
    }
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.exit(0);
  } catch (err) {
    console.error(`ERROR (${cmd}): ${err.message}`);
    if (process.env.BT_DEBUG) console.error(err.stack);
    process.exit(2);
  } finally {
    // We deliberately do NOT call client.logout() here — logging out revokes
    // the server-side session, which defeats the whole point of persisting
    // tokens to Firestore for reuse across routine runs. The `logout` subcommand
    // is the only place we revoke. We DO want to stop the library's
    // auto-refresh timer so the process can exit; do that by nulling the
    // reference — Node will GC the timer. If the library exposes a nicer
    // teardown later, swap it in here.
    // (Using process.exit() above also terminates the loop regardless.)
  }
}

main().catch(err => {
  console.error(`FATAL: ${err.stack || err.message || err}`);
  process.exit(3);
});
