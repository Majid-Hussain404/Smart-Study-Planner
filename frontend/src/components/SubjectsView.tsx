import React, { useState } from 'react';
import { Subject, Topic } from '../types';
import { studyApi } from '../api';
import { Plus, BookOpen, Trash2, Star, ChevronDown, ChevronRight, X } from 'lucide-react';

interface SubjectsViewProps {
  subjects: Subject[];
  topics: Topic[];
  onRefreshData: () => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  topics,
  onRefreshData,
}) => {
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(
    subjects[0]?.id || null
  );

  // Modal states
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Form states
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState('#6366f1');
  const [targetGrade, setTargetGrade] = useState('');

  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [confidence, setConfidence] = useState<number>(3);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(60);

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    try {
      await studyApi.createSubject({
        name: subjectName,
        color: subjectColor,
        target_grade: targetGrade || undefined,
      });
      setShowSubjectModal(false);
      setSubjectName('');
      onRefreshData();
    } catch (err) {
      console.error('Failed to create subject:', err);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject and its topics?')) return;
    try {
      await studyApi.deleteSubject(id);
      onRefreshData();
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || !selectedSubjectId) return;

    try {
      await studyApi.createTopic({
        subjectId: selectedSubjectId,
        title: topicTitle,
        description: topicDesc,
        difficulty,
        confidenceLevel: confidence,
        estimatedMinutes,
      });
      setShowTopicModal(false);
      setTopicTitle('');
      setTopicDesc('');
      onRefreshData();
    } catch (err) {
      console.error('Failed to create topic:', err);
    }
  };

  const handleUpdateConfidence = async (topicId: string, newConfidence: number) => {
    try {
      await studyApi.updateTopic(topicId, { confidenceLevel: newConfidence });
      onRefreshData();
    } catch (err) {
      console.error('Failed to update confidence:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Subjects & Syllabus Topics</h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize your curriculum, track confidence levels, and identify topics needing review.
          </p>
        </div>

        <button
          onClick={() => setShowSubjectModal(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No subjects created yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Start by adding the subjects or courses you are studying this term.
          </p>
          <button
            onClick={() => setShowSubjectModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md"
          >
            Create Subject
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map((sub) => {
            const isExpanded = expandedSubjectId === sub.id;
            const subjectTopics = topics.filter((t) => t.subject_id === sub.id);

            return (
              <div
                key={sub.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
              >
                {/* Subject Header Row */}
                <div
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 select-none"
                  onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: sub.color || '#6366f1' }}
                    />
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white truncate">{sub.name}</h3>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                        <span>{subjectTopics.length} topics</span>
                        {sub.target_grade && <span>Target: {sub.target_grade}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSubjectId(sub.id);
                        setShowTopicModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-indigo-400 hover:text-indigo-300 hover:border-slate-700 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add Topic</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubject(sub.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="text-slate-400 ml-1">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Topics Container */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
                    {subjectTopics.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        No topics added to {sub.name} yet. Click "Add Topic" to begin structuring your syllabus.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {subjectTopics.map((top) => (
                          <div
                            key={top.id}
                            className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-left hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <h4 className="text-sm font-semibold text-slate-200">{top.title}</h4>
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                                  top.difficulty === 'hard'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                    : top.difficulty === 'medium'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {top.difficulty}
                              </span>
                            </div>

                            {top.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                {top.description}
                              </p>
                            )}

                            {/* Confidence Rating Stars */}
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60">
                              <span className="text-[11px] text-slate-400">Confidence:</span>
                              <div className="flex items-center space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => handleUpdateConfidence(top.id, star)}
                                    className={`p-0.5 hover:scale-110 transition-transform ${
                                      star <= top.confidence_level
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SUBJECT MODAL */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSubjectModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Create New Subject</h3>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Organic Chemistry, Microeconomics, Japanese"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Color Tag</label>
                <div className="flex items-center space-x-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSubjectColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        subjectColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Grade or Score <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  placeholder="e.g. A*, 95%, Band 8"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TOPIC MODAL */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowTopicModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Add Topic</h3>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Topic Title</label>
                <input
                  type="text"
                  required
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. Photosynthesis & Calvin Cycle"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description / Key Formulas <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <textarea
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  rows={2}
                  placeholder="Summary or textbook references..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Est. Minutes</label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Initial Confidence (1 to 5 Stars)
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setConfidence(star)}
                      className={`p-1 ${
                        star <= confidence ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                >
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
