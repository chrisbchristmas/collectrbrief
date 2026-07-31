// utils/token.js — HMAC-signed magic-link tokens for passwordless preference access
// Token = hex HMAC-SHA256 of subscriber id, keyed by MAGIC_LINK_SECRET (falls back to ADMIN_KEY).
// Tokens are permanent per subscriber (email footer permalinks). Rotating the secret invalidates all links.

import crypto from 'crypto';

function secret() {
  const s = process.env.MAGIC_LINK_SECRET || process.env.ADMIN_KEY;
  if (!s) throw new Error('MAGIC_LINK_SECRET or ADMIN_KEY must be set for magic links');
  return s;
}

export function signToken(subscriberId) {
  return crypto.createHmac('sha256', secret()).update(String(subscriberId)).digest('hex').slice(0, 32);
}

export function verifyToken(subscriberId, token) {
  if (!token || typeof token !== 'string') return false;
  const expected = signToken(subscriberId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false; // length mismatch
  }
}
