/**
 * Persistence abstraction for the trading engine.
 *
 * Two backends:
 *   - Firestore  (when FIRESTORE_PROJECT env var is set)
 *   - local-files (dev fallback; reads/writes files under portfolio/, journal/,
 *                  considered/, snapshots/, .bt_session.json)
 *
 * Why this exists: Anthropic routines have an ephemeral filesystem — git-tracked
 * files under portfolio/ do not survive across runs unless we commit+push, and
 * the BT Trade session's access/refresh tokens must survive across runs for the
 * keeper routine to rotate them. Firestore gives us durable shared state in
 * europe-west3 with room to grow (orders history, journal, considered log,
 * daily snapshots).
 *
 * Uses @google-cloud/firestore SDK. Credentials via GOOGLE_APPLICATION_CREDENTIALS
 * or GCS_SA_KEY_JSON (inline service-account JSON). Project from FIRESTORE_PROJECT.
 *
 * Collections:
 *   bt_session                      singleton doc 'current' — { snapshot, updated_at }
 *   considered                      rejected/skipped candidates (learning signal)
 *   market_snapshots                daily macro/market snapshot, doc id = YYYY-MM-DD
 *   portfolio_state  (future)       singleton doc 'current'
 *   orders           (future)       one doc per open order
 *   fills            (future)       append-only fill history
 *   trades_journal   (future)       entry/exit journal pairs
 *
 * Minimal interface now; grows as we port more scripts.
 */

import fs from 'node:fs';
import path from 'node:path';

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
    const data = snap.data() || {};
    return data.snapshot || null;
  }

  async saveBtSession(snapshot) {
    const ref = this.db.collection('bt_session').doc('current');
    if (snapshot == null) {
      await ref.delete().catch(() => { /* already gone */ });
      return;
    }
    await ref.set({
      snapshot,
      updated_at: new Date().toISOString(),
    });
  }

  // ----- considered candidates (rejected/skipped) -----
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
      date,
      snapshot,
      saved_at: new Date().toISOString(),
    });
  }

  async loadSnapshot(date) {
    const snap = await this.db.collection('market_snapshots').doc(date).get();
    return snap.exists ? snap.data() : null;
  }
}

// ---- Local-files backend (dev fallback) -----------------------------------

class LocalStore {
  constructor({ root = process.cwd() } = {}) {
    this.root = root;
    this.kind = 'local';
    this.sessionPath = path.join(root, '.bt_session.json');
    this.consideredPath = path.join(root, 'considered', 'considered.jsonl');
    this.snapshotsDir = path.join(root, 'snapshots');
  }

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

  async appendConsidered(record) {
    fs.mkdirSync(path.dirname(this.consideredPath), { recursive: true });
    const row = { ...record, logged_at: record.logged_at || new Date().toISOString() };
    fs.appendFileSync(this.consideredPath, JSON.stringify(row) + '\n');
  }

  async listConsidered({ since } = {}) {
    if (!fs.existsSync(this.consideredPath)) return [];
    const rows = fs.readFileSync(this.consideredPath, 'utf8')
      .split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
    const filtered = since ? rows.filter(r => (r.logged_at || '') >= since) : rows;
    return filtered.reverse();
  }

  async saveSnapshot(date, snapshot) {
    fs.mkdirSync(this.snapshotsDir, { recursive: true });
    const p = path.join(this.snapshotsDir, `${date}.json`);
    fs.writeFileSync(p, JSON.stringify({
      date, snapshot, saved_at: new Date().toISOString(),
    }, null, 2) + '\n');
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
 * - If FIRESTORE_PROJECT is set → Firestore backend
 * - Else → local-files backend (dev fallback)
 *
 * Pass { force: 'local' } to override (tests do this).
 */
export async function openStore({ force } = {}) {
  const project = process.env.FIRESTORE_PROJECT;
  const useFirestore = force === 'firestore' || (force !== 'local' && project);

  if (useFirestore) {
    if (!project) throw new Error('FIRESTORE_PROJECT env var is required for firestore backend');
    // Dynamic import so the local backend doesn't pay the SDK load cost and
    // dev environments without the package installed still work.
    const mod = await import('@google-cloud/firestore');
    const Firestore = mod.Firestore || mod.default?.Firestore || mod.default;
    const sa = loadServiceAccountFromEnv();
    const opts = { projectId: project };
    if (sa) {
      opts.credentials = { client_email: sa.client_email, private_key: sa.private_key };
    }
    // databaseId defaults to '(default)'; region is set at database-create time.
    const db = new Firestore(opts);
    return new FirestoreStore(db);
  }

  return new LocalStore({ root: process.env.STORE_ROOT || process.cwd() });
}

// Re-export classes for tests that want to construct directly.
export { FirestoreStore, LocalStore };
