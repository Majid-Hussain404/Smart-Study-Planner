import crypto from 'crypto';

/**
 * Generates an opaque cryptographically secure 256-bit hex token
 * and returns both the raw token (sent to user/browser) and its SHA-256 hash (saved in DB).
 */
export function generateOpaqueToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Computes the SHA-256 hash of a raw token
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
