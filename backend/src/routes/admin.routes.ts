import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { client } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { unlockUser } from '../utils/lockout.js';

export const adminRouter = Router();

// Only admin and owner can access this router
adminRouter.use(requireAuth);
adminRouter.use(requireRole(['admin', 'owner']));

// -----------------------------------------------------------------------------
// GET /api/admin/overview
// -----------------------------------------------------------------------------
adminRouter.get('/overview', async (_req: Request, res: Response) => {
  const userCounts = await client`
    SELECT 
      COUNT(id)::int as total_users,
      COUNT(CASE WHEN role = 'user' THEN 1 END)::int as standard_users,
      COUNT(CASE WHEN role = 'admin' THEN 1 END)::int as admin_users,
      COUNT(CASE WHEN role = 'owner' THEN 1 END)::int as owner_users,
      COUNT(CASE WHEN is_active = false THEN 1 END)::int as suspended_users
    FROM users
  `;

  const activityStats = await client`
    SELECT 
      (SELECT COUNT(id)::int FROM study_sessions) as total_study_sessions,
      (SELECT COUNT(id)::int FROM tasks WHERE status = 'completed') as total_completed_tasks,
      (SELECT COUNT(id)::int FROM flashcards) as total_flashcards,
      (SELECT COUNT(id)::int FROM sessions WHERE expires_at > NOW() AND is_revoked = false) as active_sessions
  `;

  const recentAudit = await client`
    SELECT a.*, u.email as admin_email, u.full_name as admin_name
    FROM audit_logs a
    LEFT JOIN users u ON a.admin_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 20
  `;

  return res.json({
    users: userCounts[0],
    activity: activityStats[0],
    recentAuditLogs: recentAudit,
  });
});

// -----------------------------------------------------------------------------
// GET /api/admin/users
// -----------------------------------------------------------------------------
adminRouter.get('/users', async (_req: Request, res: Response) => {
  const users = await client`
    SELECT 
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.is_email_verified,
      u.learner_type,
      u.is_active,
      u.created_at,
      COUNT(DISTINCT s.id)::int as active_sessions_count,
      COALESCE(la.failed_count, 0)::int as failed_attempts,
      la.locked_until,
      CASE WHEN la.locked_until IS NOT NULL AND la.locked_until > NOW() THEN true ELSE false END as is_locked
    FROM users u
    LEFT JOIN sessions s ON s.user_id = u.id AND s.expires_at > NOW() AND s.is_revoked = false
    LEFT JOIN login_attempts la ON la.email = u.email
    GROUP BY u.id, la.failed_count, la.locked_until
    ORDER BY u.created_at DESC
    LIMIT 100
  `;

  return res.json({ users });
});

// -----------------------------------------------------------------------------
// PATCH /api/admin/users/:id/role (Owner only permission)
// -----------------------------------------------------------------------------
adminRouter.patch('/users/:id/role', async (req: Request, res: Response) => {
  const currentAdmin = req.user!;
  const targetUserId = req.params.id;

  // Only the OWNER can modify user roles
  if (currentAdmin.role !== 'owner') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only the platform OWNER can change user roles.',
    });
  }

  const roleSchema = z.object({
    role: z.enum(['user', 'admin']),
  });

  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid role. Must be user or admin.' });
  }

  const { role: newRole } = parsed.data;

  // Target cannot be an owner
  const targetUsers = await client`
    SELECT id, email, role FROM users WHERE id = ${targetUserId} LIMIT 1
  `;

  if (targetUsers.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUsers[0].role === 'owner') {
    return res.status(400).json({ error: 'Cannot modify the platform owner role.' });
  }

  const updatedUsers = await client`
    UPDATE users
    SET role = ${newRole}, updated_at = NOW()
    WHERE id = ${targetUserId}
    RETURNING id, email, role
  `;

  // Write audit log
  await client`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, metadata, ip_address)
    VALUES (
      ${currentAdmin.id},
      'role_change',
      'user',
      ${targetUserId},
      ${JSON.stringify({ previousRole: targetUsers[0].role, newRole })},
      ${req.ip || 'unknown'}
    )
  `;

  return res.json({
    success: true,
    message: `User role updated to ${newRole}`,
    user: updatedUsers[0],
  });
});

// -----------------------------------------------------------------------------
// PATCH /api/admin/users/:id/status (Suspend / Activate user)
// -----------------------------------------------------------------------------
adminRouter.patch('/users/:id/status', async (req: Request, res: Response) => {
  const currentAdmin = req.user!;
  const targetUserId = req.params.id;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive must be a boolean' });
  }

  const targetUsers = await client`
    SELECT id, email, role FROM users WHERE id = ${targetUserId} LIMIT 1
  `;

  if (targetUsers.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUsers[0].role === 'owner') {
    return res.status(400).json({ error: 'Cannot deactivate the owner account.' });
  }

  await client`
    UPDATE users
    SET is_active = ${isActive}, updated_at = NOW()
    WHERE id = ${targetUserId}
  `;

  // If deactivated, revoke all their active sessions
  if (!isActive) {
    await client`
      UPDATE sessions
      SET is_revoked = true
      WHERE user_id = ${targetUserId}
    `;
  }

  // Audit log
  await client`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, metadata, ip_address)
    VALUES (
      ${currentAdmin.id},
      ${isActive ? 'user_activate' : 'user_suspend'},
      'user',
      ${targetUserId},
      ${JSON.stringify({ targetEmail: targetUsers[0].email, newStatus: isActive })},
      ${req.ip || 'unknown'}
    )
  `;

  return res.json({ success: true, message: `User status updated.` });
});

// -----------------------------------------------------------------------------
// GET /api/admin/audit-logs
// -----------------------------------------------------------------------------
adminRouter.get('/audit-logs', async (_req: Request, res: Response) => {
  const logs = await client`
    SELECT a.*, u.email as admin_email, u.full_name as admin_name
    FROM audit_logs a
    LEFT JOIN users u ON a.admin_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 100
  `;
  return res.json({ logs });
});

// -----------------------------------------------------------------------------
// POST /api/admin/users/:id/unlock (Unlock locked out student/admin account)
// -----------------------------------------------------------------------------
adminRouter.post('/users/:id/unlock', async (req: Request, res: Response) => {
  const currentAdmin = req.user!;
  const targetUserId = req.params.id;

  const targetUsers = await client`
    SELECT id, email, full_name FROM users WHERE id = ${targetUserId} LIMIT 1
  `;

  if (targetUsers.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const targetUser = targetUsers[0];

  // Atomically unlock account in PostgreSQL
  await unlockUser(targetUser.email);

  // Write audit log
  await client`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, metadata, ip_address)
    VALUES (
      ${currentAdmin.id},
      'lockout_cleared_by_admin',
      'user',
      ${targetUserId},
      ${JSON.stringify({ targetEmail: targetUser.email, unlockedByRole: currentAdmin.role })},
      ${req.ip || 'unknown'}
    )
  `;

  return res.json({
    success: true,
    message: `Account lockout cleared for ${targetUser.email}.`,
  });
});

// -----------------------------------------------------------------------------
// GET /api/admin/system-health (Neon PostgreSQL Telemetry & System Diagnostics)
// -----------------------------------------------------------------------------
adminRouter.get('/system-health', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const dbTest = await client`
      SELECT 
        current_database() as database_name,
        NOW() as server_time,
        version() as pg_version,
        pg_database_size(current_database()) as db_bytes
    `;
    const latencyMs = Date.now() - startTime;

    const tableCounts = await client`
      SELECT 
        (SELECT COUNT(*)::int FROM users) as total_users,
        (SELECT COUNT(*)::int FROM subjects) as total_subjects,
        (SELECT COUNT(*)::int FROM tasks) as total_tasks,
        (SELECT COUNT(*)::int FROM flashcards) as total_flashcards,
        (SELECT COUNT(*)::int FROM study_sessions) as total_study_sessions,
        (SELECT COUNT(*)::int FROM audit_logs) as total_audit_logs,
        (SELECT COUNT(*)::int FROM login_attempts WHERE locked_until > NOW()) as active_lockouts
    `;

    return res.json({
      status: 'healthy',
      connected: true,
      latencyMs,
      database: {
        name: dbTest[0]?.database_name,
        serverTime: dbTest[0]?.server_time,
        version: dbTest[0]?.pg_version,
        sizePretty: `${(Number(dbTest[0]?.db_bytes || 0) / (1024 * 1024)).toFixed(2)} MB`,
        provider: 'Neon Serverless PostgreSQL (AWS us-east-2)',
      },
      counts: tableCounts[0],
      serverUptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'unhealthy',
      connected: false,
      error: err.message || String(err),
    });
  }
});
