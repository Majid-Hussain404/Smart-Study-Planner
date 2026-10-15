import React, { useState } from 'react';
import { User, Subject, Task, AIRecommendation } from '../types';
import { FocusTimer } from './FocusTimer';
import { studyApi } from '../api';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Brain,
  Plus,
} from 'lucide-react';

interface DashboardViewProps {
  user: User;
  subjects: Subject[];
  tasks: Task[];
  analytics: any;
  recommendations: AIRecommendation[];
  onRefreshData: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  subjects,
  tasks,
  analytics,
  recommendations,
  onRefreshData,
  onNavigateTab,
}) => {
  const [generatingAI, setGeneratingAI] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status !== 'completed').slice(0, 5);
  const totalMinutes = analytics?.studyTime?.total_study_minutes || 0;
  const totalHours = (totalMinutes / 60).toFixed(1);
  const completedTasksCount = analytics?.tasks?.completed_tasks || 0;
  const totalTasksCount = analytics?.tasks?.total_tasks || 0;

  // Calculate daily goal percentage
  const pastWeekMinutes = analytics?.studyTime?.past_week_minutes || 0;
  const dailyAverageMinutes = Math.round(pastWeekMinutes / 7);
  const dailyGoalPercent = Math.min(
    100,
    Math.round((dailyAverageMinutes / Math.max(1, user.dailyGoalMinutes)) * 100)
  );

  const handleToggleTask = async (taskId: string) => {
    try {
      await studyApi.toggleTask(taskId);
      onRefreshData();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      await studyApi.generateAIRecommendations();
      onRefreshData();
    } catch (err) {
      console.error('Failed to generate AI recommendations:', err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500/10 text-red-400 border-red-500/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    medium: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personalized for {user.learnerType.replace('_', ' ').toUpperCase()}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user.fullName}! 👋
          </h1>

          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            {user.studyGoal
              ? `🎯 Goal: ${user.studyGoal}`
              : 'Keep up your daily study momentum! Review your flashcards and log your focus sessions below.'}
          </p>

          {/* Quick Stats Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-medium">Total Study</span>
              <p className="text-lg font-bold text-white mt-0.5">{totalHours} hrs</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-medium">Tasks Completed</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {completedTasksCount} / {totalTasksCount}
              </p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-medium">Subjects Active</span>
              <p className="text-lg font-bold text-indigo-400 mt-0.5">{subjects.length}</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-medium">Daily Goal Pace</span>
              <p className="text-lg font-bold text-purple-400 mt-0.5">{dailyGoalPercent}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Focus Timer + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Focus Timer (Takes 2 columns) */}
        <div className="lg:col-span-2">
          <FocusTimer subjects={subjects} onSessionLogged={onRefreshData} />
        </div>

        {/* AI Recommendations Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">AI Study Insights</h3>
              </div>
              <button
                onClick={handleGenerateAI}
                disabled={generatingAI}
                className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
              >
                {generatingAI ? 'Analyzing...' : 'Refresh'}
              </button>
            </div>

            {recommendations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400">
                  No active study insights yet. Click the button above to generate recommendations based on your topics and goals.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-left hover:border-purple-500/30 transition-colors"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      {rec.title}
                    </span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {rec.suggestion_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('subjects')}
            className="w-full mt-4 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <span>Review Subjects & Confidence</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Two Column Section: Priority Tasks & Quick Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Priority Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Priority Tasks</h3>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View all ({tasks.length})
            </button>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              All caught up! No pending tasks right now.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="w-5 h-5 rounded-md border border-slate-700 hover:border-indigo-500 flex items-center justify-center text-transparent hover:text-indigo-400 transition-colors flex-shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                      {task.subject_name && (
                        <span className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: task.subject_color || '#3b82f6' }}
                          />
                          <span>{task.subject_name}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      priorityColors[task.priority] || priorityColors.medium
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subjects & Topics Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Your Subjects</h3>
            </div>
            <button
              onClick={() => onNavigateTab('subjects')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Manage Subjects
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400 mb-3">You haven't added any subjects yet.</p>
              <button
                onClick={() => onNavigateTab('subjects')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Subject</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.slice(0, 4).map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-left hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sub.color || '#3b82f6' }}
                    />
                    <h4 className="text-sm font-semibold text-slate-200 truncate">{sub.name}</h4>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{sub.topic_count || 0} topics</span>
                    <span>{sub.task_count || 0} tasks</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
