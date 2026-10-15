import { Request, Response, NextFunction } from 'express';
import { client } from '../db/index.js';
import { hashToken } from '../utils/token.js';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin' | 'owner';
  isEmailVerified: boolean;
  learnerType: string;
  dailyGoalMinutes: number;
}

export interface SessionData {
  id: string;
  userId: string;
  expiresAt: Date;
}

// Extend Express Request object to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: SessionData;
    }
  }
}

export const SESSION_COOKIE_NAME = 'ssp_session';

/**
 * Middleware that authenticates incoming requests using the secure HttpOnly session cookie
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];

    if (!rawToken || typeof rawToken !== 'string') {
      return next();
    }

    const tokenHash = hashToken(rawToken);

    // Look up session in PostgreSQL joined with users table
    const rows = await client`
      SELECT 
        s.id as session_id,
        s.user_id,
        s.expires_at,
        s.is_revoked,
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.is_email_verified,
        u.learner_type,
        u.daily_goal_minutes,
        u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token_hash = ${tokenHash}
        AND s.is_revoked = false
        AND s.expires_at > NOW()
        AND u.is_active = true
      LIMIT 1
    `;

    if (rows && rows.length > 0) {
      const row = rows[0];
      req.session = {
        id: row.session_id,
        userId: row.user_id,
        expiresAt: new Date(row.expires_at),
      };
      req.user = {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role as 'user' | 'admin' | 'owner',
        isEmailVerified: row.is_email_verified,
        learnerType: row.learner_type,
        dailyGoalMinutes: row.daily_goal_minutes,
      };
    }

    return next();
  } catch (error) {
    console.error('Session authentication error:', error);
    return next();
  }
}

/**
 * Guard middleware requiring authenticated user
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource.',
    });
  }
  return next();
}

/**
 * Guard middleware requiring specific role(s), e.g. admin or owner
 */
export function requireRole(allowedRoles: ('user' | 'admin' | 'owner')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have the required permissions to access this area.',
      });
    }

    return next();
  };
}

/**
 * Guard middleware requiring email verification
 */
export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      error: 'EmailNotVerified',
      message: 'Please verify your email address to perform this action.',
    });
  }

  return next();
}
