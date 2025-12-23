import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = neon(process.env.DATABASE_URL);

async function initDb() {
  try {
    console.log('Initializing database...');

    // Create comments table
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        document_id TEXT NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER REFERENCES comments(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0
      );
    `;
    console.log('Created comments table');

    // Create document_stats table for document likes
    await sql`
      CREATE TABLE IF NOT EXISTS document_stats (
        document_id TEXT PRIMARY KEY,
        likes INTEGER DEFAULT 0
      );
    `;
    console.log('Created document_stats table');

    // Create document_views table for analytics
    await sql`
      CREATE TABLE IF NOT EXISTS document_views (
        id SERIAL PRIMARY KEY,
        document_id TEXT NOT NULL,
        viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Created document_views table');

    // Create Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_document_id ON comments(document_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_views_document_id ON document_views(document_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_views_viewed_at ON document_views(viewed_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_views_document_date ON document_views(document_id, viewed_at DESC)`;
    console.log('Created database indexes');

    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDb();
