import React, { useState, useEffect } from 'react';
import { User, AuditLog } from '../types';
import { adminApi } from '../api';
import {
  Shield,
  Users,
  Activity,
  AlertTriangle,
  FileText,
  UserCheck,
  UserX,
  Crown,
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const isOwner = currentUser.role === 'owner';

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [ovRes, uRes, aRes] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getUsers(),
        adminApi.getAuditLogs(),
      ]);
      setOverview(ovRes);
      setUsersList(uRes.users);
      setAuditLogs(aRes.logs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      setActionMsg(`User role updated to ${newRole}`);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, !currentStatus);
      setActionMsg(`User status updated to ${!currentStatus ? 'Active' : 'Suspended'}`);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-sm text-slate-400">Loading admin dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20 mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Protected Area • {currentUser.role.toUpperCase()} ACCESS</span>
          </div>
          <h2 className="text-xl font-bold text-white">Platform Administration</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage registered accounts, enforce security controls, and inspect system audit logs.
          </p>
        </div>

        {actionMsg && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            {actionMsg}
          </div>
        )}
      </div>

      {/* Top 4 Admin Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">Total Users</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{overview?.users?.total_users || 0}</p>
          <span className="text-xs text-slate-400 mt-1 block">
            {overview?.users?.standard_users || 0} students, {overview?.users?.admin_users || 0} admins
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center space-x-2 text-emerald-400 mb-2">
            <Activity className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">Active Sessions</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{overview?.activity?.active_sessions || 0}</p>
          <span className="text-xs text-slate-400 mt-1 block">Opaque 256-bit token hashes</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <Crown className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">Owner Status</span>
          </div>
          <p className="text-2xl font-extrabold text-white">
            {overview?.users?.owner_users > 0 ? 'Bootstrapped' : 'Pending'}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Audited CLI Seed</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center space-x-2 text-red-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">Suspended</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{overview?.users?.suspended_users || 0}</p>
          <span className="text-xs text-slate-400 mt-1 block">Accounts locked / disabled</span>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* USER MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Learner Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {usersList.map((u) => {
                  const isTargetOwner = u.role === 'owner';
                  const isActive = u.is_active;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-200">{u.full_name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            u.role === 'owner'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : u.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="p-4 text-slate-300 capitalize">
                        {u.learner_type?.replace('_', ' ')}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td className="p-4 text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {/* Only the OWNER can modify roles */}
                        {isOwner && !isTargetOwner && (
                          <button
                            onClick={() =>
                              handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')
                            }
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-950 border border-slate-800 text-purple-400 hover:text-purple-300 hover:border-slate-700"
                          >
                            {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                          </button>
                        )}

                        {/* Suspension toggle (cannot suspend owner) */}
                        {!isTargetOwner && (
                          <button
                            onClick={() => handleStatusToggle(u.id, isActive)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isActive
                                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={isActive ? 'Suspend User' : 'Activate User'}
                          >
                            {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">Action</th>
                  <th className="p-4">Admin / Initiator</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-bold text-indigo-400">{log.action}</td>
                    <td className="p-4 text-slate-300 font-sans">
                      {log.admin_email || 'System / CLI'}
                    </td>
                    <td className="p-4 text-slate-400">
                      {log.target_type}: {log.target_id || 'system'}
                    </td>
                    <td className="p-4 text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                    <td className="p-4 text-slate-400 font-sans">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
