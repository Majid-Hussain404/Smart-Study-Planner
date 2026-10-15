import React from 'react';
import { Clock, CheckCircle2, Layers, BarChart2 } from 'lucide-react';

interface AnalyticsViewProps {
  analytics: any;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analytics }) => {
  const totalMinutes = analytics?.studyTime?.total_study_minutes || 0;
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalSessions = analytics?.studyTime?.total_sessions || 0;
  const pastWeekMinutes = analytics?.studyTime?.past_week_minutes || 0;
  const pastWeekHours = (pastWeekMinutes / 60).toFixed(1);

  const totalTasks = analytics?.tasks?.total_tasks || 0;
  const completedTasks = analytics?.tasks?.completed_tasks || 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalCards = analytics?.flashcards?.total_cards || 0;
  const masteredCards = analytics?.flashcards?.mastered_cards || 0;
  const masteryRate = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  const subjectBreakdown = analytics?.subjectBreakdown || [];
  const maxSubjectMinutes = Math.max(1, ...subjectBreakdown.map((s: any) => s.minutes || 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Study Analytics & Progress</h2>
        <p className="text-xs text-slate-400 mt-1">
          Detailed metrics aggregated directly from your PostgreSQL study session logs and task records.
        </p>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">Total Focus Time</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{totalHours} hrs</p>
          <span className="text-xs text-slate-400 mt-1 block">{totalSessions} focus sessions logged</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <BarChart2 className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">Past 7 Days</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{pastWeekHours} hrs</p>
          <span className="text-xs text-slate-400 mt-1 block">Active study momentum</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center space-x-2 text-emerald-400 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">Tasks Completion</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{taskCompletionRate}%</p>
          <span className="text-xs text-slate-400 mt-1 block">
            {completedTasks} of {totalTasks} tasks done
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center space-x-2 text-amber-400 mb-2">
            <Layers className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">Cards Mastered</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{masteryRate}%</p>
          <span className="text-xs text-slate-400 mt-1 block">
            {masteredCards} of {totalCards} cards retained
          </span>
        </div>
      </div>

      {/* Subject Distribution Bar Charts */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4">Study Time by Subject</h3>

        {subjectBreakdown.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No subject focus sessions recorded yet. Start a focus session using the Pomodoro timer to see your time breakdown here.
          </div>
        ) : (
          <div className="space-y-4">
            {subjectBreakdown.map((item: any, idx: number) => {
              const minutes = item.minutes || 0;
              const hours = (minutes / 60).toFixed(1);
              const barPercent = Math.max(5, Math.round((minutes / maxSubjectMinutes) * 100));

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{item.name}</span>
                    <span className="text-slate-400">
                      {hours} hrs ({minutes}m)
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPercent}%`,
                        backgroundColor: item.color || '#6366f1',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
