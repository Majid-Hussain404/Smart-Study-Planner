import React, { useState } from 'react';
import { Quiz, Subject } from '../types';
import { studyApi } from '../api';
import { HelpCircle, CheckCircle2, XCircle, ArrowLeft, Clock, Award } from 'lucide-react';

interface QuizzesViewProps {
  quizzes: Quiz[];
  subjects: Subject[];
  onRefreshData: () => void;
}

export const QuizzesView: React.FC<QuizzesViewProps> = ({ quizzes }) => {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mock starter quiz if user has none yet
  const sampleQuiz: Quiz = {
    id: 'sample-quiz-1',
    title: 'Study Habits & Learning Science Diagnostic',
    description: 'Test your understanding of spaced repetition, active recall, and cognitive load.',
    time_limit_minutes: 5,
    passing_score: 75,
    question_count: 3,
    best_score: undefined,
    created_at: new Date().toISOString(),
  };

  const sampleQuestions = [
    {
      id: 'q1',
      question_text: 'Which learning strategy produces the strongest long-term memory retention?',
      options: ['Re-reading textbook chapters', 'Active recall with flashcards', 'Highlighting text with bright colors', 'Cramming the night before'],
      correct_answer: 'Active recall with flashcards',
    },
    {
      id: 'q2',
      question_text: 'What is the core principle of Spaced Repetition (SuperMemo/SM-2)?',
      options: ['Reviewing material immediately before it is forgotten', 'Studying 8 continuous hours on weekends', 'Never repeating a concept once learned', 'Only studying concepts you already master'],
      correct_answer: 'Reviewing material immediately before it is forgotten',
    },
    {
      id: 'q3',
      question_text: 'What does the Pomodoro Technique suggest as the ideal focus interval?',
      options: ['120 minutes focus, 30 minutes rest', '25 minutes focus, 5 minutes rest', '5 minutes focus, 25 minutes rest', '60 minutes uninterrupted with no breaks'],
      correct_answer: '25 minutes focus, 5 minutes rest',
    },
  ];

  const handleStartQuiz = async (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setLoadingQuiz(true);
    setCurrentQIndex(0);
    setSelectedAnswers({});
    setQuizResult(null);

    try {
      if (quiz.id === 'sample-quiz-1') {
        setQuestions(sampleQuestions);
      } else {
        const res = await studyApi.getQuiz(quiz.id);
        setQuestions(res.questions.length > 0 ? res.questions : sampleQuestions);
      }
    } catch {
      setQuestions(sampleQuestions);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    try {
      if (activeQuiz?.id === 'sample-quiz-1') {
        let score = 0;
        for (const q of questions) {
          if (selectedAnswers[q.id] === q.correct_answer) score += 1;
        }
        setQuizResult({
          score,
          total: questions.length,
          percentage: Math.round((score / questions.length) * 100),
        });
      } else if (activeQuiz) {
        const res = await studyApi.submitQuiz(activeQuiz.id, selectedAnswers, 60);
        setQuizResult(res);
      }
    } catch (err) {
      console.error('Quiz submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = questions[currentQIndex];

  return (
    <div className="space-y-6">
      {/* Quiz Runner Mode */}
      {activeQuiz ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveQuiz(null)}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit Quiz</span>
            </button>
            <span className="text-xs font-medium text-slate-400">
              {activeQuiz.title}
            </span>
          </div>

          {loadingQuiz ? (
            <div className="py-24 text-center text-sm text-slate-400">Loading quiz questions...</div>
          ) : quizResult ? (
            /* Results Screen */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mx-auto flex items-center justify-center mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white">Quiz Completed!</h3>
              <p className="text-sm text-slate-400 mt-1">
                You scored <span className="font-bold text-indigo-400">{quizResult.score}</span> out of{' '}
                <span className="font-bold text-white">{quizResult.total}</span> ({quizResult.percentage}%)
              </p>

              <div className="my-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Question Review:</h4>
                {questions.map((q, idx) => {
                  const userAnswer = selectedAnswers[q.id];
                  const isCorrect = userAnswer === q.correct_answer;
                  return (
                    <div key={q.id} className="text-xs border-b border-slate-800/80 pb-2.5 last:border-0">
                      <p className="font-semibold text-slate-200">
                        {idx + 1}. {q.question_text}
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1">
                        {isCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                          Your answer: {userAnswer || '(No answer)'}
                        </span>
                      </div>
                      {!isCorrect && (
                        <p className="text-slate-400 mt-0.5 ml-5">
                          Correct: {q.correct_answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setActiveQuiz(null)}
                className="py-2.5 px-6 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
              >
                Back to All Quizzes
              </button>
            </div>
          ) : currentQ ? (
            /* Question Screen */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800">
                <span>
                  Question {currentQIndex + 1} of {questions.length}
                </span>
                <span className="flex items-center space-x-1 text-indigo-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Timed Assessment</span>
                </span>
              </div>

              <h3 className="text-lg font-bold text-white leading-relaxed">
                {currentQ.question_text}
              </h3>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt: string, optIdx: number) => {
                  const isSelected = selectedAnswers[currentQ.id] === opt;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, opt)}
                      className={`w-full p-4 rounded-xl text-left text-sm font-medium border transition-all flex items-center space-x-3 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full border text-xs flex items-center justify-center font-bold flex-shrink-0 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-slate-700 text-slate-500'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex((prev) => prev - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>

                {currentQIndex + 1 < questions.length ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQIndex((prev) => prev + 1)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitQuiz}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                  >
                    {submitting ? 'Grading...' : 'Submit Quiz'}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* Quiz Selection Mode */
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Quizzes & Self-Assessments</h2>
            <p className="text-xs text-slate-400 mt-1">
              Active retrieval practice through timed questions to test recall and exam readiness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Starter Sample Quiz */}
            <div
              onClick={() => handleStartQuiz(sampleQuiz)}
              className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 hover:border-indigo-500 shadow-xl cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  Diagnostic
                </span>
                <h3 className="text-base font-bold text-white mt-2">{sampleQuiz.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{sampleQuiz.description}</p>
              </div>

              <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-800 text-xs">
                <span className="text-slate-400">{sampleQuiz.question_count} questions</span>
                <span className="font-semibold text-indigo-400">Start Quiz →</span>
              </div>
            </div>

            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                onClick={() => handleStartQuiz(quiz)}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-base font-bold text-white">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{quiz.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">{quiz.question_count || 0} questions</span>
                  {quiz.best_score !== undefined && (
                    <span className="text-emerald-400 font-semibold">
                      Best: {quiz.best_score}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
