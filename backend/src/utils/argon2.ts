import { hash, verify } from '@node-rs/argon2';

// Recommended OWASP settings for Argon2id
// Memory cost: 19456 KiB (~19MB), Time cost: 2 iterations, Parallelism: 1
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Hashes a plaintext password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id hash
 */
export async function verifyPassword(hashString: string, password: string): Promise<boolean> {
  try {
    return await verify(hashString, password);
  } catch (err) {
    console.error('Argon2 verification error:', err);
    return false;
  }
}
