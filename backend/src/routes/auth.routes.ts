import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { client } from '../db/index.js';
import { hashPassword, verifyPassword } from '../utils/argon2.js';
import { generateOpaqueToken, hashToken } from '../utils/token.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/mailer.js';
import { checkLockout, recordFailedAttempt, recordSuccessfulLogin } from '../utils/lockout.js';
import { authenticate, SESSION_COOKIE_NAME } from '../middleware/auth.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

// Zod schemas for request validation
const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(255),
  learnerType: z
    .enum([
      'school',
      'university',
      'competitive_exam',
      'certification',
      'language',
      'self_directed',
    ])
    .default('self_directed'),
  studyGoal: z.string().max(1000).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Invalid token format'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid token format'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

// Cookie options
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
});

// -----------------------------------------------------------------------------
// POST /api/auth/signup
// -----------------------------------------------------------------------------
authRouter.post('/signup', authRateLimiter, async (req: Request, res: Response) => {
  const parseResult = signupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'ValidationError',
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { email, password, fullName, learnerType, studyGoal } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if email is already registered
    const existing = await client`
      SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return res.status(409).json({
        error: 'EmailAlreadyInUse',
        message: 'An account with this email address already exists.',
      });
    }

    // Secure password hashing with Argon2id
    const passwordHash = await hashPassword(password);

    // Insert user into PostgreSQL (ALWAYS default role to 'user')
    const insertedUsers = await client`
      INSERT INTO users (
        email,
        password_hash,
        full_name,
        role,
        is_email_verified,
        learner_type,
        study_goal
      )
      VALUES (
        ${normalizedEmail},
        ${passwordHash},
        ${fullName.trim()},
        'user',
        false,
        ${learnerType},
        ${studyGoal || null}
      )
      RETURNING id, email, full_name, role, learner_type
    `;

    const newUser = insertedUsers[0];

    // Generate email verification token (store hash in DB, send raw token in email)
    const { rawToken, tokenHash } = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await client`
      INSERT INTO auth_tokens (token_hash, user_id, type, expires_at)
      VALUES (${tokenHash}, ${newUser.id}, 'email_verification', ${expiresAt.toISOString()})
    `;

    // Send verification email
    await sendVerificationEmail(newUser.email, rawToken);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! We sent a verification link to your email.',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        learnerType: newUser.learner_type,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create account. Please try again.',
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/login (With 5-Attempts / 30-Seconds Lockout Rule)
// -----------------------------------------------------------------------------
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'ValidationError',
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { email, password } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  try {
    // 1. Check if the account is currently locked out
    const lockout = await checkLockout(normalizedEmail);
    if (lockout.isLocked) {
      return res.status(423).json({
        error: 'AccountLocked',
        message: `Too many consecutive failed login attempts. This account is locked for ${lockout.remainingSeconds} seconds.`,
        remainingSeconds: lockout.remainingSeconds,
        lockedUntil: lockout.lockedUntil?.toISOString(),
      });
    }

    // 2. Fetch user record from PostgreSQL
    const users = await client`
      SELECT id, email, password_hash, full_name, role, is_email_verified, learner_type, daily_goal_minutes, is_active
      FROM users
      WHERE email = ${normalizedEmail}
      LIMIT 1
    `;

    const user = users[0];

    // 3. User not found (perform dummy comparison to protect against timing attacks)
    if (!user || !user.is_active) {
      const failed = await recordFailedAttempt(normalizedEmail, clientIp);
      if (failed.isLocked) {
        return res.status(423).json({
          error: 'AccountLocked',
          message: `Too many failed attempts. Account locked for ${failed.remainingSeconds} seconds.`,
          remainingSeconds: failed.remainingSeconds,
          lockedUntil: failed.lockedUntil?.toISOString(),
        });
      }
      return res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Invalid email or password.',
        attemptsRemaining: Math.max(0, 5 - failed.failedCount),
      });
    }

    // 4. Verify password with Argon2id
    const isPasswordValid = await verifyPassword(user.password_hash, password);

    if (!isPasswordValid) {
      const failed = await recordFailedAttempt(normalizedEmail, clientIp);
      if (failed.isLocked) {
        return res.status(423).json({
          error: 'AccountLocked',
          message: `Account locked for 30 seconds due to 5 consecutive failed login attempts.`,
          remainingSeconds: failed.remainingSeconds,
          lockedUntil: failed.lockedUntil?.toISOString(),
        });
      }
      return res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Invalid email or password.',
        attemptsRemaining: Math.max(0, 5 - failed.failedCount),
      });
    }

    // 5. Successful login: reset failed attempt counter and lockout state
    await recordSuccessfulLogin(normalizedEmail);

    // 6. Create opaque server-managed session
    const { rawToken, tokenHash } = generateOpaqueToken();
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const userAgent = req.headers['user-agent'] || null;

    await client`
      INSERT INTO sessions (
        session_token_hash,
        user_id,
        expires_at,
        ip_address,
        user_agent
      )
      VALUES (
        ${tokenHash},
        ${user.id},
        ${sessionExpiresAt.toISOString()},
        ${clientIp},
        ${userAgent}
      )
    `;

    // 7. Set secure HttpOnly cookie
    res.cookie(SESSION_COOKIE_NAME, rawToken, getCookieOptions());

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isEmailVerified: user.is_email_verified,
        learnerType: user.learner_type,
        dailyGoalMinutes: user.daily_goal_minutes,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to process login.',
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/logout
// -----------------------------------------------------------------------------
authRouter.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await client`
        UPDATE sessions
        SET is_revoked = true
        WHERE session_token_hash = ${tokenHash}
      `;
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.json({ success: true });
  }
});

// -----------------------------------------------------------------------------
// GET /api/auth/me (Current Session Status)
// -----------------------------------------------------------------------------
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.json({
      authenticated: false,
      user: null,
    });
  }

  return res.json({
    authenticated: true,
    user: req.user,
  });
});

// -----------------------------------------------------------------------------
// POST /api/auth/verify-email
// -----------------------------------------------------------------------------
authRouter.post('/verify-email', async (req: Request, res: Response) => {
  const parseResult = verifyEmailSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid token format' });
  }

  const { token } = parseResult.data;
  const tokenHash = hashToken(token);

  try {
    // Find active unexpired token
    const tokenRows = await client`
      SELECT id, user_id, expires_at, used_at
      FROM auth_tokens
      WHERE token_hash = ${tokenHash}
        AND type = 'email_verification'
      LIMIT 1
    `;

    if (!tokenRows || tokenRows.length === 0) {
      return res.status(400).json({
        error: 'InvalidToken',
        message: 'Verification token is invalid or has already been used.',
      });
    }

    const authTok = tokenRows[0];

    if (authTok.used_at) {
      return res.status(400).json({
        error: 'TokenAlreadyUsed',
        message: 'This email verification link was already used. Please log in.',
      });
    }

    if (new Date(authTok.expires_at).getTime() < Date.now()) {
      return res.status(400).json({
        error: 'TokenExpired',
        message: 'Verification link has expired. Please request a new one.',
      });
    }

    // Mark user email verified and token used
    await client`
      UPDATE users
      SET is_email_verified = true, email_verified_at = NOW(), updated_at = NOW()
      WHERE id = ${authTok.user_id}
    `;

    await client`
      UPDATE auth_tokens
      SET used_at = NOW()
      WHERE id = ${authTok.id}
    `;

    return res.json({
      success: true,
      message: 'Your email has been successfully verified! You can now access all features.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to verify email.',
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/forgot-password
// -----------------------------------------------------------------------------
authRouter.post(
  '/forgot-password',
  passwordResetRateLimiter,
  async (req: Request, res: Response) => {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const { email } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const users = await client`
        SELECT id, email FROM users WHERE email = ${normalizedEmail} AND is_active = true LIMIT 1
      `;

      if (users && users.length > 0) {
        const user = users[0];
        const { rawToken, tokenHash } = generateOpaqueToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Invalidate older password reset tokens
        await client`
          UPDATE auth_tokens
          SET used_at = NOW()
          WHERE user_id = ${user.id} AND type = 'password_reset' AND used_at IS NULL
        `;

        await client`
          INSERT INTO auth_tokens (token_hash, user_id, type, expires_at)
          VALUES (${tokenHash}, ${user.id}, 'password_reset', ${expiresAt.toISOString()})
        `;

        await sendPasswordResetEmail(user.email, rawToken);
      }

      // Consistent message to prevent account enumeration
      return res.json({
        success: true,
        message: 'If an account exists with that email address, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to process request.',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// POST /api/auth/reset-password
// -----------------------------------------------------------------------------
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const parseResult = resetPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'ValidationError',
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { token, newPassword } = parseResult.data;
  const tokenHash = hashToken(token);

  try {
    const tokenRows = await client`
      SELECT id, user_id, expires_at, used_at
      FROM auth_tokens
      WHERE token_hash = ${tokenHash} AND type = 'password_reset'
      LIMIT 1
    `;

    if (!tokenRows || tokenRows.length === 0) {
      return res.status(400).json({
        error: 'InvalidToken',
        message: 'Password reset link is invalid or expired.',
      });
    }

    const authTok = tokenRows[0];

    if (authTok.used_at || new Date(authTok.expires_at).getTime() < Date.now()) {
      return res.status(400).json({
        error: 'InvalidToken',
        message: 'This reset link has expired or has already been used.',
      });
    }

    // Hash new password using Argon2id
    const newPasswordHash = await hashPassword(newPassword);

    // Update password in PostgreSQL
    await client`
      UPDATE users
      SET password_hash = ${newPasswordHash}, updated_at = NOW()
      WHERE id = ${authTok.user_id}
    `;

    // Mark token as used
    await client`
      UPDATE auth_tokens
      SET used_at = NOW()
      WHERE id = ${authTok.id}
    `;

    // Revoke all existing sessions for this user for security
    await client`
      UPDATE sessions
      SET is_revoked = true
      WHERE user_id = ${authTok.user_id}
    `;

    return res.json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to reset password.',
    });
  }
});
