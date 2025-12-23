'use server';

import { neon } from '@neondatabase/serverless';
import { revalidatePath, unstable_cache } from 'next/cache';
import manifestData from '@/data/manifest.json';
import type { Comment, CommenterStats, DashboardStats, DocumentAnalytics, TimeSeriesData } from '@/app/shared';
import { MAX_COMMENT_LENGTH, MAX_USERNAME_LENGTH } from '@/app/shared';

type SqlRow = Record<string, unknown>;

function toInt(value: unknown, fallback: number = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}

function toString(value: unknown, fallback: string = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function toDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date(0);
}

const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }
    const db = neon(process.env.DATABASE_URL);
    return db(strings, ...(values as unknown[]));
};

// Simple sanitization to prevent XSS - strips HTML tags
function sanitize(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

async function fetchComments(documentId: string): Promise<Comment[]> {
    const comments = (await sql`
    SELECT * FROM comments 
    WHERE document_id = ${documentId} 
    ORDER BY created_at DESC
  `) as unknown as SqlRow[];

    // Organize into threads
    const commentMap = new Map<number, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create objects and map
    comments.forEach((c) => {
        const id = toInt(c.id);
        const comment: Comment = {
            id,
            document_id: toString(c.document_id),
            username: toString(c.username),
            content: toString(c.content),
            parent_id: c.parent_id === null ? null : toInt(c.parent_id),
            created_at: toDate(c.created_at),
            likes: toInt(c.likes),
            replies: [],
        };
        commentMap.set(id, comment);
    });

    // Second pass: link parents and children
    // We need to process in a way that ensures parents exist, but since we fetched all for the doc,
    // we can just iterate. However, sorting by created_at DESC might mean children come before parents
    // if we just iterate. But map lookup is O(1).

    // Actually, simpler approach:
    // 1. Get all comments
    // 2. Filter roots (parent_id is null)
    // 3. Recursively populate replies? Or just one level deep for now?
    // Let's do arbitrary depth using the map.

    // Re-sort by ID or Created At ASC for threading logic usually works better, 
    // but let's stick to the map.

    const allComments = Array.from(commentMap.values());
    // Sort by date ASC to ensure conversation flow in replies
    allComments.sort((a, b) => toDate(a.created_at).getTime() - toDate(b.created_at).getTime());

    allComments.forEach(comment => {
        if (comment.parent_id) {
            const parent = commentMap.get(comment.parent_id);
            if (parent) {
                parent.replies?.push(comment);
            } else {
                // Orphaned comment (parent deleted?), treat as root or ignore?
                // Treat as root for safety
                rootComments.push(comment);
            }
        } else {
            rootComments.push(comment);
        }
    });

    // Sort roots by date DESC (newest first)
    return rootComments.sort((a, b) => toDate(b.created_at).getTime() - toDate(a.created_at).getTime());
}

// Cache comments with 3 minute TTL
const getCommentsCached = unstable_cache(
    fetchComments,
    ['document-comments'],
    { revalidate: 180 }
);

export async function getComments(documentId: string): Promise<Comment[]> {
    return getCommentsCached(documentId);
}

export async function addComment(documentId: string, username: string, content: string, parentId: number | null = null) {
    if (!username || !content) return;

    const trimmedUsername = username.trim();
    const trimmedContent = content.trim();

    if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
        throw new Error(`Username must be ${MAX_USERNAME_LENGTH} characters or less`);
    }

    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
        throw new Error(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
    }

    const sanitizedUsername = sanitize(trimmedUsername);
    const sanitizedContent = sanitize(trimmedContent);

    await sql`
    INSERT INTO comments (document_id, username, content, parent_id)
    VALUES (${documentId}, ${sanitizedUsername}, ${sanitizedContent}, ${parentId})
  `;

    revalidatePath(`/viewer/${documentId}`);
}

async function fetchDocumentLikes(documentId: string): Promise<number> {
    const result = (await sql`
    SELECT likes FROM document_stats WHERE document_id = ${documentId}
  `) as unknown as SqlRow[];
    return result.length > 0 ? toInt(result[0]?.likes) : 0;
}

// Cache document likes with 5 minute TTL
const getDocumentLikesCached = unstable_cache(
    fetchDocumentLikes,
    ['document-likes'],
    { revalidate: 300 }
);

export async function getDocumentLikes(documentId: string): Promise<number> {
    return getDocumentLikesCached(documentId);
}

export async function likeDocument(documentId: string) {
    // Upsert: Insert if not exists, otherwise update
    await sql`
    INSERT INTO document_stats (document_id, likes)
    VALUES (${documentId}, 1)
    ON CONFLICT (document_id)
    DO UPDATE SET likes = document_stats.likes + 1
  `;

    revalidatePath(`/viewer/${documentId}`);
}

export async function likeComment(commentId: number, documentId: string) {
    await sql`
    UPDATE comments
    SET likes = likes + 1
    WHERE id = ${commentId}
  `;

    revalidatePath(`/viewer/${documentId}`);
}

async function fetchAllDocumentStats(): Promise<Record<string, { likes: number, comments: number }>> {
    try {
        const likesResult = (await sql`SELECT document_id, likes FROM document_stats`) as unknown as SqlRow[];

        const commentsResult = (await sql`
            SELECT document_id, COUNT(*)::int as count 
            FROM comments 
            GROUP BY document_id
        `) as unknown as SqlRow[];

        const stats: Record<string, { likes: number, comments: number }> = {};

        likesResult.forEach((row) => {
            const documentId = toString(row.document_id);
            if (!stats[documentId]) stats[documentId] = { likes: 0, comments: 0 };
            stats[documentId].likes = toInt(row.likes);
        });

        commentsResult.forEach((row) => {
            const documentId = toString(row.document_id);
            if (!stats[documentId]) stats[documentId] = { likes: 0, comments: 0 };
            stats[documentId].comments = toInt(row.count);
        });

        return stats;
    } catch (error) {
        console.error('Error fetching document stats:', error);
        return {};
    }
}

// Cache stats for 5 minutes to reduce database load (5x improvement)
const getAllDocumentStatsCached = unstable_cache(fetchAllDocumentStats, ['all-document-stats'], { revalidate: 300 });

export async function getAllDocumentStats() {
    return getAllDocumentStatsCached();
}

// ==================== ANALYTICS ====================

// Track document view (database-backed queue for serverless batching)
export async function trackDocumentView(documentId: string) {
    try {
        // Insert into queue table (fast, non-blocking)
        // The queue will be processed by a cron job
        await sql`
            INSERT INTO view_queue (document_id)
            VALUES (${documentId})
        `;
    } catch (error) {
        // Silently fail - analytics shouldn't break the app
        console.error('Failed to track view:', error);
    }
}

// Process the view queue (called by cron job)
export async function processViewQueue() {
    try {
        // First, get count of items to process
        const countResult = (await sql`
            SELECT COUNT(*)::int as count FROM view_queue
        `) as unknown as SqlRow[];
        const queueCount = toInt(countResult[0]?.count);
        
        if (queueCount === 0) {
            return { processed: 0 };
        }
        
        // Batch insert all queued views into document_views
        await sql`
            INSERT INTO document_views (document_id, viewed_at)
            SELECT document_id, queued_at
            FROM view_queue
            ORDER BY queued_at ASC
        `;
        
        // Delete all processed items from queue
        await sql`DELETE FROM view_queue`;
        
        return { processed: queueCount };
    } catch (error) {
        console.error('Failed to process view queue:', error);
        throw error;
    }
}

// Helper: Enrich analytics with manifest data
function enrichWithManifestData(analytics: SqlRow[]): DocumentAnalytics[] {
    const manifest = manifestData as Array<{ id: string; title: string; pageCount: number; thumbnail: string }>;
    const manifestMap = new Map(manifest.map((doc) => [doc.id, doc]));

    return analytics
        .map((row) => {
            const documentId = toString(row.document_id);
            const doc = manifestMap.get(documentId);
            if (!doc) return null;

            const views = toInt(row.views);
            const likes = toInt(row.likes);
            const comments = toInt(row.comments);
            const replies = toInt(row.comment_replies);

            // Calculate engagement score: weighted combination
            const engagement_score = views * 1 + likes * 5 + comments * 10 + replies * 3;

            return {
                document_id: documentId,
                title: doc.title,
                pageCount: doc.pageCount,
                thumbnail: doc.thumbnail,
                views,
                likes,
                comments,
                comment_replies: replies,
                engagement_score,
            };
        })
        .filter(Boolean) as DocumentAnalytics[];
}

// Get most viewed documents
export async function getMostViewedDocuments(limit: number = 10): Promise<DocumentAnalytics[]> {
    try {
        const result = (await sql`
            SELECT 
                v.document_id,
                COUNT(*)::int as views,
                COALESCE(ds.likes, 0)::int as likes,
                COALESCE(comment_counts.comments, 0)::int as comments,
                COALESCE(reply_counts.replies, 0)::int as comment_replies
            FROM document_views v
            LEFT JOIN document_stats ds ON v.document_id = ds.document_id
            LEFT JOIN (
                SELECT document_id, COUNT(*)::int as comments
                FROM comments
                WHERE parent_id IS NULL
                GROUP BY document_id
            ) comment_counts ON v.document_id = comment_counts.document_id
            LEFT JOIN (
                SELECT document_id, COUNT(*)::int as replies
                FROM comments
                WHERE parent_id IS NOT NULL
                GROUP BY document_id
            ) reply_counts ON v.document_id = reply_counts.document_id
            GROUP BY v.document_id, ds.likes, comment_counts.comments, reply_counts.replies
            ORDER BY views DESC
            LIMIT ${limit}
        `) as unknown as SqlRow[];

        return enrichWithManifestData(result);
    } catch (error) {
        console.error('Error fetching most viewed documents:', error);
        return [];
    }
}

// Get trending discussions (documents with recent comments)
export async function getTrendingDiscussions(limit: number = 10, days: number = 7): Promise<DocumentAnalytics[]> {
    try {
        const result = (await sql`
            SELECT 
                c.document_id,
                COUNT(DISTINCT c.id)::int as comments,
                COUNT(DISTINCT CASE WHEN c.parent_id IS NOT NULL THEN c.id END)::int as comment_replies,
                MAX(c.created_at) as last_comment_at,
                SUM(c.likes)::int as total_comment_likes,
                COALESCE(ds.likes, 0)::int as likes,
                COUNT(DISTINCT v.id)::int as views
            FROM comments c
            LEFT JOIN document_stats ds ON c.document_id = ds.document_id
            LEFT JOIN document_views v ON c.document_id = v.document_id
            WHERE c.created_at >= NOW() - INTERVAL '1 day' * ${days}
            GROUP BY c.document_id, ds.likes
            ORDER BY comments DESC, last_comment_at DESC
            LIMIT ${limit}
        `) as unknown as SqlRow[];

        return enrichWithManifestData(result);
    } catch (error) {
        console.error('Error fetching trending discussions:', error);
        return [];
    }
}

// Get most active commenters
export async function getMostActiveCommenters(limit: number = 20): Promise<CommenterStats[]> {
    try {
        const result = (await sql`
            SELECT 
                username,
                COUNT(*) as total_comments,
                SUM(likes) as total_likes_received,
                COUNT(DISTINCT document_id) as documents_commented,
                MAX(created_at) as recent_activity
            FROM comments
            GROUP BY username
            ORDER BY total_comments DESC, total_likes_received DESC
            LIMIT ${limit}
        `) as unknown as SqlRow[];

        return result.map((row) => ({
            username: toString(row.username),
            total_comments: toInt(row.total_comments),
            total_likes_received: toInt(row.total_likes_received),
            documents_commented: toInt(row.documents_commented),
            recent_activity: toDate(row.recent_activity),
        }));
    } catch (error) {
        console.error('Error fetching active commenters:', error);
        return [];
    }
}

// Helper: Merge time series data
function mergeTimeSeriesData(views: SqlRow[], comments: SqlRow[], likes: SqlRow[]): TimeSeriesData[] {
    const dateMap = new Map<string, TimeSeriesData>();

    views.forEach((row) => {
        const date = toString(row.date);
        dateMap.set(date, { date, views: toInt(row.views), comments: 0, likes: 0 });
    });

    comments.forEach((row) => {
        const date = toString(row.date);
        const existing = dateMap.get(date);
        if (existing) {
            existing.comments = toInt(row.comments);
        } else {
            dateMap.set(date, { date, views: 0, comments: toInt(row.comments), likes: 0 });
        }
    });

    likes.forEach((row) => {
        const date = toString(row.date);
        const existing = dateMap.get(date);
        if (existing) {
            existing.likes = toInt(row.likes);
        } else {
            dateMap.set(date, { date, views: 0, comments: 0, likes: toInt(row.likes) });
        }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Get daily/weekly stats
export async function getTimeSeriesStats(period: 'daily' | 'weekly' = 'daily', days: number = 30): Promise<TimeSeriesData[]> {
    try {
        // Use raw SQL template strings for date formatting
        const viewsQuery = period === 'daily'
            ? sql`
                SELECT 
                    TO_CHAR(viewed_at, 'YYYY-MM-DD') as date,
                    COUNT(*)::int as views
                FROM document_views
                WHERE viewed_at >= NOW() - INTERVAL '1 day' * ${days}
                GROUP BY date
                ORDER BY date ASC
            `
            : sql`
                SELECT 
                    TO_CHAR(viewed_at, 'IYYY-"W"IW') as date,
                    COUNT(*)::int as views
                FROM document_views
                WHERE viewed_at >= NOW() - INTERVAL '1 day' * ${days}
                GROUP BY date
                ORDER BY date ASC
            `;

        const commentsQuery = period === 'daily'
            ? sql`
                SELECT 
                    TO_CHAR(created_at, 'YYYY-MM-DD') as date,
                    COUNT(*)::int as comments
                FROM comments
                WHERE created_at >= NOW() - INTERVAL '1 day' * ${days}
                GROUP BY date
                ORDER BY date ASC
            `
            : sql`
                SELECT 
                    TO_CHAR(created_at, 'IYYY-"W"IW') as date,
                    COUNT(*)::int as comments
                FROM comments
                WHERE created_at >= NOW() - INTERVAL '1 day' * ${days}
                GROUP BY date
                ORDER BY date ASC
            `;

        // For likes tracking, we'll count document_stats entries
        // Since we don't track when likes were added, we'll use a simpler approach
        // and count documents with likes that were viewed in the period
        const likesQuery = period === 'daily'
            ? sql`
                SELECT 
                    TO_CHAR(v.viewed_at, 'YYYY-MM-DD') as date,
                    COUNT(DISTINCT CASE WHEN ds.likes > 0 THEN ds.document_id END)::int as likes
                FROM document_views v
                LEFT JOIN document_stats ds ON v.document_id = ds.document_id
                WHERE v.viewed_at >= NOW() - INTERVAL '1 day' * ${days}
                GROUP BY date
                ORDER BY date ASC
            `
            : sql`
                SELECT 
                    TO_CHAR(v.viewed_at, 'IYYY-"W"IW') as date,
                    COUNT(DISTINCT CASE WHEN ds.likes > 0 THEN ds.document_id END)::int as likes
                FROM document_views v
                LEFT JOIN document_stats ds ON v.document_id = ds.document_id
                WHERE v.viewed_at >= NOW() - INTERVAL '1 day' * ${days}
                GROUP BY date
                ORDER BY date ASC
            `;

        const [viewsResult, commentsResult, likesResult] = await Promise.all([
            viewsQuery,
            commentsQuery,
            likesQuery,
        ]);

        return mergeTimeSeriesData(
            viewsResult as unknown as SqlRow[],
            commentsResult as unknown as SqlRow[],
            likesResult as unknown as SqlRow[],
        );
    } catch (error) {
        console.error('Error fetching time series stats:', error);
        return [];
    }
}

// Get overall dashboard stats
export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        const [totalViews, totalComments, totalLikes, activeUsers, docStats] = await Promise.all([
            sql`SELECT COUNT(*)::int as count FROM document_views`,
            sql`SELECT COUNT(*)::int as count FROM comments`,
            sql`SELECT COALESCE(SUM(likes), 0)::int as count FROM document_stats`,
            sql`SELECT COUNT(DISTINCT username)::int as count FROM comments`,
            sql`
                SELECT 
                    COUNT(DISTINCT v.document_id)::int as docs_with_views,
                    COALESCE(AVG(view_count), 0)::float as avg_views
                FROM (
                    SELECT document_id, COUNT(*)::int as view_count
                    FROM document_views
                    GROUP BY document_id
                ) v
            `,
        ]);

        const manifest = manifestData as Array<{ id: string }>;
        const totalDocuments = manifest.length;

        return {
            total_documents: totalDocuments,
            total_views: toInt((totalViews as unknown as SqlRow[])[0]?.count),
            total_comments: toInt((totalComments as unknown as SqlRow[])[0]?.count),
            total_likes: toInt((totalLikes as unknown as SqlRow[])[0]?.count),
            active_users: toInt((activeUsers as unknown as SqlRow[])[0]?.count),
            avg_engagement_per_doc: (() => {
                const avgViews = (docStats as unknown as SqlRow[])[0]?.avg_views;
                if (typeof avgViews === 'number' && Number.isFinite(avgViews)) return avgViews;
                if (typeof avgViews === 'string') {
                    const parsed = parseFloat(avgViews);
                    return Number.isFinite(parsed) ? parsed : 0;
                }
                return 0;
            })(),
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            total_documents: 0,
            total_views: 0,
            total_comments: 0,
            total_likes: 0,
            active_users: 0,
            avg_engagement_per_doc: 0,
        };
    }
}