import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function runMigrations() {
  // Use unpooled (direct) connection string for migrations to avoid PgBouncer session limitations
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ [Migration Error] DATABASE_URL_UNPOOLED or DATABASE_URL must be defined in your .env file.');
    process.exit(1);
  }

  console.log('⏳ Connecting to Neon PostgreSQL for database migrations...');
  const migrationClient = postgres(connectionString, { max: 1, ssl: 'require' });
  const db = drizzle(migrationClient);

  try {
    const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
    console.log(`📁 Applying migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log('✨ All migrations successfully applied to Neon database!');
  } catch (error) {
    console.error('❌ Migration execution failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
