/**
 * Persistence abstraction for the trading engine.
 *
 * Two backends:
 *   - Firestore  (when FIRESTORE_PROJECT env var is set) — durable, shared
 *   - LocalStore (dev fallback) — files under cwd, useful for tests + local runs
 *
 * Why this exists: Anthropic routines have an ephemeral filesystem. Any state
 * that must survive across routine runs (portfolio state, open orders, fill
 * history, journal entries, BT session tokens) has to land in durable storage.
 * Git-as-store would work but is racy and pollutes commit history; Firestore
 * Native in europe-west3 is the chosen backing store.
 *
 * Uses @google-cloud/firestore SDK. Credentials via GOOGLE_APPLICATION_CREDENTIALS
 * or GCS_SA_KEY_JSON (inline service-account JSON). Project from FIRESTORE_PROJECT.
 *
 * Firestore layout:
 *   bt_session/current                { snapshot, updated_at }
 *   portfolio_state/current           { mode, as_of, cash_ron, positions[], totals }
 *   orders/open                       { orders[], updated_at }      -- single-doc array (atomic replace)
 *   fills/<auto>                      one doc per fill (append-only)
 *   trades_journal/<auto>             one doc per entry/exit
 *   considered/<auto>                 rejected/skipped candidates
 *   market_snapshots/YYYY-MM-DD       { date, snapshot, saved_at }
 *
 * LocalStore mirrors the same shape using files under STORE_ROOT (defaults to cwd):
 *   .bt_session.json
 *   portfolio/state.json
 *   portfolio/orders.jsonl
 *   portfolio/fills.jsonl
 *   journal/trades.jsonl
 *   considered/considered.jsonl
 *   snapshots/YYYY-MM-DD.json
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ---- credentials helper ---------------------------------------------------

function loadServiceAccountFromEnv() {
  const raw = process.env.GCS_SA_KEY_JSON;
  if (!raw) return null;
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) return JSON.parse(trimmed);
    return JSON.parse(fs.readFileSync(trimmed, 'utf8'));
  } catch (e) {
    throw new Error(`GCS_SA_KEY_JSON is set but not parseable: ${e.message}`);
  }
}

// ---- Firestore backend ----------------------------------------------------

class FirestoreStore {
  constructor(db) {
    this.db = db;
    this.kind = 'firestore';
  }

  // ----- BT Trade session snapshot -----
  async loadBtSession() {
    const snap = await this.db.collection('bt_session').doc('current').get();
    if (!snap.exists) return null;
    return snap.data()?.snapshot || null;
  }

  async saveBtSession(snapshot) {
    const ref = this.db.collection('bt_session').doc('current');
    if (snapshot == null) {
      await ref.delete().catch(() => { /* already gone */ });
      return;
    }
    await ref.set({ snapshot, updated_at: new Date().toISOString() });
  }

  // ----- portfolio state (singleton) -----
  async getState() {
    const snap = await this.db.collection('portfolio_state').doc('current').get();
    return snap.exists ? snap.data() : null;
  }

  async setState(state) {
    await this.db.collection('portfolio_state').doc('current').set(state);
  }

  // ----- open orders (single doc with array; atomic replace) -----
  async listOrders() {
    const snap = await this.db.collection('orders').doc('open').get();
    return snap.exists ? (snap.data()?.orders || []) : [];
  }

  async replaceOrders(orders) {
    await this.db.collection('orders').doc('open').set({
      orders,
      updated_at: new Date().toISOString(),
    });
  }

  // ----- fills (append-only collection) -----
  async appendFill(fill) {
    // Use a deterministic id when we can so replays don't double-count.
    const id = fill.fill_id || undefined;
    const col = this.db.collection('fills');
    if (id) await col.doc(id).set(fill);
    else    await col.add(fill);
  }

  async listFills() {
    const snap = await this.db.collection('fills').orderBy('filled_at').get();
    return snap.docs.map(d => d.data());
  }

  // ----- trades journal (append-only collection) -----
  async appendJournal(record) {
    const id = record.journal_id || undefined;
    const col = this.db.collection('trades_journal');
    if (id) await col.doc(id).set(record);
    else    await col.add(record);
  }

  async listJournal() {
    const snap = await this.db.collection('trades_journal').orderBy('timestamp').get();
    return snap.docs.map(d => d.data());
  }

  // ----- considered candidates -----
  async appendConsidered(record) {
    const row = { ...record, logged_at: record.logged_at || new Date().toISOString() };
    await this.db.collection('considered').add(row);
  }

  async listConsidered({ since } = {}) {
    let q = this.db.collection('considered').orderBy('logged_at', 'desc');
    if (since) q = q.where('logged_at', '>=', since);
    const snap = await q.get();
    return snap.docs.map(d => d.data());
  }

  // ----- daily market snapshot archive -----
  async saveSnapshot(date, snapshot) {
    await this.db.collection('market_snapshots').doc(date).set({
      date, snapshot, saved_at: new Date().toISOString(),
    });
  }

  async loadSnapshot(date) {
    const snap = await this.db.collection('market_snapshots').doc(date).get();
    return snap.exists ? snap.data() : null;
  }
}

// ---- Local-files backend (dev fallback) -----------------------------------

function writeJsonAtomic(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath) || '.', { recursive: true });
  const tmp = `${filePath}.tmp.${crypto.randomBytes(6).toString('hex')}`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

function writeJsonlAtomic(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath) || '.', { recursive: true });
  const tmp = `${filePath}.tmp.${crypto.randomBytes(6).toString('hex')}`;
  try {
    fs.writeFileSync(tmp, rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
}

class LocalStore {
  constructor({ root = process.cwd() } = {}) {
    this.root = root;
    this.kind = 'local';
    this.sessionPath      = path.join(root, '.bt_session.json');
    this.statePath        = path.join(root, 'portfolio', 'state.json');
    this.ordersPath       = path.join(root, 'portfolio', 'orders.jsonl');
    this.fillsPath        = path.join(root, 'portfolio', 'fills.jsonl');
    this.journalPath      = path.join(root, 'journal', 'trades.jsonl');
    this.consideredPath   = path.join(root, 'considered', 'considered.jsonl');
    this.snapshotsDir     = path.join(root, 'snapshots');
  }

  // ----- BT Trade session -----
  async loadBtSession() {
    if (!fs.existsSync(this.sessionPath)) return null;
    try { return JSON.parse(fs.readFileSync(this.sessionPath, 'utf8')); }
    catch { return null; }
  }

  async saveBtSession(snapshot) {
    if (snapshot == null) {
      try { fs.unlinkSync(this.sessionPath); } catch { /* ignore */ }
      return;
    }
    fs.mkdirSync(path.dirname(this.sessionPath), { recursive: true });
    fs.writeFileSync(this.sessionPath, JSON.stringify(snapshot, null, 2) + '\n');
  }

  // ----- portfolio state -----
  async getState() {
    if (!fs.existsSync(this.statePath)) return null;
    return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
  }

  async setState(state) {
    writeJsonAtomic(this.statePath, state);
  }

  // ----- open orders -----
  async listOrders() { return readJsonl(this.ordersPath); }
  async replaceOrders(orders) { writeJsonlAtomic(this.ordersPath, orders); }

  // ----- fills -----
  async appendFill(fill) {
    fs.mkdirSync(path.dirname(this.fillsPath), { recursive: true });
    fs.appendFileSync(this.fillsPath, JSON.stringify(fill) + '\n');
  }
  async listFills() { return readJsonl(this.fillsPath); }

  // ----- journal -----
  async appendJournal(record) {
    fs.mkdirSync(path.dirname(this.journalPath), { recursive: true });
    fs.appendFileSync(this.journalPath, JSON.stringify(record) + '\n');
  }
  async listJournal() { return readJsonl(this.journalPath); }

  // ----- considered -----
  async appendConsidered(record) {
    fs.mkdirSync(path.dirname(this.consideredPath), { recursive: true });
    const row = { ...record, logged_at: record.logged_at || new Date().toISOString() };
    fs.appendFileSync(this.consideredPath, JSON.stringify(row) + '\n');
  }
  async listConsidered({ since } = {}) {
    const rows = readJsonl(this.consideredPath);
    const filtered = since ? rows.filter(r => (r.logged_at || '') >= since) : rows;
    return filtered.slice().reverse();
  }

  // ----- market snapshots -----
  async saveSnapshot(date, snapshot) {
    fs.mkdirSync(this.snapshotsDir, { recursive: true });
    writeJsonAtomic(
      path.join(this.snapshotsDir, `${date}.json`),
      { date, snapshot, saved_at: new Date().toISOString() },
    );
  }

  async loadSnapshot(date) {
    const p = path.join(this.snapshotsDir, `${date}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
}

// ---- factory --------------------------------------------------------------

/**
 * Open the configured store.
 *
 * - If FIRESTORE_PROJECT env var is set → Firestore backend.
 * - Else → LocalStore rooted at STORE_ROOT (or cwd).
 *
 * Pass { force: 'local' | 'firestore' } to override (tests use 'local').
 */
export async function openStore({ force } = {}) {
  const project = process.env.FIRESTORE_PROJECT;
  const useFirestore = force === 'firestore' || (force !== 'local' && project);

  if (useFirestore) {
    if (!project) throw new Error('FIRESTORE_PROJECT env var is required for firestore backend');
    // Dynamic import so dev without the SDK installed still works.
    let mod;
    try {
      mod = await import('@google-cloud/firestore');
    } catch (e) {
      // Addressed to the agent running in the routine, not a human:
      // the fix is to run `npm install` as Step 0 of the routine prompt
      // before invoking any script. node_modules/ does not survive
      // between sandbox runs. See PROJECT.md § Daily Workflow → Step 0.
      throw new Error(
        `Firestore backend requested (FIRESTORE_PROJECT=${project}) but @google-cloud/firestore is not installed in this sandbox. ` +
        `The routine must run \`npm install\` at the repo root as its FIRST action — node_modules/ is wiped between runs. ` +
        `Original error: ${e.message}`
      );
    }
    const Firestore = mod.Firestore || mod.default?.Firestore || mod.default;
    const sa = loadServiceAccountFromEnv();
    const opts = { projectId: project };
    if (sa) opts.credentials = { client_email: sa.client_email, private_key: sa.private_key };
    const db = new Firestore(opts);
    return new FirestoreStore(db);
  }

  // LocalStore is DEV-ONLY. Production/routine runs MUST set FIRESTORE_PROJECT.
  // If that env is unset in the routine, state does not survive sandbox
  // recycling and every run re-triggers 2FA. See PROJECT.md § Daily Workflow
  // → Step 0 and trade-executor/SKILL.md § Store policy.
  if (!force || force === 'firestore') {
    // Force === 'firestore' handled above; fallthrough only if no project and no force override.
    // Only warn here; tests and ad-hoc dev runs legitimately use LocalStore with force='local'.
    if (process.env.ROUTINE_RUN === '1') {
      throw new Error(
        'LocalStore is forbidden for scheduled routine runs (ROUTINE_RUN=1). ' +
        'Set FIRESTORE_PROJECT (and GCS_SA_KEY_JSON) in the routine env. ' +
        'LocalStore state does not survive sandbox recycling.'
      );
    }
  }
  return new LocalStore({ root: process.env.STORE_ROOT || process.cwd() });
}

export { FirestoreStore, LocalStore };
