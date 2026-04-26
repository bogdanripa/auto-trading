/**
 * Persistence layer — talks to bt-gateway over HTTP.
 *
 * All long-term memory for the trading engine — portfolio state, trade
 * journal, fills, considered candidates, daily market snapshots — lives in
 * Firestore but is owned and accessed exclusively via bt-gateway's REST API.
 * No direct Firestore access, no local-files fallback. One codepath.
 *
 * Mode (demo vs live) is inferred from the BT_GATEWAY_API_KEY prefix — the
 * gateway enforces that a demo key only sees demo state and vice versa.
 *
 * Required env:
 *   BT_GATEWAY_API_KEY   bvb_demo_... or bvb_live_...
 *   BT_GATEWAY_URL       gateway base URL (e.g. https://bt-gateway-...run.app)
 */

function gatewayBase() {
  const v = process.env.BT_GATEWAY_URL;
  if (!v) throw new Error('BT_GATEWAY_URL env var is required');
  return v.replace(/\/+$/, '');
}

function apiKey() {
  const v = process.env.BT_GATEWAY_API_KEY;
  if (!v) throw new Error('BT_GATEWAY_API_KEY env var is required');
  return v;
}

async function gw(path, { method = 'GET', body, query } = {}) {
  let url = `${gatewayBase()}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const init = {
    method,
    headers: {
      'authorization': `Bearer ${apiKey()}`,
      'content-type': 'application/json',
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  // Retry on 502/503/504 with exponential backoff. Cloud Run returns these
  // during rolling deploys, cold-start overlap, and when the warm instance is
  // temporarily saturated. Same pattern as bt_executor.
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
    if (attempt === BACKOFF_MS.length) break;
    const waitMs = BACKOFF_MS[attempt];
    const code = lastErr ? `network (${lastErr.message})` : `${res.status}`;
    console.error(`[store] transient gateway error (${code}), retry ${attempt + 1}/${BACKOFF_MS.length} in ${waitMs}ms…`);
    await new Promise((r) => setTimeout(r, waitMs));
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

// ---- store interface ------------------------------------------------------

class GatewayStore {
  constructor() {
    this.kind = 'gateway';
  }

  // ----- portfolio state (singleton) -----
  async getState() {
    const r = await gw('/api/v1/state/portfolio');
    return r.state ?? null;
  }

  async setState(state) {
    await gw('/api/v1/state/portfolio', { method: 'PUT', body: state });
  }

  /** Alias used by scripts/bt_executor.mjs after a live status fetch. */
  async savePortfolioState(state) {
    return this.setState(state);
  }

  // ----- fills -----
  async appendFill(fill) {
    await gw('/api/v1/fills', { method: 'POST', body: fill });
  }

  async listFills({ since, limit } = {}) {
    const r = await gw('/api/v1/fills', { query: { since, limit } });
    // Returned desc by the API; expose ascending for consumer-compatibility
    // (existing callers — tax_fifo, journal_stats — assume chronological).
    return (r.records ?? []).slice().reverse();
  }

  // ----- trade journal -----
  async appendJournal(record) {
    await gw('/api/v1/journal', { method: 'POST', body: record });
  }

  async listJournal({ since, limit, type } = {}) {
    const r = await gw('/api/v1/journal', { query: { since, limit, type } });
    return (r.records ?? []).slice().reverse();
  }

  // ----- considered candidates -----
  async appendConsidered(record) {
    await gw('/api/v1/considered', { method: 'POST', body: record });
  }

  async listConsidered({ since, limit } = {}) {
    const r = await gw('/api/v1/considered', { query: { since, limit } });
    // Already desc-by-logged_at — match legacy listConsidered which returned
    // newest-first.
    return r.records ?? [];
  }

  // ----- market snapshots -----
  async saveSnapshot(date, snapshot) {
    await gw(`/api/v1/snapshots/${encodeURIComponent(date)}`, {
      method: 'PUT',
      body: snapshot,
    });
  }

  async loadSnapshot(date) {
    const r = await gw(`/api/v1/snapshots/${encodeURIComponent(date)}`);
    return r.record ?? null;
  }

  async listSnapshots({ from, to, limit } = {}) {
    const r = await gw('/api/v1/snapshots', { query: { from, to, limit } });
    return r.records ?? [];
  }
}

// ---- factory --------------------------------------------------------------

/**
 * Open the store. There is only one backend now — the HTTP gateway. The
 * function remains async and returns a promise for backward compatibility
 * with existing `await openStore()` call sites.
 */
export async function openStore() {
  return new GatewayStore();
}

export { GatewayStore };
