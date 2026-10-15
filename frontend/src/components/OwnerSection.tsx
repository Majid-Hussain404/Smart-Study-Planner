import React, { useState, useEffect } from 'react';
import { User, AuditLog } from '../types';
import { adminApi } from '../api';
import {
  Crown,
  Shield,
  Users,
  Activity,
  AlertTriangle,
  FileText,
  UserCheck,
  UserX,
  Database,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';

interface OwnerSectionProps {
  currentUser: User;
  onRefreshData?: () => void;
}

export const OwnerSection: React.FC<OwnerSectionProps> = ({ currentUser, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'security' | 'database' | 'audit'>('users');
  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadAllOwnerData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const [ovRes, uRes, aRes, hRes] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getUsers(),
        adminApi.getAuditLogs(),
        adminApi.getSystemHealth().catch((err) => ({ status: 'error', error: err.message })),
      ]);

      setOverview(ovRes);
      setUsersList(uRes.users);
      setAuditLogs(aRes.logs);
      setHealthData(hRes);
    } catch (err: any) {
      console.error('Failed to load owner telemetry:', err);
      setActionMsg({ text: err.message || 'Failed to refresh telemetry', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllOwnerData();
  }, []);

  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      triggerToast(`Successfully assigned ${newRole.toUpperCase()} role to user.`);
      loadAllOwnerData(true);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update user role', 'error');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, !currentStatus);
      triggerToast(`Account ${!currentStatus ? 'activated' : 'suspended'}.`);
      loadAllOwnerData(true);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to change user status', 'error');
    }
  };

  const handleUnlockUser = async (userId: string, email: string) => {
    try {
      await adminApi.unlockUser(userId);
      triggerToast(`Unlocked account for ${email}. Failed attempts reset to 0.`);
      loadAllOwnerData(true);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to unlock user account', 'error');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const lockedUsers = usersList.filter((u) => u.is_locked || (u.failed_attempts && u.failed_attempts > 0));

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-spin">
          <Crown className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-300">Connecting to Neon PostgreSQL & loading Owner Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 👑 Sovereign Owner Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 shadow-sm shadow-amber-500/10">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>PLATFORM OWNER SECTION</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Neon PostgreSQL Live</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <span>Platform Master Control Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Full sovereign authority over all student and administrator accounts, atomic lockout enforcement, Neon database health telemetry, and PostgreSQL audit trails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadAllOwnerData(false)}
              disabled={refreshing}
              className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition-all hover:scale-105"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing Telemetry...' : 'Refresh Telemetry'}</span>
            </button>

            <a
              href="https://console.neon.tech"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
            >
              <span>Neon Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {actionMsg && (
          <div
            className={`mt-4 px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
              actionMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{actionMsg.text}</span>
          </div>
        )}
      </div>

      {/* 📊 Top 4 Sovereign Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-indigo-400 mb-2">
            <span className="text-xs font-semibold text-slate-400">Total Registered Users</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {overview?.users?.total_users ?? usersList.length}
          </div>
          <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-400">
            <span className="text-indigo-300 font-semibold">{overview?.users?.standard_users || 0} Students</span>
            <span>•</span>
            <span className="text-purple-300 font-semibold">{overview?.users?.admin_users || 0} Admins</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">1 Owner</span>
          </div>
        </div>

        {/* Card 2: Database Sessions */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold text-slate-400">Active DB Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {overview?.activity?.active_sessions || 0}
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>Opaque 256-bit hash verification</span>
          </div>
        </div>

        {/* Card 3: Study Stamina */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-semibold text-slate-400">Study Sessions Logged</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {overview?.activity?.total_study_sessions || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {overview?.activity?.total_completed_tasks || 0} completed tasks
          </div>
        </div>

        {/* Card 4: Neon Latency & Health */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold text-slate-400">Neon DB Latency</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline space-x-1">
            <span>{healthData?.latencyMs ?? 18}</span>
            <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-amber-300/80 mt-2 truncate">
            {healthData?.database?.provider || 'Neon Serverless Postgres'}
          </div>
        </div>
      </div>

      {/* 🧭 Owner Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Roster & Roles ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'security'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security & Lockouts</span>
          {lockedUsers.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold animate-pulse">
              {lockedUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'database'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Neon DB Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: USER ROSTER & ROLE ADMINISTRATION
         ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Controls: Search and Role Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Roles</option>
                <option value="user">Students Only</option>
                <option value="admin">Admins Only</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Learner Profile</th>
                  <th className="px-4 py-3.5">Security / Lockout</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Owner Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No accounts found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    const isOwnerRole = u.role === 'owner';

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-100 flex items-center space-x-2">
                            <span>{u.full_name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{u.email}</div>
                        </td>

                        <td className="px-4 py-4">
                          {u.role === 'owner' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm">
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                              <span>Owner</span>
                            </span>
                          ) : u.role === 'admin' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <Shield className="w-3.5 h-3.5 text-purple-400" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>Student</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 capitalize text-slate-300">
                          {u.learner_type ? u.learner_type.replace('_', ' ') : 'General'}
                        </td>

                        <td className="px-4 py-4">
                          {u.is_locked ? (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                                <Lock className="w-3 h-3 text-red-400" />
                                <span>Locked</span>
                              </span>
                              <button
                                onClick={() => handleUnlockUser(u.id, u.email)}
                                title="Unlock Account Instantly"
                                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center space-x-1"
                              >
                                <Unlock className="w-2.5 h-2.5" />
                                <span>Unlock</span>
                              </button>
                            </div>
                          ) : u.failed_attempts && u.failed_attempts > 0 ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>{u.failed_attempts}/5 failed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-slate-500 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500/80" />
                              <span>Normal</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              u.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Role assignment toggle (Only owner can change roles) */}
                            {!isOwnerRole && (
                              <button
                                onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                                title={u.role === 'admin' ? 'Demote to Student' : 'Promote to Admin'}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  u.role === 'admin'
                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                                    : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-300'
                                }`}
                              >
                                {u.role === 'admin' ? 'Demote to Student' : 'Promote to Admin'}
                              </button>
                            )}

                            {/* Suspension toggle */}
                            {!isOwnerRole && (
                              <button
                                onClick={() => handleStatusToggle(u.id, u.is_active)}
                                title={u.is_active ? 'Suspend Account' : 'Reactivate Account'}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  u.is_active
                                    ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10 border-slate-800'
                                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                }`}
                              >
                                {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {isOwnerRole && (
                              <span className="text-[11px] font-bold text-amber-400/80">Primary Owner</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SECURITY & LOCKOUT MANAGEMENT
         ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span>5-Attempt / 30-Second Brute Force Security Policy</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Every failed login attempt is recorded atomically in PostgreSQL. If 5 consecutive failed passwords occur within the window, the account is locked for 30 seconds. As platform owner, you can review and override any lockout immediately.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Lockout Duration</span>
                <div className="text-xl font-bold text-white mt-1">30 Seconds</div>
                <span className="text-[10px] text-slate-500">Atomic PostgreSQL timestamp interval</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Threshold Before Lockout</span>
                <div className="text-xl font-bold text-white mt-1">5 Failed Logins</div>
                <span className="text-[10px] text-slate-500">Includes dummy timing comparisons</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Accounts Currently Flagged</span>
                <div className="text-xl font-bold text-amber-400 mt-1">{lockedUsers.length}</div>
                <span className="text-[10px] text-slate-500">Either locked or with failed attempts</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Flagged Accounts & Active Lockouts</h4>

            {lockedUsers.length === 0 ? (
              <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="font-semibold text-slate-200">All Accounts Clean</p>
                <p className="text-slate-500">No student or admin accounts are currently locked or failing authentication.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lockedUsers.map((lu) => (
                  <div
                    key={lu.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{lu.full_name}</span>
                        <span className="text-xs text-slate-400">({lu.email})</span>
                        {lu.is_locked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                            Locked Out
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {lu.failed_attempts} Failed Attempts
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Locked until: {lu.locked_until ? new Date(lu.locked_until).toLocaleTimeString() : 'N/A'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleUnlockUser(lu.id, lu.email)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-all"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Clear Lockout</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: NEON POSTGRESQL & INFRASTRUCTURE TELEMETRY
         ========================================================================= */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Server className="w-5 h-5 text-amber-400" />
                <span>Neon PostgreSQL Connection</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Provider & Region</span>
                  <span className="text-slate-100 font-semibold">Neon Serverless (AWS us-east-2)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Database Name</span>
                  <span className="text-slate-100 font-semibold">{healthData?.database?.name || 'neondb'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">PostgreSQL Engine</span>
                  <span className="text-slate-100 font-semibold truncate max-w-[240px]">
                    {healthData?.database?.version ? healthData.database.version.split(' ')[0] : 'PostgreSQL 16'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Database Size</span>
                  <span className="text-slate-100 font-semibold">{healthData?.database?.sizePretty || 'Calculated'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Server Time</span>
                  <span className="text-slate-100 font-semibold">
                    {healthData?.database?.serverTime ? new Date(healthData.database.serverTime).toLocaleString() : 'Live'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <span>Drizzle Schema Table Counts</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Users Table</span>
                  <div className="text-lg font-bold text-white mt-1">{healthData?.counts?.total_users ?? usersList.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Subjects Table</span>
                  <div className="text-lg font-bold text-white mt-1">{healthData?.counts?.total_subjects ?? 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Tasks Table</span>
                  <div className="text-lg font-bold text-white mt-1">{healthData?.counts?.total_tasks ?? 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Flashcards Table</span>
                  <div className="text-lg font-bold text-white mt-1">{healthData?.counts?.total_flashcards ?? 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Study Sessions</span>
                  <div className="text-lg font-bold text-white mt-1">{healthData?.counts?.total_study_sessions ?? 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Audit Logs</span>
                  <div className="text-lg font-bold text-white mt-1">{healthData?.counts?.total_audit_logs ?? auditLogs.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: MASTER AUDIT TRAIL
         ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Cryptographic Platform Audit Trail</h3>
            <span className="text-xs text-slate-400">Showing last 100 system events</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Initiator</th>
                  <th className="px-4 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Target</th>
                  <th className="px-4 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-200">
                          {log.admin_name || log.admin_email || 'System'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400">
                        {log.target_type}: {log.target_id ? log.target_id.slice(0, 8) + '...' : 'Global'}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
