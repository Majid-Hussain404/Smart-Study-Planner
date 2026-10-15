import React from 'react';
import { User } from '../types';
import {
  BookOpen,
  CheckSquare,
  Layers,
  HelpCircle,
  FileText,
  BarChart2,
  Shield,
  Crown,
  LogOut,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenOwnerAuth?: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenOwnerAuth,
  onLogout,
}) => {
  const learnerLabels: Record<string, string> = {
    school: '🎒 School',
    university: '🎓 University',
    competitive_exam: '🏆 Competitive',
    certification: '📜 Certification',
    language: '🌐 Language',
    self_directed: '💡 Self-Directed',
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  if (user) {
    if (user.role === 'owner') {
      navItems.push({ id: 'owner', label: '👑 Owner Section', icon: Crown });
    } else if (user.role === 'admin') {
      navItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield });
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Smart Study Planner
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Neon DB
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isOwnerTab = item.id === 'owner';
                const isAdminTab = item.id === 'admin';
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? isOwnerTab
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                          : isAdminTab
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                          : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                        : isOwnerTab
                        ? 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isOwnerTab ? 'text-amber-400' : ''}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-medium text-slate-200">{user.fullName}</span>
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="text-xs text-indigo-400">
                      {learnerLabels[user.learnerType] || 'Student'}
                    </span>
                    {user.role === 'owner' && (
                      <span className="px-1.5 py-0.2 text-[10px] uppercase font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center space-x-1">
                        <Crown className="w-2.5 h-2.5" />
                        <span>Owner</span>
                      </span>
                    )}
                    {user.role === 'admin' && (
                      <span className="px-1.5 py-0.2 text-[10px] uppercase font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        Admin
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenOwnerAuth || onOpenAuth}
                  className="hidden sm:flex items-center space-x-1 px-3 py-2 rounded-lg border border-amber-500/30 hover:border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs transition-all hover:scale-105 shadow-sm shadow-amber-500/10"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>👑 Owner Portal</span>
                </button>

                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                >
                  Sign In / Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        {user && (
          <div className="md:hidden flex overflow-x-auto py-2 space-x-2 border-t border-slate-800/80 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
