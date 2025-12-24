import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = neon(process.env.DATABASE_URL);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if ((rl as any).closed) {
      reject(new Error('Readline interface is closed'));
      return;
    }
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

async function showStats() {
  console.log('\n📊 Current Analytics Statistics:\n');
  
  try {
    const [viewStats, commentStats, likeStats, queueStats] = await Promise.all([
      sql`SELECT COUNT(*)::int as total, COUNT(DISTINCT document_id)::int as documents FROM document_views`,
      sql`SELECT COUNT(*)::int as total, COUNT(DISTINCT document_id)::int as documents FROM comments`,
      sql`SELECT COUNT(*)::int as total, COALESCE(SUM(likes), 0)::int as total_likes FROM document_stats`,
      sql`SELECT COUNT(*)::int as total FROM view_queue`,
    ]);

    const views = viewStats[0] as { total: number; documents: number };
    const comments = commentStats[0] as { total: number; documents: number };
    const likes = likeStats[0] as { total: number; total_likes: number };
    const queue = queueStats[0] as { total: number };

    console.log(`  Views:        ${views.total.toLocaleString()} total views across ${views.documents} documents`);
    console.log(`  Comments:     ${comments.total.toLocaleString()} total comments on ${comments.documents} documents`);
    console.log(`  Likes:        ${likes.total.toLocaleString()} documents with likes (${likes.total_likes.toLocaleString()} total likes)`);
    console.log(`  Queue:        ${queue.total.toLocaleString()} views pending processing`);
    
    // Show top 5 most viewed documents
    const topViews = await sql`
      SELECT document_id, COUNT(*)::int as views
      FROM document_views
      GROUP BY document_id
      ORDER BY views DESC
      LIMIT 5
    `;
    
    if (topViews.length > 0) {
      console.log('\n  Top 5 Most Viewed Documents:');
      topViews.forEach((doc: any, i: number) => {
        console.log(`    ${i + 1}. ${doc.document_id}: ${doc.views.toLocaleString()} views`);
      });
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

async function cleanupViews() {
  console.log('\n🗑️  Cleaning up view analytics...');
  
  try {
    // Get counts before deletion
    const [viewsCountResult, queueCountResult] = await Promise.all([
      sql`SELECT COUNT(*)::int as count FROM document_views`,
      sql`SELECT COUNT(*)::int as count FROM view_queue`,
    ]);
    
    const viewsCount = (viewsCountResult[0] as { count: number })?.count || 0;
    const queueCount = (queueCountResult[0] as { count: number })?.count || 0;
    
    // Delete the data
    await sql`DELETE FROM document_views`;
    await sql`DELETE FROM view_queue`;
    
    console.log(`  ✅ Deleted ${viewsCount.toLocaleString()} view records`);
    console.log(`  ✅ Deleted ${queueCount.toLocaleString()} queued views`);
    console.log('\n  View analytics have been reset.');
  } catch (error) {
    console.error('Error cleaning up views:', error);
    throw error;
  }
}

async function cleanupComments() {
  console.log('\n🗑️  Cleaning up comments...');
  
  try {
    // Get count before deletion
    const countResult = await sql`SELECT COUNT(*)::int as count FROM comments`;
    const count = (countResult[0] as { count: number })?.count || 0;
    
    // Delete the data
    await sql`DELETE FROM comments`;
    
    console.log(`  ✅ Deleted ${count.toLocaleString()} comments`);
    console.log('\n  Comments have been reset.');
  } catch (error) {
    console.error('Error cleaning up comments:', error);
    throw error;
  }
}

async function cleanupLikes() {
  console.log('\n🗑️  Cleaning up likes...');
  
  try {
    // Get count before deletion
    const countResult = await sql`SELECT COUNT(*)::int as count FROM document_stats`;
    const count = (countResult[0] as { count: number })?.count || 0;
    
    // Delete the data
    await sql`DELETE FROM document_stats`;
    
    console.log(`  ✅ Deleted ${count.toLocaleString()} document like records`);
    console.log('\n  Likes have been reset.');
  } catch (error) {
    console.error('Error cleaning up likes:', error);
    throw error;
  }
}

async function cleanupAll() {
  console.log('\n🗑️  Cleaning up ALL analytics data...');
  
  try {
    await cleanupViews();
    await cleanupComments();
    await cleanupLikes();
    console.log('\n  ✅ All analytics data has been reset.');
  } catch (error) {
    console.error('Error cleaning up all data:', error);
    throw error;
  }
}

async function main() {
  console.log('🧹 Analytics Cleanup Script\n');
  console.log('This script allows you to view and clean up analytics data.\n');

  await showStats();

  // Check for command line argument
  const args = process.argv.slice(2);
  let choice: string;

  if (args.length > 0) {
    choice = args[0];
    console.log(`\nUsing command line argument: ${choice}`);
  } else {
    console.log('\n📋 Cleanup Options:');
    console.log('  1. Delete all view analytics (views only)');
    console.log('  2. Delete all comments');
    console.log('  3. Delete all likes');
    console.log('  4. Delete ALL analytics data (views + comments + likes)');
    console.log('  5. Show stats only (no cleanup)');
    console.log('  6. Exit');
    console.log('\n💡 Tip: You can also pass the choice as an argument: npm run cleanup-analytics -- 4');

    try {
      choice = await question('\nEnter your choice (1-6): ');
    } catch (error) {
      console.error('\nError reading input. Please run with an argument: npm run cleanup-analytics -- 4');
      if (!(rl as any).closed) {
        rl.close();
      }
      process.exit(1);
    }
  }

  switch (choice.trim()) {
    case '1':
      let confirm1: string;
      if (args.length > 1 && args[1] === '--yes') {
        confirm1 = 'yes';
      } else {
        try {
          confirm1 = await question('\n⚠️  Are you sure you want to delete all view analytics? (yes/no): ');
        } catch {
          console.log('\n⚠️  Interactive mode not available. Use: npm run cleanup-analytics -- 1 --yes');
          if (!(rl as any).closed) rl.close();
          process.exit(1);
        }
      }
      if (confirm1.toLowerCase() === 'yes') {
        await cleanupViews();
        await showStats();
      } else {
        console.log('Cancelled.');
      }
      break;

    case '2':
      let confirm2: string;
      if (args.length > 1 && args[1] === '--yes') {
        confirm2 = 'yes';
      } else {
        try {
          confirm2 = await question('\n⚠️  Are you sure you want to delete all comments? (yes/no): ');
        } catch {
          console.log('\n⚠️  Interactive mode not available. Use: npm run cleanup-analytics -- 2 --yes');
          if (!(rl as any).closed) rl.close();
          process.exit(1);
        }
      }
      if (confirm2.toLowerCase() === 'yes') {
        await cleanupComments();
        await showStats();
      } else {
        console.log('Cancelled.');
      }
      break;

    case '3':
      let confirm3: string;
      if (args.length > 1 && args[1] === '--yes') {
        confirm3 = 'yes';
      } else {
        try {
          confirm3 = await question('\n⚠️  Are you sure you want to delete all likes? (yes/no): ');
        } catch {
          console.log('\n⚠️  Interactive mode not available. Use: npm run cleanup-analytics -- 3 --yes');
          if (!(rl as any).closed) rl.close();
          process.exit(1);
        }
      }
      if (confirm3.toLowerCase() === 'yes') {
        await cleanupLikes();
        await showStats();
      } else {
        console.log('Cancelled.');
      }
      break;

    case '4':
      let confirm4: string;
      if (args.length > 1 && args[1] === '--yes') {
        confirm4 = 'yes';
        console.log('\n⚠️  ⚠️  WARNING: Deleting ALL analytics data (views, comments, and likes)...');
      } else {
        try {
          confirm4 = await question('\n⚠️  ⚠️  WARNING: This will delete ALL analytics data (views, comments, and likes). Are you sure? (yes/no): ');
        } catch {
          console.log('\n⚠️  Interactive mode not available. Use: npm run cleanup-analytics -- 4 --yes');
          if (!(rl as any).closed) rl.close();
          process.exit(1);
        }
      }
      if (confirm4.toLowerCase() === 'yes') {
        await cleanupAll();
        await showStats();
      } else {
        console.log('Cancelled.');
      }
      break;

    case '5':
      // Stats already shown
      break;

    case '6':
      console.log('Exiting...');
      break;

    default:
      console.log('Invalid choice. Exiting...');
  }

  if (!(rl as any).closed) {
    rl.close();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  if (!(rl as any).closed) {
    rl.close();
  }
  process.exit(1);
});

