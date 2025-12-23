import { processViewQueue } from '@/app/actions';
import { NextResponse } from 'next/server';

// This endpoint is called by Vercel Cron Jobs to batch process view analytics
// Configure in vercel.json or Vercel dashboard to run every minute
export async function GET(request: Request) {
    // Verify the request is from Vercel Cron (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await processViewQueue();
        return NextResponse.json({ 
            success: true, 
            processed: result.processed,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

