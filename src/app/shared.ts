export const MAX_COMMENT_LENGTH = 1500;
export const MAX_USERNAME_LENGTH = 20;

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

export interface DocumentAnalytics {
    document_id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
    views: number;
    likes: number;
    comments: number;
    comment_replies: number;
    engagement_score: number;
}

export interface CommenterStats {
    username: string;
    total_comments: number;
    total_likes_received: number;
    documents_commented: number;
    recent_activity: Date;
}

export interface TimeSeriesData {
    date: string;
    views: number;
    comments: number;
    likes: number;
}

export interface DashboardStats {
    total_documents: number;
    total_views: number;
    total_comments: number;
    total_likes: number;
    active_users: number;
    avg_engagement_per_doc: number;
}


