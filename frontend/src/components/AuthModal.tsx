import React, { useState, useEffect } from 'react';
import { authApi, ApiError } from '../api';
import { User, LearnerType } from '../types';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Trophy,
  Award,
  Globe,
  Lightbulb,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [learnerType, setLearnerType] = useState<LearnerType>('university');
  const [studyGoal, setStudyGoal] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Lockout state (5 attempts -> 30 seconds rule)
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Ticking lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  if (!isOpen) return null;

  const learnerOptions: { id: LearnerType; label: string; icon: any; desc: string }[] = [
    { id: 'school', label: 'School Student', icon: BookOpen, desc: 'K-12 classes & exams' },
    { id: 'university', label: 'University / College', icon: GraduationCap, desc: 'Degrees & coursework' },
    { id: 'competitive_exam', label: 'Competitive Exam', icon: Trophy, desc: 'Entrance, Civil, Olympiad' },
    { id: 'certification', label: 'Certification', icon: Award, desc: 'Tech, Medical, Licensing' },
    { id: 'language', label: 'Language Learner', icon: Globe, desc: 'Vocabulary & Fluency' },
    { id: 'self_directed', label: 'Self-Directed', icon: Lightbulb, desc: 'Lifelong learning & skills' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

    setLoading(true);
    setErrorMsg(null);
    setAttemptsRemaining(null);

    try {
      const res = await authApi.login({ email, password });
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 423) {
          // Account Locked out!
          const seconds = err.data?.remainingSeconds || 30;
          setLockoutRemaining(seconds);
          setErrorMsg(err.data?.message || `Account locked for ${seconds} seconds.`);
        } else {
          setErrorMsg(err.message);
          if (err.data?.attemptsRemaining !== undefined) {
            setAttemptsRemaining(err.data.attemptsRemaining);
          }
        }
      } else {
        setErrorMsg('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authApi.signup({
        email,
        password,
        fullName,
        learnerType,
        studyGoal,
      });
      setSuccessMsg(res.message);
      onSuccess(res.user);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message || 'Signup failed');
      } else {
        setErrorMsg('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authApi.forgotPassword(email);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {tab === 'login' && 'Welcome Back'}
            {tab === 'signup' && 'Create Your Study Account'}
            {tab === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {tab === 'login' && 'Enter your credentials to access your personalized planner'}
            {tab === 'signup' && 'Join learners mastering subjects with Neon DB & smart spaced repetition'}
            {tab === 'forgot' && 'Enter your registered email address to receive reset instructions'}
          </p>
        </div>

        {/* Tab Switcher */}
        {tab !== 'forgot' && (
          <div className="flex p-1 bg-slate-950 rounded-xl mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === 'signup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Lockout Warning Banner */}
        {lockoutRemaining > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 animate-pulse">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-red-400 flex-shrink-0 animate-spin" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                  Account Temporarily Locked
                </p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  Unlocking in <span className="font-mono text-base text-red-300 font-bold">{lockoutRemaining}s</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-red-300/80 mt-2">
              Enforced by PostgreSQL rule: 5 consecutive failed attempts trigger a 30-second security lockout.
            </p>
          </div>
        )}

        {/* Error / Warning Alert */}
        {errorMsg && lockoutRemaining === 0 && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <span>{errorMsg}</span>
              {attemptsRemaining !== null && (
                <p className="mt-1 font-semibold text-amber-400">
                  ⚠️ {attemptsRemaining} attempts remaining before 30s lockout.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setTab('forgot')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || lockoutRemaining > 0}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white transition-all shadow-md ${
                lockoutRemaining > 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/20'
              }`}
            >
              {loading ? 'Authenticating...' : lockoutRemaining > 0 ? `Locked (${lockoutRemaining}s)` : 'Sign In'}
            </button>
          </form>
        )}

        {/* SIGNUP FORM */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password <span className="text-slate-500 text-[10px]">(min 8 chars, Argon2id)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Learner Type Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Select Your Study Profile
              </label>
              <div className="grid grid-cols-2 gap-2">
                {learnerOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = learnerType === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setLearnerType(opt.id)}
                      className={`p-2 rounded-lg border text-left flex flex-col items-start transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <Icon className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Primary Goal / Exam Target <span className="text-slate-500 text-[10px]">(Optional)</span>
              </label>
              <input
                type="text"
                value={studyGoal}
                onChange={(e) => setStudyGoal(e.target.value)}
                placeholder="e.g. Master Calculus & pass exam with A+"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-600/20"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your Account Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md"
            >
              {loading ? 'Sending Link...' : 'Send Password Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full text-xs text-slate-400 hover:text-slate-200 mt-2"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
