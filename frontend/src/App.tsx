import { useState, useEffect } from 'react';
import { User, Subject, Topic, Task, FlashcardDeck, Quiz, Note, AIRecommendation } from './types';
import { authApi, studyApi } from './api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { SubjectsView } from './components/SubjectsView';
import { TasksView } from './components/TasksView';
import { FlashcardsView } from './components/FlashcardsView';
import { QuizzesView } from './components/QuizzesView';
import { NotesView } from './components/NotesView';
import { AnalyticsView } from './components/AnalyticsView';
import { AdminPanel } from './components/AdminPanel';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // App data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);

  // 1. Check existing session on load
  useEffect(() => {
    authApi
      .getMe()
      .then((res) => {
        if (res.authenticated && res.user) {
          setUser(res.user);
        }
      })
      .catch((err) => console.log('Session check:', err))
      .finally(() => setLoadingInitial(false));
  }, []);

  // 2. Load study data whenever user logs in or refreshes
  const loadStudyData = async () => {
    if (!user) return;
    try {
      const [sRes, tRes, tkRes, dRes, qRes, nRes, aRes, rRes] = await Promise.all([
        studyApi.getSubjects(),
        studyApi.getTopics(),
        studyApi.getTasks(),
        studyApi.getDecks(),
        studyApi.getQuizzes(),
        studyApi.getNotes(),
        studyApi.getAnalytics(),
        studyApi.getAIRecommendations(),
      ]);

      setSubjects(sRes.subjects);
      setTopics(tRes.topics);
      setTasks(tkRes.tasks);
      setDecks(dRes.decks);
      setQuizzes(qRes.quizzes);
      setNotes(nRes.notes);
      setAnalytics(aRes.analytics);
      setRecommendations(rRes.recommendations);
    } catch (err) {
      console.error('Failed to load study data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadStudyData();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setActiveTab('dashboard');
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-slate-400">Connecting to Neon PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {user ? (
          /* AUTHENTICATED STUDENT VIEWS */
          <div>
            {activeTab === 'dashboard' && (
              <DashboardView
                user={user}
                subjects={subjects}
                tasks={tasks}
                analytics={analytics}
                recommendations={recommendations}
                onRefreshData={loadStudyData}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'subjects' && (
              <SubjectsView
                subjects={subjects}
                topics={topics}
                onRefreshData={loadStudyData}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksView
                tasks={tasks}
                subjects={subjects}
                topics={topics}
                onRefreshData={loadStudyData}
              />
            )}

            {activeTab === 'flashcards' && (
              <FlashcardsView
                decks={decks}
                subjects={subjects}
                onRefreshData={loadStudyData}
              />
            )}

            {activeTab === 'quizzes' && (
              <QuizzesView
                quizzes={quizzes}
                subjects={subjects}
                onRefreshData={loadStudyData}
              />
            )}

            {activeTab === 'notes' && (
              <NotesView
                notes={notes}
                subjects={subjects}
                onRefreshData={loadStudyData}
              />
            )}

            {activeTab === 'analytics' && <AnalyticsView analytics={analytics} />}

            {activeTab === 'admin' && (user.role === 'admin' || user.role === 'owner') && (
              <AdminPanel currentUser={user} />
            )}
          </div>
        ) : (
          /* GUEST / LANDING HERO */
          <div className="py-12 sm:py-16 text-center space-y-12">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Powered by Neon Serverless PostgreSQL</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
                Master Any Exam with <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Intelligent Study Planning
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Supercharge your retention with active recall flashcards, Pomodoro deep work timers, automated spaced repetition (SM-2), and syllabus confidence tracking.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
                >
                  Start Planning Free
                </button>

                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  Sign In to Account
                </button>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Pomodoro Focus Timer</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Log your deep work sessions directly into your Neon PostgreSQL database to measure real study stamina.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Spaced Repetition (SM-2)</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Interactive 3D flashcards that calculate optimal review intervals so you retain definitions right before you forget them.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">PostgreSQL Security</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Argon2id password hashing, server-managed opaque sessions, and atomic 5-attempt / 30-second lockout enforcement.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>Smart Study Planner • Powered by Neon Serverless PostgreSQL & Drizzle ORM</p>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          setShowAuthModal(false);
        }}
      />
    </div>
  );
}
