import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { client } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export const studyRouter = Router();

// Protect all study routes with authentication
studyRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. USER PROFILE & ONBOARDING
// -----------------------------------------------------------------------------
studyRouter.put('/profile', async (req: Request, res: Response) => {
  const profileSchema = z.object({
    learnerType: z.enum([
      'school',
      'university',
      'competitive_exam',
      'certification',
      'language',
      'self_directed',
    ]),
    studyGoal: z.string().max(1000).optional(),
    dailyGoalMinutes: z.number().min(15).max(1440).default(120),
  });

  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid profile data', details: parsed.error.flatten() });
  }

  const { learnerType, studyGoal, dailyGoalMinutes } = parsed.data;
  const userId = req.user!.id;

  await client`
    UPDATE users
    SET learner_type = ${learnerType},
        study_goal = ${studyGoal || null},
        daily_goal_minutes = ${dailyGoalMinutes},
        updated_at = NOW()
    WHERE id = ${userId}
  `;

  return res.json({ success: true, message: 'Profile updated successfully!' });
});

// -----------------------------------------------------------------------------
// 2. SUBJECTS
// -----------------------------------------------------------------------------
studyRouter.get('/subjects', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = await client`
    SELECT 
      s.*,
      COUNT(DISTINCT t.id)::int as topic_count,
      COUNT(DISTINCT tk.id)::int as task_count
    FROM subjects s
    LEFT JOIN topics t ON t.subject_id = s.id
    LEFT JOIN tasks tk ON tk.subject_id = s.id
    WHERE s.user_id = ${userId}
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;
  return res.json({ subjects: rows });
});

studyRouter.post('/subjects', async (req: Request, res: Response) => {
  const subjectSchema = z.object({
    name: z.string().min(1).max(150),
    color: z.string().default('#3b82f6'),
    icon: z.string().default('book'),
    targetGrade: z.string().max(50).optional(),
  });

  const parsed = subjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { name, color, icon, targetGrade } = parsed.data;
  const userId = req.user!.id;

  const rows = await client`
    INSERT INTO subjects (user_id, name, color, icon, target_grade)
    VALUES (${userId}, ${name}, ${color}, ${icon}, ${targetGrade || null})
    RETURNING *
  `;

  return res.status(201).json({ subject: rows[0] });
});

studyRouter.delete('/subjects/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const subjectId = req.params.id;

  const result = await client`
    DELETE FROM subjects
    WHERE id = ${subjectId} AND user_id = ${userId}
    RETURNING id
  `;

  if (result.length === 0) {
    return res.status(404).json({ error: 'Subject not found or unauthorized' });
  }

  return res.json({ success: true, message: 'Subject deleted successfully' });
});

// -----------------------------------------------------------------------------
// 3. TOPICS
// -----------------------------------------------------------------------------
studyRouter.get('/topics', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const subjectId = req.query.subjectId as string | undefined;

  const rows = subjectId
    ? await client`
        SELECT t.*, s.name as subject_name, s.color as subject_color
        FROM topics t
        JOIN subjects s ON t.subject_id = s.id
        WHERE t.user_id = ${userId} AND t.subject_id = ${subjectId}
        ORDER BY t.created_at DESC
      `
    : await client`
        SELECT t.*, s.name as subject_name, s.color as subject_color
        FROM topics t
        JOIN subjects s ON t.subject_id = s.id
        WHERE t.user_id = ${userId}
        ORDER BY t.created_at DESC
      `;

  return res.json({ topics: rows });
});

studyRouter.post('/topics', async (req: Request, res: Response) => {
  const topicSchema = z.object({
    subjectId: z.string().uuid(),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    status: z.enum(['not_started', 'in_progress', 'completed', 'review_needed']).default('not_started'),
    confidenceLevel: z.number().min(1).max(5).default(3),
    estimatedMinutes: z.number().min(5).max(600).default(60),
  });

  const parsed = topicSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { subjectId, title, description, difficulty, status, confidenceLevel, estimatedMinutes } = parsed.data;
  const userId = req.user!.id;

  // Verify subject belongs to user
  const subj = await client`SELECT id FROM subjects WHERE id = ${subjectId} AND user_id = ${userId}`;
  if (subj.length === 0) {
    return res.status(403).json({ error: 'Subject not found or unauthorized' });
  }

  const rows = await client`
    INSERT INTO topics (
      user_id, subject_id, title, description, difficulty, status, confidence_level, estimated_minutes
    )
    VALUES (
      ${userId}, ${subjectId}, ${title}, ${description || null}, ${difficulty}, ${status}, ${confidenceLevel}, ${estimatedMinutes}
    )
    RETURNING *
  `;

  return res.status(201).json({ topic: rows[0] });
});

studyRouter.patch('/topics/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const topicId = req.params.id;
  const { status, confidenceLevel } = req.body;

  const rows = await client`
    UPDATE topics
    SET status = COALESCE(${status || null}, status),
        confidence_level = COALESCE(${confidenceLevel || null}, confidence_level),
        updated_at = NOW()
    WHERE id = ${topicId} AND user_id = ${userId}
    RETURNING *
  `;

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  return res.json({ topic: rows[0] });
});

// -----------------------------------------------------------------------------
// 4. TASKS, DEADLINES & REMINDERS
// -----------------------------------------------------------------------------
studyRouter.get('/tasks', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = await client`
    SELECT 
      t.*,
      s.name as subject_name,
      s.color as subject_color,
      top.title as topic_title
    FROM tasks t
    LEFT JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN topics top ON t.topic_id = top.id
    WHERE t.user_id = ${userId}
    ORDER BY 
      CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
  `;
  return res.json({ tasks: rows });
});

studyRouter.post('/tasks', async (req: Request, res: Response) => {
  const taskSchema = z.object({
    subjectId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    dueDate: z.string().datetime().optional().nullable(),
    reminderAt: z.string().datetime().optional().nullable(),
    estimatedMinutes: z.number().min(5).max(720).default(45),
  });

  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid task data', details: parsed.error.flatten() });
  }

  const { subjectId, topicId, title, description, priority, dueDate, reminderAt, estimatedMinutes } = parsed.data;
  const userId = req.user!.id;

  const rows = await client`
    INSERT INTO tasks (
      user_id, subject_id, topic_id, title, description, priority, due_date, reminder_at, estimated_minutes
    )
    VALUES (
      ${userId},
      ${subjectId || null},
      ${topicId || null},
      ${title},
      ${description || null},
      ${priority},
      ${dueDate ? new Date(dueDate).toISOString() : null},
      ${reminderAt ? new Date(reminderAt).toISOString() : null},
      ${estimatedMinutes}
    )
    RETURNING *
  `;

  return res.status(201).json({ task: rows[0] });
});

studyRouter.patch('/tasks/:id/toggle', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;

  const rows = await client`
    UPDATE tasks
    SET status = CASE WHEN status = 'completed' THEN 'pending' ELSE 'completed' END,
        completed_at = CASE WHEN status = 'completed' THEN NULL ELSE NOW() END,
        updated_at = NOW()
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING *
  `;

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  return res.json({ task: rows[0] });
});

studyRouter.delete('/tasks/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;

  const result = await client`
    DELETE FROM tasks WHERE id = ${taskId} AND user_id = ${userId} RETURNING id
  `;

  if (result.length === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  return res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 5. STUDY SESSIONS & FOCUS LOGS (POMODORO)
// -----------------------------------------------------------------------------
studyRouter.post('/sessions', async (req: Request, res: Response) => {
  const sessionSchema = z.object({
    subjectId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    sessionType: z.enum(['pomodoro', 'deep_work', 'quick_review']).default('pomodoro'),
    durationMinutes: z.number().min(1).max(720),
    notes: z.string().optional(),
  });

  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid session data' });
  }

  const { subjectId, topicId, taskId, sessionType, durationMinutes, notes } = parsed.data;
  const userId = req.user!.id;

  const rows = await client`
    INSERT INTO study_sessions (
      user_id, subject_id, topic_id, task_id, session_type, duration_minutes, notes, completed_at
    )
    VALUES (
      ${userId}, ${subjectId || null}, ${topicId || null}, ${taskId || null}, ${sessionType}, ${durationMinutes}, ${notes || null}, NOW()
    )
    RETURNING *
  `;

  return res.status(201).json({ session: rows[0] });
});

studyRouter.get('/sessions', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = await client`
    SELECT 
      ss.*,
      s.name as subject_name,
      s.color as subject_color
    FROM study_sessions ss
    LEFT JOIN subjects s ON ss.subject_id = s.id
    WHERE ss.user_id = ${userId}
    ORDER BY ss.completed_at DESC
    LIMIT 50
  `;
  return res.json({ sessions: rows });
});

// -----------------------------------------------------------------------------
// 6. FLASHCARDS & SPACED REPETITION (SM-2 ALGORITHM)
// -----------------------------------------------------------------------------
studyRouter.get('/decks', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = await client`
    SELECT 
      d.*,
      s.name as subject_name,
      s.color as subject_color,
      COUNT(f.id)::int as card_count,
      COUNT(CASE WHEN f.next_review_at <= NOW() THEN 1 END)::int as due_count
    FROM flashcard_decks d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN flashcards f ON f.deck_id = d.id
    WHERE d.user_id = ${userId}
    GROUP BY d.id, s.name, s.color
    ORDER BY d.created_at DESC
  `;
  return res.json({ decks: rows });
});

studyRouter.post('/decks', async (req: Request, res: Response) => {
  const deckSchema = z.object({
    subjectId: z.string().uuid().optional(),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
  });

  const parsed = deckSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid deck data' });

  const { subjectId, title, description } = parsed.data;
  const userId = req.user!.id;

  const rows = await client`
    INSERT INTO flashcard_decks (user_id, subject_id, title, description)
    VALUES (${userId}, ${subjectId || null}, ${title}, ${description || null})
    RETURNING *
  `;

  return res.status(201).json({ deck: rows[0] });
});

studyRouter.get('/decks/:id/cards', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const deckId = req.params.id;

  const rows = await client`
    SELECT * FROM flashcards
    WHERE deck_id = ${deckId} AND user_id = ${userId}
    ORDER BY next_review_at ASC
  `;
  return res.json({ cards: rows });
});

studyRouter.post('/decks/:id/cards', async (req: Request, res: Response) => {
  const cardSchema = z.object({
    front: z.string().min(1),
    back: z.string().min(1),
  });

  const parsed = cardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Front and back are required' });

  const { front, back } = parsed.data;
  const userId = req.user!.id;
  const deckId = req.params.id;

  const rows = await client`
    INSERT INTO flashcards (deck_id, user_id, front, back, next_review_at)
    VALUES (${deckId}, ${userId}, ${front}, ${back}, NOW())
    RETURNING *
  `;

  return res.status(201).json({ card: rows[0] });
});

// Spaced Repetition (SuperMemo SM-2 Rating: 'again'=1, 'hard'=2, 'good'=3, 'easy'=4)
studyRouter.post('/cards/:id/review', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const cardId = req.params.id;
  const { rating } = req.body; // 'again' | 'hard' | 'good' | 'easy'

  const cardRows = await client`
    SELECT * FROM flashcards WHERE id = ${cardId} AND user_id = ${userId} LIMIT 1
  `;

  if (cardRows.length === 0) return res.status(404).json({ error: 'Card not found' });
  const card = cardRows[0];

  let repetitions = card.repetitions;
  let intervalDays = card.interval_days;
  let easeFactor = card.ease_factor; // 250 = 2.50

  if (rating === 'again') {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(130, easeFactor - 20);
  } else if (rating === 'hard') {
    intervalDays = Math.max(1, Math.floor(intervalDays * 1.2));
    easeFactor = Math.max(130, easeFactor - 15);
  } else if (rating === 'good') {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * (easeFactor / 100));
  } else if (rating === 'easy') {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 4;
    else intervalDays = Math.round(intervalDays * (easeFactor / 100) * 1.3);
    easeFactor += 15;
  }

  const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  const updated = await client`
    UPDATE flashcards
    SET repetitions = ${repetitions},
        interval_days = ${intervalDays},
        ease_factor = ${easeFactor},
        next_review_at = ${nextReviewAt.toISOString()},
        last_reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${cardId}
    RETURNING *
  `;

  return res.json({ card: updated[0] });
});

// -----------------------------------------------------------------------------
// 7. QUIZZES
// -----------------------------------------------------------------------------
studyRouter.get('/quizzes', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = await client`
    SELECT 
      q.*,
      s.name as subject_name,
      s.color as subject_color,
      COUNT(qq.id)::int as question_count,
      MAX(qa.score)::int as best_score
    FROM quizzes q
    LEFT JOIN subjects s ON q.subject_id = s.id
    LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
    LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = ${userId}
    WHERE q.user_id = ${userId}
    GROUP BY q.id, s.name, s.color
    ORDER BY q.created_at DESC
  `;
  return res.json({ quizzes: rows });
});

studyRouter.get('/quizzes/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const quizId = req.params.id;

  const quizRows = await client`
    SELECT * FROM quizzes WHERE id = ${quizId} AND user_id = ${userId} LIMIT 1
  `;
  if (quizRows.length === 0) return res.status(404).json({ error: 'Quiz not found' });

  const questions = await client`
    SELECT id, question_text, question_type, options, order_index
    FROM quiz_questions
    WHERE quiz_id = ${quizId}
    ORDER BY order_index ASC
  `;

  return res.json({ quiz: quizRows[0], questions });
});

studyRouter.post('/quizzes/:id/submit', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const quizId = req.params.id;
  const { answers, timeSpentSeconds } = req.body; // { [questionId]: selectedAnswer }

  const questions = await client`
    SELECT id, correct_answer FROM quiz_questions WHERE quiz_id = ${quizId}
  `;

  let score = 0;
  for (const q of questions) {
    if (answers?.[q.id] && answers[q.id].trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
      score += 1;
    }
  }

  const attemptRows = await client`
    INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions, time_spent_seconds)
    VALUES (${quizId}, ${userId}, ${score}, ${questions.length}, ${timeSpentSeconds || 0})
    RETURNING *
  `;

  return res.json({
    attempt: attemptRows[0],
    score,
    total: questions.length,
    percentage: Math.round((score / Math.max(1, questions.length)) * 100),
  });
});

// -----------------------------------------------------------------------------
// 8. NOTES
// -----------------------------------------------------------------------------
studyRouter.get('/notes', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = await client`
    SELECT 
      n.*,
      s.name as subject_name,
      s.color as subject_color
    FROM notes n
    LEFT JOIN subjects s ON n.subject_id = s.id
    WHERE n.user_id = ${userId}
    ORDER BY n.is_pinned DESC, n.updated_at DESC
  `;
  return res.json({ notes: rows });
});

studyRouter.post('/notes', async (req: Request, res: Response) => {
  const noteSchema = z.object({
    subjectId: z.string().uuid().optional(),
    title: z.string().min(1).max(255),
    content: z.string().default(''),
    tags: z.array(z.string()).default([]),
    isPinned: z.boolean().default(false),
  });

  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid note data' });

  const { subjectId, title, content, tags, isPinned } = parsed.data;
  const userId = req.user!.id;

  const rows = await client`
    INSERT INTO notes (user_id, subject_id, title, content, tags, is_pinned)
    VALUES (${userId}, ${subjectId || null}, ${title}, ${content}, ${JSON.stringify(tags)}, ${isPinned})
    RETURNING *
  `;

  return res.status(201).json({ note: rows[0] });
});

studyRouter.delete('/notes/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const noteId = req.params.id;

  const result = await client`
    DELETE FROM notes WHERE id = ${noteId} AND user_id = ${userId} RETURNING id
  `;

  if (result.length === 0) return res.status(404).json({ error: 'Note not found' });
  return res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 9. PROGRESS ANALYTICS
// -----------------------------------------------------------------------------
studyRouter.get('/analytics', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Total study time and sessions
  const sessionStats = await client`
    SELECT 
      COALESCE(SUM(duration_minutes), 0)::int as total_study_minutes,
      COUNT(id)::int as total_sessions,
      COALESCE(SUM(CASE WHEN completed_at >= CURRENT_DATE - INTERVAL '7 days' THEN duration_minutes ELSE 0 END), 0)::int as past_week_minutes
    FROM study_sessions
    WHERE user_id = ${userId}
  `;

  // Task stats
  const taskStats = await client`
    SELECT 
      COUNT(id)::int as total_tasks,
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_tasks,
      COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_tasks,
      COUNT(CASE WHEN due_date < NOW() AND status != 'completed' THEN 1 END)::int as overdue_tasks
    FROM tasks
    WHERE user_id = ${userId}
  `;

  // Flashcards mastered / due
  const cardStats = await client`
    SELECT 
      COUNT(id)::int as total_cards,
      COUNT(CASE WHEN next_review_at <= NOW() THEN 1 END)::int as due_reviews,
      COUNT(CASE WHEN repetitions >= 3 THEN 1 END)::int as mastered_cards
    FROM flashcards
    WHERE user_id = ${userId}
  `;

  // Subject time breakdown
  const subjectBreakdown = await client`
    SELECT 
      s.name,
      s.color,
      COALESCE(SUM(ss.duration_minutes), 0)::int as minutes
    FROM subjects s
    LEFT JOIN study_sessions ss ON ss.subject_id = s.id
    WHERE s.user_id = ${userId}
    GROUP BY s.id, s.name, s.color
    ORDER BY minutes DESC
  `;

  return res.json({
    analytics: {
      studyTime: sessionStats[0],
      tasks: taskStats[0],
      flashcards: cardStats[0],
      subjectBreakdown,
    },
  });
});

// -----------------------------------------------------------------------------
// 10. AI STUDY RECOMMENDATIONS
// -----------------------------------------------------------------------------
studyRouter.get('/ai-recommendations', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = await client`
    SELECT * FROM ai_recommendations
    WHERE user_id = ${userId} AND is_dismissed = false
    ORDER BY created_at DESC
    LIMIT 10
  `;
  return res.json({ recommendations: rows });
});

studyRouter.post('/ai-recommendations/generate', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = req.user!;

  // Fetch student's context from PostgreSQL
  const pendingTasks = await client`
    SELECT t.title, s.name as subject_name, t.priority, t.due_date
    FROM tasks t
    LEFT JOIN subjects s ON t.subject_id = s.id
    WHERE t.user_id = ${userId} AND t.status = 'pending'
    LIMIT 5
  `;

  const weakTopics = await client`
    SELECT top.title, s.name as subject_name, top.confidence_level
    FROM topics top
    JOIN subjects s ON top.subject_id = s.id
    WHERE top.user_id = ${userId} AND top.confidence_level <= 2
    LIMIT 3
  `;

  // Generate actionable, tailored recommendation based on learner profile
  const recs = [];

  if (weakTopics.length > 0) {
    recs.push({
      type: 'weak_topic_drill',
      title: `Focus Drill: ${weakTopics[0].title}`,
      suggestion: `Your confidence in "${weakTopics[0].title}" (${weakTopics[0].subject_name}) is currently rated low. Allocate a 25-minute Pomodoro session today to create 5 flashcards or summarize key concepts.`,
      payload: { topic: weakTopics[0].title, subject: weakTopics[0].subject_name },
    });
  }

  if (pendingTasks.length > 0) {
    recs.push({
      type: 'study_schedule',
      title: `Next Priority: ${pendingTasks[0].title}`,
      suggestion: `Target exam/deadline reminder: prioritize "${pendingTasks[0].title}" (${pendingTasks[0].subject_name}) before starting new topics to prevent backlog buildup.`,
      payload: { task: pendingTasks[0].title },
    });
  }

  // General recommendation based on learner type
  const learnerAdvice: Record<string, string> = {
    school: 'Spaced review every 3 days reinforces memory for end-of-term exams.',
    university: 'Use active recall and Feynman technique for complex lecture modules.',
    competitive_exam: 'Daily timed mock quizzes improve speed and eliminate exam-day anxiety.',
    certification: 'Focus on practice exam scenarios and blueprint weightage.',
    language: '15 minutes of flashcards daily beats 2 hours once a week for vocabulary retention.',
    self_directed: 'Track your deep work hours to build sustainable daily momentum.',
  };

  recs.push({
    type: 'time_management',
    title: `${user.learnerType.toUpperCase()} Learner Strategy`,
    suggestion: learnerAdvice[user.learnerType] || 'Maintain regular intervals of deep focus with 5-minute rest breaks.',
    payload: { learnerType: user.learnerType },
  });

  // Save generated recommendations to Neon DB
  for (const r of recs) {
    await client`
      INSERT INTO ai_recommendations (
        user_id, recommendation_type, title, suggestion_text, payload
      )
      VALUES (
        ${userId}, ${r.type}, ${r.title}, ${r.suggestion}, ${JSON.stringify(r.payload)}
      )
    `;
  }

  const updated = await client`
    SELECT * FROM ai_recommendations
    WHERE user_id = ${userId} AND is_dismissed = false
    ORDER BY created_at DESC
    LIMIT 10
  `;

  return res.json({ recommendations: updated });
});
