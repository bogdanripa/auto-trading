#!/usr/bin/env node
/**
 * Tests for scripts/sim_executor.mjs.
 *
 * Uses a tempdir-rooted LocalStore + a fake fetchTodayBar so we don't hit
 * Yahoo or Firestore. Built-in node:test runner — no deps.
 *
 * Run:
 *     node --test tests/test_sim_executor.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as se from '../scripts/sim_executor.mjs';
import { LocalStore } from '../scripts/store.mjs';

// ---- helpers --------------------------------------------------------------

function seedState({ cashRon = 10_000.0, positions = [], mode = 'simulation' } = {}) {
  return {
    as_of: new Date().toISOString(),
    mode,
    cash_ron: cashRon,
    positions,
    totals: {},
  };
}

function fakeBar({ price, open, high, low, dateIso }) {
  return { price, open, high, low, close: price, bar_date: dateIso };
}

function today() { return new Date().toISOString().slice(0, 10); }
function yesterday() { return new Date(Date.now() - 86400_000).toISOString().slice(0, 10); }

/** Capture stdout/stderr from an async function. */
async function capture(fn) {
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  let out = '', err = '';
  process.stdout.write = (chunk) => { out += chunk; return true; };
  process.stderr.write = (chunk) => { err += chunk; return true; };
  let rc;
  try { rc = await fn(); }
  finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
  return { rc, out, err };
}

/**
 * Fresh LocalStore over a tempdir per test. Injects it into sim_executor via
 * config.store so every read/write hits the tempdir. Resets env + deps on
 * teardown.
 */
function newFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-exec-'));
  const store = new LocalStore({ root: dir });
  const origStore = se.config.store;
  const origMode = process.env.EXECUTION_MODE;
  const origFetch = se.deps.fetchTodayBar;

  se.config.store = store;
  process.env.EXECUTION_MODE = 'simulation';

  return {
    dir,
    store,
    setBar(bar) { se.deps.fetchTodayBar = async () => bar; },
    teardown() {
      se.config.store = origStore;
      se.deps.fetchTodayBar = origFetch;
      if (origMode === undefined) delete process.env.EXECUTION_MODE;
      else process.env.EXECUTION_MODE = origMode;
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    },
    async state()   { return store.getState(); },
    async orders()  { return store.listOrders(); },
    async fills()   { return store.listFills(); },
    async writeState(s) { await store.setState(s); },
    async writeOrders(o) { await store.replaceOrders(o); },
  };
}

// ---- tests ---------------------------------------------------------------

test('buy → settle → sell → settle round-trip', async () => {
  const fx = newFixture();
  try {
    await fx.writeState(seedState({ cashRon: 5_000.0 }));
    const td = today();
    const yd = yesterday();

    // BUY
    fx.setBar(fakeBar({ price: 38.0, open: 37.8, high: 38.5, low: 37.5, dateIso: td }));
    let { rc, err } = await capture(() => se.main([
      'place', '--symbol', 'TLV', '--action', 'BUY',
      '--quantity', '10', '--limit', '38.0',
      '--trade-type', 'swing', '--trade-id', '2026-04-18-TLV-01',
      '--theme-tag', 'BNR higher-for-longer',
      '--invalidation', 'NIM drops below 3.5',
      '--invalidation', 'close below 35.00',
    ]));
    assert.equal(rc, 0, err);
    let orders = await fx.orders();
    assert.equal(orders.length, 1);
    assert.equal(orders[0].theme_tag, 'BNR higher-for-longer');
    assert.equal(orders[0].invalidation_conditions.length, 2);
    assert.equal(orders[0].engine_managed, true);

    // back-date so settle considers it eligible
    orders[0].placed_at = `${yd}T10:00:00Z`;
    await fx.writeOrders(orders);

    // SETTLE — bar today, limit 38.0, low 37.5 → fills at min(38.0, 37.8) = 37.8
    fx.setBar(fakeBar({ price: 38.2, open: 37.8, high: 38.5, low: 37.5, dateIso: td }));
    ({ rc, err } = await capture(() => se.main(['settle'])));
    assert.equal(rc, 0, err);

    let s = await fx.state();
    assert.equal(s.positions.length, 1);
    const pos = s.positions[0];
    assert.equal(pos.symbol, 'TLV');
    assert.equal(pos.quantity, 10);
    assert.ok(Math.abs(pos.avg_cost - 37.8) < 1e-4, `avg_cost=${pos.avg_cost}`);
    assert.equal(pos.theme_tag, 'BNR higher-for-longer');
    assert.equal(pos.engine_managed, true);
    assert.deepEqual(await fx.orders(), []);
    const fills = await fx.fills();
    assert.equal(fills.length, 1);
    assert.equal(fills[0].action, 'BUY');
    assert.equal(fills[0].theme_tag, 'BNR higher-for-longer');
    assert.equal(fills[0].limit_price, 38.0);
    assert.ok(Math.abs(fills[0].fill_price - 37.8) < 1e-4);

    // SELL 10
    fx.setBar(fakeBar({ price: 40.0, open: 39.8, high: 40.5, low: 39.0, dateIso: td }));
    ({ rc, err } = await capture(() => se.main([
      'place', '--symbol', 'TLV', '--action', 'SELL',
      '--quantity', '10', '--limit', '39.5',
      '--trade-type', 'swing', '--trade-id', '2026-04-18-TLV-01',
    ])));
    assert.equal(rc, 0, err);

    orders = await fx.orders();
    orders[0].placed_at = `${yd}T10:00:00Z`;
    await fx.writeOrders(orders);

    fx.setBar(fakeBar({ price: 40.2, open: 39.8, high: 40.5, low: 39.0, dateIso: td }));
    let out;
    ({ rc, out, err } = await capture(() => se.main(['settle'])));
    assert.equal(rc, 0, err);

    const report = JSON.parse(out);
    assert.equal(report.closed_positions.length, 1);
    const closed = report.closed_positions[0];
    assert.equal(closed.symbol, 'TLV');
    // fill = max(39.5, 39.8) = 39.8
    assert.ok(Math.abs(closed.exit_price - 39.8) < 1e-4, `exit=${closed.exit_price}`);

    s = await fx.state();
    assert.deepEqual(s.positions, []);
    assert.ok(s.cash_ron > 5_000.0, `cash=${s.cash_ron}`);
  } finally {
    fx.teardown();
  }
});

test('DAY buy order that does not fill expires (not kept)', async () => {
  const fx = newFixture();
  try {
    await fx.writeState(seedState({ cashRon: 5_000.0 }));
    const td = today();
    const yd = yesterday();

    fx.setBar(fakeBar({ price: 38.0, open: 37.8, high: 38.5, low: 37.5, dateIso: td }));
    let { rc, err } = await capture(() => se.main([
      'place', '--symbol', 'TLV', '--action', 'BUY',
      '--quantity', '10', '--limit', '35.0',
      '--trade-type', 'swing', '--trade-id', '2026-04-18-TLV-02',
      '--tif', 'DAY',
    ]));
    assert.equal(rc, 0, err);

    const orders = await fx.orders();
    orders[0].placed_at = `${yd}T10:00:00Z`;
    orders[0].limit_price = 35.0; // below bar's low
    await fx.writeOrders(orders);

    fx.setBar(fakeBar({ price: 38.0, open: 37.8, high: 38.5, low: 37.5, dateIso: td }));
    ({ rc, err } = await capture(() => se.main(['settle'])));
    assert.equal(rc, 0, err);

    assert.deepEqual(await fx.orders(), []);
    assert.deepEqual(await fx.fills(), []);
    assert.deepEqual((await fx.state()).positions, []);
  } finally {
    fx.teardown();
  }
});

test('BUY breaching the 60% sector cap is rejected', async () => {
  const fx = newFixture();
  try {
    // total value ~ 5000; 60% cap => 3000
    await fx.writeState(seedState({
      cashRon: 2_500.0,
      positions: [{
        symbol: 'TLV',
        sector: 'Banking',
        quantity: 100,
        avg_cost: 25.0,
        last_price: 25.0,
        opened_at: new Date().toISOString(),
        engine_managed: true,
      }],
    }));

    // BRD 50 @ 20 = 1000; sector becomes 3500 > 3000 → reject
    fx.setBar(fakeBar({ price: 20.0, open: 19.9, high: 20.3, low: 19.6, dateIso: '2026-04-19' }));
    const { rc, err } = await capture(() => se.main([
      'place', '--symbol', 'BRD', '--action', 'BUY',
      '--quantity', '50', '--limit', '20.0',
      '--trade-type', 'swing', '--trade-id', '2026-04-19-BRD-01',
    ]));
    assert.equal(rc, 1, err);
    assert.match(err, /sector cap/);
    assert.deepEqual(await fx.orders(), []);
  } finally {
    fx.teardown();
  }
});

test('EXECUTION_MODE mismatch blocks both place and settle', async () => {
  const fx = newFixture();
  try {
    await fx.writeState(seedState({ cashRon: 5_000.0, mode: 'ibkr' })); // env says simulation

    fx.setBar(fakeBar({ price: 38.0, open: 37.8, high: 38.5, low: 37.5, dateIso: '2026-04-19' }));
    let { rc, err } = await capture(() => se.main([
      'place', '--symbol', 'TLV', '--action', 'BUY',
      '--quantity', '1', '--limit', '38.0',
      '--trade-type', 'swing', '--trade-id', '2026-04-19-TLV-X',
    ]));
    assert.equal(rc, 2, err);
    assert.match(err, /EXECUTION_MODE/);

    ({ rc, err } = await capture(() => se.main(['settle'])));
    assert.equal(rc, 2, err);
    assert.match(err, /EXECUTION_MODE/);
  } finally {
    fx.teardown();
  }
});

test('status reports store backend', async () => {
  const fx = newFixture();
  try {
    await fx.writeState(seedState({ cashRon: 1_000.0 }));
    const { rc, out, err } = await capture(() => se.main(['status']));
    assert.equal(rc, 0, err);
    const report = JSON.parse(out);
    assert.equal(report.backend, 'local');
    assert.equal(report.state.cash_ron, 1_000.0);
  } finally {
    fx.teardown();
  }
});
