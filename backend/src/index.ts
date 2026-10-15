import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { client } from './db/index.js';
import { authRouter } from './routes/auth.routes.js';
import { studyRouter } from './routes/study.routes.js';
import { adminRouter } from './routes/admin.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

// Trust proxy for IP rate limiting behind reverse proxies (Vercel, Render, Railway, Nginx)
app.set('trust proxy', 1);

// Middleware
app.use(
  cors({
    origin: [APP_BASE_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// -----------------------------------------------------------------------------
// Health Check Routes
// -----------------------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Smart Study Planner API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health/db', async (_req: Request, res: Response) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      status: 'error',
      connected: false,
      message: 'DATABASE_URL environment variable is missing in backend/.env',
      troubleshooting: 'Check backend/.env for DATABASE_URL configuration.',
    });
  }

  try {
    const result = await client`
      SELECT 1 as connected, NOW() as server_time, current_database() as database_name, version() as pg_version
    `;

    return res.json({
      status: 'healthy',
      connected: true,
      message: 'Successfully connected to Neon PostgreSQL database!',
      details: {
        database: result[0]?.database_name,
        serverTime: result[0]?.server_time,
        version: result[0]?.pg_version,
      },
    });
  } catch (error: any) {
    console.error('❌ Database health check failed:', error);
    return res.status(500).json({
      status: 'unhealthy',
      connected: false,
      message: 'Failed to connect to Neon PostgreSQL database.',
      error: error.message || String(error),
    });
  }
});

// -----------------------------------------------------------------------------
// API Routers
// -----------------------------------------------------------------------------
app.use('/api/auth', authRouter);
app.use('/api/study', studyRouter);
app.use('/api/admin', adminRouter);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.send('Smart Study Planner API is running. Check /api/health and /api/health/db');
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected server error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Smart Study Planner backend server listening on http://localhost:${PORT}`);
  console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Database Health URL: http://localhost:${PORT}/api/health/db`);
});
