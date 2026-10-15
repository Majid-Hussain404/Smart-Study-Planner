import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// For running migrations, direct (unpooled) connection is preferred to support DDL operations and locks
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
});
