import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from './schema/index.js';

// Load environment variables
dotenv.config();

// Use pooled connection if available, or fallback to unpooled
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || '';

if (!connectionString) {
  console.warn('⚠️ [Database Warning] DATABASE_URL is not set in environment variables.');
}

// For application requests: connect with SSL required for Neon PostgreSQL
export const client = connectionString
  ? postgres(connectionString, {
      ssl: 'require',
      max: process.env.NODE_ENV === 'production' ? 20 : 10,
      idle_timeout: 30,
      connect_timeout: 30,
    })
  : (null as unknown as postgres.Sql);

export const db = client ? drizzle(client, { schema }) : (null as any);

export { schema };
