import {
  User,
  Subject,
  Topic,
  Task,
  StudySession,
  FlashcardDeck,
  Flashcard,
  Quiz,
  Note,
  AIRecommendation,
  AuditLog,
} from './types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // essential for HttpOnly session cookie
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || data.error || 'Request failed', response.status, data);
  }

  return data as T;
}

// -----------------------------------------------------------------------------
// Authentication API
// -----------------------------------------------------------------------------
export const authApi = {
  getMe: () => request<{ authenticated: boolean; user: User | null }>('/auth/me'),

  signup: (payload: {
    email: string;
    password: string;
    fullName: string;
    learnerType: string;
    studyGoal?: string;
  }) => request<{ success: boolean; message: string; user: User }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  login: (payload: { email: string; password: string }) =>
    request<{ success: boolean; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (payload: { token: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyEmail: (token: string) =>
    request<{ success: boolean; message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  ownerLogin: (payload: { email: string; password: string }) =>
    request<{ success: boolean; message: string; user: User }>('/auth/owner/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  ownerClaim: (payload: {
    email: string;
    password: string;
    fullName: string;
    ownerSetupSecret: string;
  }) =>
    request<{ success: boolean; message: string; user: User }>('/auth/owner/claim', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// -----------------------------------------------------------------------------
// Study Planner API
// -----------------------------------------------------------------------------
export const studyApi = {
  updateProfile: (payload: any) =>
    request<{ success: boolean }>('/study/profile', { method: 'PUT', body: JSON.stringify(payload) }),

  getSubjects: () => request<{ subjects: Subject[] }>('/study/subjects'),
  createSubject: (payload: Partial<Subject>) =>
    request<{ subject: Subject }>('/study/subjects', { method: 'POST', body: JSON.stringify(payload) }),
  deleteSubject: (id: string) => request<{ success: boolean }>(`/study/subjects/${id}`, { method: 'DELETE' }),

  getTopics: (subjectId?: string) =>
    request<{ topics: Topic[] }>(subjectId ? `/study/topics?subjectId=${subjectId}` : '/study/topics'),
  createTopic: (payload: any) =>
    request<{ topic: Topic }>('/study/topics', { method: 'POST', body: JSON.stringify(payload) }),
  updateTopic: (id: string, payload: any) =>
    request<{ topic: Topic }>(`/study/topics/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  getTasks: () => request<{ tasks: Task[] }>('/study/tasks'),
  createTask: (payload: any) =>
    request<{ task: Task }>('/study/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  toggleTask: (id: string) =>
    request<{ task: Task }>(`/study/tasks/${id}/toggle`, { method: 'PATCH' }),
  deleteTask: (id: string) => request<{ success: boolean }>(`/study/tasks/${id}`, { method: 'DELETE' }),

  getSessions: () => request<{ sessions: StudySession[] }>('/study/sessions'),
  logSession: (payload: {
    subjectId?: string;
    topicId?: string;
    taskId?: string;
    sessionType: 'pomodoro' | 'deep_work' | 'quick_review';
    durationMinutes: number;
    notes?: string;
  }) => request<{ session: StudySession }>('/study/sessions', { method: 'POST', body: JSON.stringify(payload) }),

  getDecks: () => request<{ decks: FlashcardDeck[] }>('/study/decks'),
  createDeck: (payload: any) =>
    request<{ deck: FlashcardDeck }>('/study/decks', { method: 'POST', body: JSON.stringify(payload) }),
  getDeckCards: (deckId: string) =>
    request<{ cards: Flashcard[] }>(`/study/decks/${deckId}/cards`),
  createCard: (deckId: string, payload: { front: string; back: string }) =>
    request<{ card: Flashcard }>(`/study/decks/${deckId}/cards`, { method: 'POST', body: JSON.stringify(payload) }),
  reviewCard: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') =>
    request<{ card: Flashcard }>(`/study/cards/${cardId}/review`, { method: 'POST', body: JSON.stringify({ rating }) }),

  getQuizzes: () => request<{ quizzes: Quiz[] }>('/study/quizzes'),
  getQuiz: (id: string) => request<{ quiz: Quiz; questions: any[] }>(`/study/quizzes/${id}`),
  submitQuiz: (id: string, answers: Record<string, string>, timeSpentSeconds: number) =>
    request<{ score: number; total: number; percentage: number }>(`/study/quizzes/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, timeSpentSeconds }),
    }),

  getNotes: () => request<{ notes: Note[] }>('/study/notes'),
  createNote: (payload: any) =>
    request<{ note: Note }>('/study/notes', { method: 'POST', body: JSON.stringify(payload) }),
  deleteNote: (id: string) => request<{ success: boolean }>(`/study/notes/${id}`, { method: 'DELETE' }),

  getAnalytics: () => request<{ analytics: any }>('/study/analytics'),

  getAIRecommendations: () =>
    request<{ recommendations: AIRecommendation[] }>('/study/ai-recommendations'),
  generateAIRecommendations: () =>
    request<{ recommendations: AIRecommendation[] }>('/study/ai-recommendations/generate', { method: 'POST' }),
};

// -----------------------------------------------------------------------------
// Admin API
// -----------------------------------------------------------------------------
export const adminApi = {
  getOverview: () =>
    request<{ users: any; activity: any; recentAuditLogs: AuditLog[] }>('/admin/overview'),
  getUsers: () => request<{ users: any[] }>('/admin/users'),
  updateUserRole: (id: string, role: 'user' | 'admin') =>
    request<{ success: boolean; user: any }>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  updateUserStatus: (id: string, isActive: boolean) =>
    request<{ success: boolean }>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  unlockUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/admin/users/${id}/unlock`, {
      method: 'POST',
    }),
  getSystemHealth: () => request<any>('/admin/system-health'),
  getAuditLogs: () => request<{ logs: AuditLog[] }>('/admin/audit-logs'),
};
