export type Role = 'user' | 'admin' | 'owner';

export type LearnerType =
  | 'school'
  | 'university'
  | 'competitive_exam'
  | 'certification'
  | 'language'
  | 'self_directed';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isEmailVerified: boolean;
  learnerType: LearnerType;
  studyGoal?: string;
  dailyGoalMinutes: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  target_grade?: string;
  topic_count?: number;
  task_count?: number;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_color?: string;
  title: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'not_started' | 'in_progress' | 'completed' | 'review_needed';
  confidence_level: number;
  estimated_minutes: number;
  created_at: string;
}

export interface Task {
  id: string;
  subject_id?: string;
  subject_name?: string;
  subject_color?: string;
  topic_id?: string;
  topic_title?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  due_date?: string;
  reminder_at?: string;
  estimated_minutes: number;
  actual_minutes: number;
  completed_at?: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  subject_id?: string;
  subject_name?: string;
  subject_color?: string;
  session_type: 'pomodoro' | 'deep_work' | 'quick_review';
  duration_minutes: number;
  notes?: string;
  completed_at: string;
}

export interface FlashcardDeck {
  id: string;
  subject_id?: string;
  subject_name?: string;
  subject_color?: string;
  title: string;
  description?: string;
  card_count?: number;
  due_count?: number;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  last_reviewed_at?: string;
}

export interface Quiz {
  id: string;
  subject_id?: string;
  subject_name?: string;
  subject_color?: string;
  title: string;
  description?: string;
  time_limit_minutes: number;
  passing_score: number;
  question_count?: number;
  best_score?: number;
  created_at: string;
}

export interface Note {
  id: string;
  subject_id?: string;
  subject_name?: string;
  subject_color?: string;
  title: string;
  content: string;
  tags?: string[];
  is_pinned: boolean;
  updated_at: string;
}

export interface AIRecommendation {
  id: string;
  recommendation_type: string;
  title: string;
  suggestion_text: string;
  payload?: any;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id?: string;
  admin_email?: string;
  admin_name?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  metadata?: any;
  ip_address?: string;
  created_at: string;
}

export interface LockoutState {
  isLocked: boolean;
  remainingSeconds: number;
  lockedUntil?: string;
}
