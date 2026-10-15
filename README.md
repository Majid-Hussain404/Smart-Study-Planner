# Smart Study Planner 📚✨

A full-stack, intelligent study planning and memory retention application built with **React 19**, **TypeScript**, **Tailwind CSS**, **Node.js + Express**, and **Neon Serverless PostgreSQL** managed via **Drizzle ORM**.

---

## 🚀 Key Features

* **Tailored Learner Profiles**: Specialized workflows for School students, University/College undergraduates, Competitive Exam candidates, Professional Certification seekers, Language learners, and Self-directed learners.
* **Interactive Pomodoro & Focus Timer**: Real-time study timer with Pomodoro (25m), Deep Work (50m), and Quick Review (15m) modes that logs study minutes straight to Neon PostgreSQL.
* **Spaced Repetition Flashcards (SuperMemo SM-2)**: Interactive 3D flip cards that compute optimal review intervals based on recall difficulty (Again, Hard, Good, Easy).
* **Syllabus & Confidence Tracker**: Hierarchical Subjects and Topics with 1–5 star confidence indicators to isolate and drill weak areas.
* **Timed Diagnostic Quizzes**: Multiple-choice assessments with instant grading and attempt history.
* **Notes & Reference Sheets**: Markdown-supported notes with search, tagging, and pin controls.
* **AI-Assisted Study Insights**: Automated recommendations tailored to target exam dates and student confidence scores.
* **Bank-Grade Authentication**:
  * **Argon2id** password hashing.
  * Server-managed sessions with cryptographically random **256-bit opaque token hashes** (SHA-256 in DB, raw token in HttpOnly cookie).
  * **5-Attempt / 30-Second Security Lockout**: Enforced atomically in PostgreSQL with live countdown timers.
* **Three-Tier Role Management**: `user`, `admin`, and `owner` with a secure one-time CLI setup script and PostgreSQL administrative audit logging.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS, Lucide Icons |
| **Backend API** | Node.js, Express, TypeScript, tsx |
| **Database** | Neon Serverless PostgreSQL (Postgres 16/18) |
| **ORM & Migrations** | Drizzle ORM, Drizzle Kit |
| **Security & Auth** | @node-rs/argon2, Crypto (256-bit tokens), Cookie-Parser, Zod |

---

## 📋 Prerequisites

* **Node.js**: v18+ (tested on v24.21.0)
* **npm**: v9+ (tested on v11.19.0)
* **Neon Account**: Free account at [neon.tech](https://neon.tech/)

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and configure:

```properties
PORT=5000
NODE_ENV=development
API_BASE_URL=http://localhost:5000
APP_BASE_URL=http://localhost:5173

# Neon Database Connection Strings
# 1. Pooled connection string (used for normal app queries):
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxxxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# 2. Direct unpooled connection string (used for Drizzle schema migrations):
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Strong 64-character session secret:
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="your_generated_64_character_hex_secret"

# Secret token used by CLI to seed the first owner account:
OWNER_SETUP_SECRET="your_owner_setup_key_2026"
```

---

## 💻 Local Development Setup

### 1. Clone & Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Run Database Migrations

Apply the version-controlled Drizzle migration files to your Neon PostgreSQL database:

```bash
cd backend
npm run db:migrate
```

### 3. Verify Database Health Check

Start the backend:
```bash
npm run dev
```

Visit the live database health endpoint in your browser:
[http://localhost:5000/api/health/db](http://localhost:5000/api/health/db)

You should see:
```json
{
  "status": "healthy",
  "connected": true,
  "message": "Successfully connected to Neon PostgreSQL database!",
  "details": {
    "database": "neondb",
    "version": "PostgreSQL 18.6..."
  }
}
```

### 4. Bootstrap the Platform Owner (CLI)

Run the secure, one-time owner initialization command:

```bash
npm run seed:owner admin@studyplanner.com Password123! "Master Admin" your_owner_setup_key_2026
```

### 5. Start Frontend Development Server

In another terminal:
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser!

---

## 🔒 Security Architecture & Lockout Policy

1. **5 Failed Attempts $\rightarrow$ 30-Second Lockout**:
   * Evaluated atomically in PostgreSQL via `login_attempts` table.
   * If an attacker or user enters an incorrect password 5 consecutive times, the account is locked for 30 seconds.
   * Concurrent requests cannot bypass the lockout because state is updated via an atomic SQL `UPSERT` with `RETURNING`.
   * A live ticking countdown is displayed to the user based on `lockedUntil`.
2. **Opaque Server Sessions**:
   * Stored in the `sessions` table.
   * The browser only receives a 256-bit cryptographically secure random token in an `HttpOnly`, `SameSite=Lax` cookie.
   * The database stores only the SHA-256 hash of the token.
3. **Role-Based Access Control (RBAC)**:
   * `user`: Standard student access.
   * `admin`: Access to `/admin` overview, active sessions, and audit logs.
   * `owner`: Full administrative rights, including role promotion/demotion. Only one owner can be bootstrapped via CLI.

---

## 🚢 Deployment Guide

### Deploy Backend to Render or Railway
1. Push code to your private GitHub repository `smart-study-planner`.
2. Create a new **Web Service** on [Render](https://render.com/) or [Railway](https://railway.app/).
3. Set the Root Directory to `backend`.
4. Build Command: `npm install && npm run build`
5. Start Command: `npm run start`
6. Add all environment variables from `backend/.env` into your service settings.
7. Run migrations during deployment: add `npm run db:migrate` to your build command.

### Deploy Frontend to Vercel
1. Create a new project on [Vercel](https://vercel.com/) and link your repository.
2. Root Directory: `frontend`.
3. Framework Preset: `Vite`.
4. Environment Variable: `VITE_API_BASE_URL` $\rightarrow$ `https://your-backend-service.onrender.com/api`.
5. Deploy!
