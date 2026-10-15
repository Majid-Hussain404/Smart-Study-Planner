import { client } from '../db/index.js';

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  lockedUntil: Date | null;
  failedCount: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 30;

/**
 * Checks whether an account is currently locked out
 */
export async function checkLockout(email: string): Promise<LockoutStatus> {
  const normalizedEmail = email.toLowerCase().trim();

  const rows = await client`
    SELECT failed_count, locked_until
    FROM login_attempts
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    return { isLocked: false, remainingSeconds: 0, lockedUntil: null, failedCount: 0 };
  }

  const { failed_count, locked_until } = rows[0];

  if (locked_until) {
    const lockedUntilDate = new Date(locked_until);
    const now = Date.now();
    const remainingMs = lockedUntilDate.getTime() - now;

    if (remainingMs > 0) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        lockedUntil: lockedUntilDate,
        failedCount: failed_count,
      };
    } else {
      // Lockout window has expired: atomically clear the lock and reset the counter
      await client`
        UPDATE login_attempts
        SET failed_count = 0, locked_until = NULL, updated_at = NOW()
        WHERE email = ${normalizedEmail}
      `;
      return { isLocked: false, remainingSeconds: 0, lockedUntil: null, failedCount: 0 };
    }
  }

  return { isLocked: false, remainingSeconds: 0, lockedUntil: null, failedCount: failed_count };
}

/**
 * Atomically records a failed password attempt in PostgreSQL.
 * If 5 consecutive failed attempts are reached, locks the account for 30 seconds.
 */
export async function recordFailedAttempt(
  email: string,
  ipAddress: string
): Promise<LockoutStatus> {
  const normalizedEmail = email.toLowerCase().trim();

  // Atomic PostgreSQL UPSERT to prevent concurrency race conditions
  const result = await client`
    INSERT INTO login_attempts (
      email,
      failed_count,
      last_failed_at,
      last_ip,
      updated_at
    )
    VALUES (
      ${normalizedEmail},
      1,
      NOW(),
      ${ipAddress},
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      failed_count = CASE
        -- If previous lockout has expired, restart counter at 1
        WHEN login_attempts.locked_until IS NOT NULL AND login_attempts.locked_until <= NOW() THEN 1
        ELSE login_attempts.failed_count + 1
      END,
      locked_until = CASE
        -- If adding this failure reaches or exceeds 5 attempts, lock for 30 seconds
        WHEN (
          CASE
            WHEN login_attempts.locked_until IS NOT NULL AND login_attempts.locked_until <= NOW() THEN 1
            ELSE login_attempts.failed_count + 1
          END
        ) >= ${MAX_FAILED_ATTEMPTS} THEN NOW() + (${LOCKOUT_DURATION_SECONDS} || ' seconds')::interval
        ELSE NULL
      END,
      last_failed_at = NOW(),
      last_ip = ${ipAddress},
      updated_at = NOW()
    RETURNING failed_count, locked_until
  `;

  const row = result[0];
  const lockedUntil = row.locked_until ? new Date(row.locked_until) : null;
  const isLocked = Boolean(lockedUntil && lockedUntil.getTime() > Date.now());
  const remainingSeconds = isLocked
    ? Math.ceil((lockedUntil!.getTime() - Date.now()) / 1000)
    : 0;

  return {
    isLocked,
    remainingSeconds,
    lockedUntil,
    failedCount: row.failed_count,
  };
}

/**
 * Resets failed attempt counter upon successful login
 */
export async function recordSuccessfulLogin(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  await client`
    UPDATE login_attempts
    SET failed_count = 0, locked_until = NULL, updated_at = NOW()
    WHERE email = ${normalizedEmail}
  `;
}

/**
 * Manually unlocks an account and clears failed attempt history (Owner/Admin action)
 */
export async function unlockUser(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  await client`
    UPDATE login_attempts
    SET failed_count = 0, locked_until = NULL, updated_at = NOW()
    WHERE email = ${normalizedEmail}
  `;
}
