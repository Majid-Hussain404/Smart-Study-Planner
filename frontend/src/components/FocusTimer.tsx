import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Sparkles } from 'lucide-react';
import { studyApi } from '../api';
import { Subject } from '../types';

interface FocusTimerProps {
  subjects: Subject[];
  onSessionLogged: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ subjects, onSessionLogged }) => {
  const [mode, setMode] = useState<'pomodoro' | 'deep_work' | 'quick_review'>('pomodoro');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const durations: Record<string, number> = {
    pomodoro: 25 * 60,
    deep_work: 50 * 60,
    quick_review: 15 * 60,
  };

  const [timeLeft, setTimeLeft] = useState<number>(durations.pomodoro);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Switch mode
  const handleModeChange = (newMode: 'pomodoro' | 'deep_work' | 'quick_review') => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(durations[newMode]);
  };

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setShowCompletionModal(true);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalTime = durations[mode];
  const progressPercent = Math.round(((totalTime - timeLeft) / totalTime) * 100);

  const handleSaveSession = async () => {
    setSaving(true);
    try {
      const durationMinutes = Math.round(durations[mode] / 60);
      await studyApi.logSession({
        subjectId: selectedSubjectId || undefined,
        sessionType: mode,
        durationMinutes,
        notes: sessionNotes || undefined,
      });
      setShowCompletionModal(false);
      setSessionNotes('');
      setTimeLeft(durations[mode]);
      onSessionLogged();
    } catch (err) {
      console.error('Failed to log session:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Mode switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-slate-100">Focus & Pomodoro Timer</h3>
        </div>

        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => handleModeChange('pomodoro')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'pomodoro' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pomodoro (25m)
          </button>
          <button
            onClick={() => handleModeChange('deep_work')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'deep_work' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deep Work (50m)
          </button>
          <button
            onClick={() => handleModeChange('quick_review')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'quick_review' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Review (15m)
          </button>
        </div>
      </div>

      {/* Subject Selector */}
      {subjects.length > 0 && (
        <div className="mb-6 max-w-xs mx-auto">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">(Optional) Link focus session to Subject...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Timer Display */}
      <div className="flex flex-col items-center justify-center my-4 relative z-10">
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Circular SVG track */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-slate-800"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-indigo-500 transition-all duration-1000 ease-linear"
              strokeWidth="6"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Time text */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-extrabold text-white tracking-wider">
              {formattedTime}
            </span>
            <span className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
              {isRunning ? 'Focus Mode' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3 mt-6">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start Focus</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsRunning(false);
              setTimeLeft(durations[mode]);
            }}
            title="Reset timer"
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Focus Session Complete! 🎉</h4>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Great job! You focused for {Math.round(durations[mode] / 60)} minutes. Save this progress to your Neon database.
            </p>

            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="What did you accomplish during this session? (Optional)"
              rows={3}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 mb-4"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => setShowCompletionModal(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Discard
              </button>
              <button
                onClick={handleSaveSession}
                disabled={saving}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
