#!/usr/bin/env node
/**
 * One-shot seed utility. Reads a JSON file containing a portfolio state
 * document (same shape as `portfolio/state.seed.json`) and writes it into the
 * configured store as the current portfolio_state.
 *
 * Usage:
 *     node scripts/seed_state.mjs portfolio/state.seed.json
 *     FIRESTORE_PROJECT=auto-trader-493814 node scripts/seed_state.mjs portfolio/state.seed.json
 *
 * Refuses to overwrite an existing state unless --force is passed. This is
 * meant for bootstrapping: first time you point the engine at Firestore, run
 * this once to seed the current portfolio; thereafter sim_executor maintains it.
 */

import fs from 'node:fs';
import { openStore } from './store.mjs';

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const file = args.find(a => !a.startsWith('--'));
  if (!file) {
    process.stderr.write('Usage: node scripts/seed_state.mjs <state.json> [--force]\n');
    return 2;
  }
  if (!fs.existsSync(file)) {
    process.stderr.write(`error: ${file} not found\n`);
    return 2;
  }
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!state.mode || state.cash_ron == null || !Array.isArray(state.positions)) {
    process.stderr.write('error: state does not look like a portfolio state document (need mode, cash_ron, positions[])\n');
    return 1;
  }

  const store = await openStore();
  const existing = await store.getState();
  if (existing && !force) {
    process.stderr.write(
      `refusing to overwrite existing state in ${store.kind}; re-run with --force to replace.\n` +
      `existing as_of=${existing.as_of} cash=${existing.cash_ron} n_positions=${existing.positions?.length ?? 0}\n`
    );
    return 1;
  }
  await store.setState(state);
  process.stdout.write(JSON.stringify({
    ok: true,
    backend: store.kind,
    seeded: { mode: state.mode, cash_ron: state.cash_ron, n_positions: state.positions.length },
  }, null, 2) + '\n');
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => { process.stderr.write(`FATAL: ${err.stack || err.message || err}\n`); process.exit(2); }
);
