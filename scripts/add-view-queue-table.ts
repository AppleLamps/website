import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = neon(process.env.DATABASE_URL);

async function addViewQueueTable() {
  try {
    console.log('Adding view_queue table...');

    // Create view_queue table for batched analytics processing
    await sql`
      CREATE TABLE IF NOT EXISTS view_queue (
        id SERIAL PRIMARY KEY,
        document_id TEXT NOT NULL,
        queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Created view_queue table');

    // Create index for efficient queue processing
    await sql`CREATE INDEX IF NOT EXISTS idx_view_queue_queued_at ON view_queue(queued_at)`;
    console.log('Created index on view_queue');

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error adding view_queue table:', error);
    process.exit(1);
  }
}

addViewQueueTable();

