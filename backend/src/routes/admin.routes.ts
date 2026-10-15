import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { client } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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
      COUNT(DISTINCT s.id)::int as active_sessions_count
    FROM users u
    LEFT JOIN sessions s ON s.user_id = u.id AND s.expires_at > NOW() AND s.is_revoked = false
    GROUP BY u.id
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
