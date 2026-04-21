/**
 * GCS-backed BT Trade session persistence.
 *
 * Each routine run wants a single login per day, not one per routine. BT
 * refresh tokens expire ~1h, routines run every few hours, so we persist the
 * session snapshot to a GCS object and a separate 45-min "keeper" routine
 * refreshes the access token before the refresh token itself ages out.
 *
 * This module speaks GCS via its JSON API directly (signed JWT → OAuth2 →
 * storage.googleapis.com) so we don't need @google-cloud/storage as a runtime
 * dep. Node 18+ stdlib only.
 *
 * Env vars:
 *   GCS_SA_KEY_JSON     — service-account key JSON, single-line
 *   BT_SESSION_BUCKET   — bucket name (no gs:// prefix, no trailing /)
 *   BT_SESSION_OBJECT   — object name (default: bt_session.json)
 *
 * If any of these are missing, loadSession() returns null and saveSession()
 * is a no-op + warn. That keeps local-dev invocations usable without GCP.
 */

import crypto from 'node:crypto';

const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const GCS_DOWNLOAD = (bucket, obj) =>
  `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(obj)}?alt=media`;
const GCS_UPLOAD = (bucket, obj) =>
  `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(obj)}`;

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function readEnv() {
  const keyRaw = process.env.GCS_SA_KEY_JSON;
  const bucket = process.env.BT_SESSION_BUCKET;
  const object = process.env.BT_SESSION_OBJECT || 'bt_session.json';
  if (!keyRaw || !bucket) return null;
  let key;
  try { key = JSON.parse(keyRaw); }
  catch (e) {
    console.error(`[gcs_session] GCS_SA_KEY_JSON is not valid JSON: ${e.message}`);
    return null;
  }
  if (!key.client_email || !key.private_key) {
    console.error('[gcs_session] GCS_SA_KEY_JSON missing client_email or private_key');
    return null;
  }
  return { key, bucket, object };
}

async function getAccessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: OAUTH_URL,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const sig = signer.sign(key.private_key);
  const jwt = `${signingInput}.${b64url(sig)}`;

  const resp = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GCS oauth2 token exchange failed: ${resp.status} ${body}`);
  }
  const j = await resp.json();
  if (!j.access_token) throw new Error(`GCS oauth2 response missing access_token: ${JSON.stringify(j)}`);
  return j.access_token;
}

/**
 * @returns {Promise<object|null>} the persisted snapshot, or null if no
 *   config, no object yet, or a read error (treat as "fresh login needed").
 */
export async function loadSession() {
  const cfg = readEnv();
  if (!cfg) return null;
  try {
    const token = await getAccessToken(cfg.key);
    const resp = await fetch(GCS_DOWNLOAD(cfg.bucket, cfg.object), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.status === 404) return null;
    if (!resp.ok) {
      console.error(`[gcs_session] load failed: ${resp.status} ${await resp.text()}`);
      return null;
    }
    return await resp.json();
  } catch (e) {
    console.error(`[gcs_session] load error: ${e.message}`);
    return null;
  }
}

/**
 * Persist a session snapshot. Pass null to delete (logout).
 */
export async function saveSession(snapshot) {
  const cfg = readEnv();
  if (!cfg) {
    console.error('[gcs_session] persistence disabled (no GCS env vars); session will not survive this process');
    return false;
  }
  try {
    const token = await getAccessToken(cfg.key);
    if (snapshot === null) {
      const resp = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(cfg.bucket)}/o/${encodeURIComponent(cfg.object)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok && resp.status !== 404) {
        console.error(`[gcs_session] delete failed: ${resp.status} ${await resp.text()}`);
        return false;
      }
      return true;
    }
    const resp = await fetch(GCS_UPLOAD(cfg.bucket, cfg.object), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snapshot),
    });
    if (!resp.ok) {
      console.error(`[gcs_session] save failed: ${resp.status} ${await resp.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[gcs_session] save error: ${e.message}`);
    return false;
  }
}

export function isPersistenceEnabled() {
  return readEnv() !== null;
}
