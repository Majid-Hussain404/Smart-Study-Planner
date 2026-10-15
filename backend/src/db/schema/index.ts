import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ==============================================================================
// 1. USERS & ROLES
// ==============================================================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('user'), // 'user', 'admin', 'owner'
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    learnerType: varchar('learner_type', { length: 50 }).default('self_directed'), // 'school', 'university', 'competitive_exam', 'certification', 'language', 'self_directed'
    studyGoal: text('study_goal'),
    dailyGoalMinutes: integer('daily_goal_minutes').notNull().default(120),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
    index('users_role_idx').on(table.role),
  ]
);

// ==============================================================================
// 2. LOGIN ATTEMPT TRACKING & LOCKOUTS (ATOMIC ENFORCEMENT)
// ==============================================================================
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    failedCount: integer('failed_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastFailedAt: timestamp('last_failed_at', { withTimezone: true }),
    lastIp: varchar('last_ip', { length: 45 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('login_attempts_email_idx').on(table.email),
    index('login_attempts_locked_until_idx').on(table.lockedUntil),
  ]
);

// ==============================================================================
// 3. SERVER-MANAGED SESSIONS (OPAQUE TOKEN HASHES)
// ==============================================================================
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    sessionTokenHash: varchar('session_token_hash', { length: 64 }).notNull().unique(), // SHA-256 hash of opaque token
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    isRevoked: boolean('is_revoked').notNull().default(false),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_idx').on(table.sessionTokenHash),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ]
);

// ==============================================================================
// 4. VERIFICATION & PASSWORD RESET TOKENS (HASHED & SHORT-LIVED)
// ==============================================================================
export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 30 }).notNull(), // 'email_verification', 'password_reset'
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_tokens_hash_idx').on(table.tokenHash),
    index('auth_tokens_user_id_idx').on(table.userId),
    index('auth_tokens_type_idx').on(table.type),
  ]
);

// ==============================================================================
// 5. SUBJECTS & TOPICS
// ==============================================================================
export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    color: varchar('color', { length: 20 }).default('#3b82f6'),
    icon: varchar('icon', { length: 50 }).default('book'),
    targetGrade: varchar('target_grade', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('subjects_user_id_idx').on(table.userId),
  ]
);

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    difficulty: varchar('difficulty', { length: 20 }).default('medium'), // 'easy', 'medium', 'hard'
    status: varchar('status', { length: 30 }).default('not_started'), // 'not_started', 'in_progress', 'completed', 'review_needed'
    confidenceLevel: integer('confidence_level').default(3), // 1 to 5
    estimatedMinutes: integer('estimated_minutes').default(60),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('topics_user_id_idx').on(table.userId),
    index('topics_subject_id_idx').on(table.subjectId),
  ]
);

// ==============================================================================
// 6. STUDY PLANS & SCHEDULES
// ==============================================================================
export const studyPlans = pgTable(
  'study_plans',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    targetExamDate: timestamp('target_exam_date', { withTimezone: true }),
    scheduleType: varchar('schedule_type', { length: 30 }).default('weekly'), // 'daily', 'weekly', 'custom'
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('study_plans_user_id_idx').on(table.userId),
  ]
);

// ==============================================================================
// 7. TASKS, DEADLINES & REMINDERS
// ==============================================================================
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    priority: varchar('priority', { length: 20 }).default('medium'), // 'low', 'medium', 'high', 'urgent'
    status: varchar('status', { length: 30 }).default('pending'), // 'pending', 'in_progress', 'completed', 'deferred'
    dueDate: timestamp('due_date', { withTimezone: true }),
    reminderAt: timestamp('reminder_at', { withTimezone: true }),
    estimatedMinutes: integer('estimated_minutes').default(45),
    actualMinutes: integer('actual_minutes').default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('tasks_user_id_idx').on(table.userId),
    index('tasks_status_idx').on(table.status),
    index('tasks_due_date_idx').on(table.dueDate),
  ]
);

// ==============================================================================
// 8. STUDY SESSIONS & LOGS (POMODORO & FOCUS TIME TRACKING)
// ==============================================================================
export const studySessions = pgTable(
  'study_sessions',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    sessionType: varchar('session_type', { length: 30 }).default('pomodoro'), // 'pomodoro', 'deep_work', 'quick_review'
    durationMinutes: integer('duration_minutes').notNull(),
    notes: text('notes'),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('study_sessions_user_id_idx').on(table.userId),
    index('study_sessions_completed_at_idx').on(table.completedAt),
  ]
);

// ==============================================================================
// 9. FLASHCARDS & DECKS (SPACED REPETITION)
// ==============================================================================
export const flashcardDecks = pgTable(
  'flashcard_decks',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('flashcard_decks_user_id_idx').on(table.userId),
  ]
);

export const flashcards = pgTable(
  'flashcards',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => flashcardDecks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    front: text('front').notNull(),
    back: text('back').notNull(),
    repetitions: integer('repetitions').default(0).notNull(),
    intervalDays: integer('interval_days').default(1).notNull(),
    easeFactor: integer('ease_factor').default(250).notNull(), // standard 2.5 represented as 250
    nextReviewAt: timestamp('next_review_at', { withTimezone: true }).defaultNow().notNull(),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('flashcards_deck_id_idx').on(table.deckId),
    index('flashcards_user_id_idx').on(table.userId),
    index('flashcards_next_review_idx').on(table.nextReviewAt),
  ]
);

// ==============================================================================
// 10. QUIZZES & ASSESSMENTS
// ==============================================================================
export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    timeLimitMinutes: integer('time_limit_minutes').default(15),
    passingScore: integer('passing_score').default(70),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('quizzes_user_id_idx').on(table.userId),
  ]
);

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    questionText: text('question_text').notNull(),
    questionType: varchar('question_type', { length: 30 }).default('multiple_choice'), // 'multiple_choice', 'true_false'
    options: jsonb('options').notNull(), // array of string options
    correctAnswer: text('correct_answer').notNull(),
    explanation: text('explanation'),
    orderIndex: integer('order_index').default(0).notNull(),
  },
  (table) => [
    index('quiz_questions_quiz_id_idx').on(table.quizId),
  ]
);

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    timeSpentSeconds: integer('time_spent_seconds').default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('quiz_attempts_user_id_idx').on(table.userId),
    index('quiz_attempts_quiz_id_idx').on(table.quizId),
  ]
);

// ==============================================================================
// 11. NOTES & LEARNING RESOURCES
// ==============================================================================
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    tags: jsonb('tags').default(sql`'[]'::jsonb`),
    isPinned: boolean('is_pinned').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notes_user_id_idx').on(table.userId),
    index('notes_subject_id_idx').on(table.subjectId),
  ]
);

// ==============================================================================
// 12. AI-GENERATED RECOMMENDATIONS
// ==============================================================================
export const aiRecommendations = pgTable(
  'ai_recommendations',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recommendationType: varchar('recommendation_type', { length: 50 }).notNull(), // 'study_schedule', 'weak_topic_drill', 'time_management'
    title: varchar('title', { length: 255 }).notNull(),
    suggestionText: text('suggestion_text').notNull(),
    payload: jsonb('payload').default(sql`'{}'::jsonb`),
    isApplied: boolean('is_applied').default(false).notNull(),
    isDismissed: boolean('is_dismissed').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ai_recommendations_user_id_idx').on(table.userId),
  ]
);

// ==============================================================================
// 13. ADMINISTRATIVE AUDIT LOGS
// ==============================================================================
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    adminId: uuid('admin_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(), // 'user_role_change', 'owner_initiation', 'account_ban', etc.
    targetType: varchar('target_type', { length: 50 }),
    targetId: text('target_id'),
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_admin_id_idx').on(table.adminId),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ]
);
