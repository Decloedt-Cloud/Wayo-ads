import { createHmac, randomBytes, createHash, timingSafeEqual as cryptoTimingSafeEqual } from 'crypto';

const HMAC_ALGORITHM = 'sha256';

function getSigningKey(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for OAuth state signing');
  return secret;
}

// ─── Signed State (anti-CSRF) ───────────────────────────────────────────────

export interface OAuthStatePayload {
  userId: string;
  timestamp: number;
}

/**
 * Creates an HMAC-signed state string.
 * Format: base64(payload).hmac_signature
 */
export function createSignedState(payload: OAuthStatePayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac(HMAC_ALGORITHM, getSigningKey()).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies HMAC signature and returns the decoded payload.
 * Throws on invalid/expired state.
 */
export function verifySignedState(signedState: string, maxAgeMs = 10 * 60 * 1000): OAuthStatePayload {
  const dotIndex = signedState.indexOf('.');
  if (dotIndex === -1) throw new Error('Invalid state format');

  const data = signedState.slice(0, dotIndex);
  const providedSig = signedState.slice(dotIndex + 1);

  const expectedSig = createHmac(HMAC_ALGORITHM, getSigningKey()).update(data).digest('base64url');

  if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
    throw new Error('Invalid state signature');
  }

  const payload: OAuthStatePayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));

  if (Date.now() - payload.timestamp > maxAgeMs) {
    throw new Error('State expired');
  }

  return payload;
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return cryptoTimingSafeEqual(bufA, bufB);
}

// ─── PKCE (RFC 7636) ────────────────────────────────────────────────────────

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * Generates a PKCE code_verifier (43-128 chars, URL-safe) and
 * its SHA-256 code_challenge.
 */
export function generatePKCE(): PKCEChallenge {
  const codeVerifier = randomBytes(32).toString('base64url');

  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge, codeChallengeMethod: 'S256' };
}

// ─── Cookie helpers for PKCE verifier ────────────────────────────────────────

export const PKCE_COOKIE_NAME = '__yt_oauth_pkce';
export const PKCE_COOKIE_MAX_AGE = 600; // 10 minutes
