'use server';

import { neon } from '@neondatabase/serverless';
import { revalidatePath, unstable_cache } from 'next/cache';
import DOMPurify from 'isomorphic-dompurify';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

const sql = neon(process.env.DATABASE_URL);

export interface Comment {
    id: number;
    document_id: string;
    username: string;
    content: string;
    parent_id: number | null;
    created_at: Date;
    likes: number;
    replies?: Comment[];
}

export async function getComments(documentId: string): Promise<Comment[]> {
    const comments = await sql`
    SELECT * FROM comments 
    WHERE document_id = ${documentId} 
    ORDER BY created_at DESC
  `;

    // Organize into threads
    const commentMap = new Map<number, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create objects and map
    comments.forEach((c: any) => {
        const comment = { ...c, replies: [] } as Comment;
        commentMap.set(comment.id, comment);
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
    allComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

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
    return rootComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function addComment(documentId: string, username: string, content: string, parentId: number | null = null) {
    if (!username || !content) return;

    const sanitizedUsername = DOMPurify.sanitize(username.trim());
    const sanitizedContent = DOMPurify.sanitize(content.trim());

    await sql`
    INSERT INTO comments (document_id, username, content, parent_id)
    VALUES (${documentId}, ${sanitizedUsername}, ${sanitizedContent}, ${parentId})
  `;

    revalidatePath(`/viewer/${documentId}`);
}

export async function getDocumentLikes(documentId: string): Promise<number> {
    const result = await sql`
    SELECT likes FROM document_stats WHERE document_id = ${documentId}
  `;
    return result.length > 0 ? result[0].likes : 0;
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

export async function getAllDocumentStats(): Promise<Record<string, { likes: number, comments: number }>> {
    try {
        const likesResult = await sql`SELECT document_id, likes FROM document_stats`;

        const commentsResult = await sql`
            SELECT document_id, COUNT(*) as count 
            FROM comments 
            GROUP BY document_id
        `;

        const stats: Record<string, { likes: number, comments: number }> = {};

        likesResult.forEach((row: any) => {
            if (!stats[row.document_id]) stats[row.document_id] = { likes: 0, comments: 0 };
            stats[row.document_id].likes = row.likes;
        });

        commentsResult.forEach((row: any) => {
            if (!stats[row.document_id]) stats[row.document_id] = { likes: 0, comments: 0 };
            stats[row.document_id].comments = parseInt(row.count);
        });

        return stats;
    } catch (error) {
        console.error('Error fetching document stats:', error);
        return {};
    }
}
