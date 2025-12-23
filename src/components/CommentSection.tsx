'use client';

import { useState, useTransition, useEffect } from 'react';
import { Heart, MessageCircle, Reply, Send, User } from 'lucide-react';
import type { Comment } from '@/app/shared';
import { MAX_COMMENT_LENGTH, MAX_USERNAME_LENGTH } from '@/app/shared';
import { addComment, likeComment } from '@/app/actions';
import { formatDistanceToNow } from 'date-fns';

interface CommentSectionProps {
    documentId: string;
    initialComments: Comment[];
}

function CommentItem({
    comment,
    documentId,
    onReply
}: {
    comment: Comment;
    documentId: string;
    onReply: (id: number) => void;
}) {
    const [likes, setLikes] = useState(comment.likes);
    const [hasLiked, setHasLiked] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleLike = () => {
        if (hasLiked) return;

        setLikes(prev => prev + 1);
        setHasLiked(true);

        startTransition(async () => {
            try {
                await likeComment(comment.id, documentId);
            } catch {
                setLikes(prev => prev - 1);
                setHasLiked(false);
            }
        });
    };

    return (
        <div className="flex gap-3 mt-6">
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground">@{comment.username}</span>
                    <span className="text-xs text-muted">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                </div>
                <p className="text-foreground/90 text-sm whitespace-pre-wrap break-words">{comment.content}</p>

                <div className="flex items-center gap-4 mt-2">
                    <button
                        onClick={handleLike}
                        disabled={hasLiked || isPending}
                        className={`flex items-center gap-1.5 text-xs transition-colors group ${hasLiked ? 'text-pink-500' : 'text-muted hover:text-pink-500'
                            }`}
                    >
                        <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : 'group-hover:fill-pink-500'}`} />
                        <span>{likes}</span>
                    </button>

                    <button
                        onClick={() => onReply(comment.id)}
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-blue-400 transition-colors"
                    >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CommentSection({ documentId, initialComments }: CommentSectionProps) {
    const [username, setUsername] = useState('');
    const [isUsernameLocked, setIsUsernameLocked] = useState(false);
    const [content, setContent] = useState('');
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCommenting, setIsCommenting] = useState(false);

    useEffect(() => {
        const savedUsername = localStorage.getItem('comment_username');
        if (savedUsername) {
            setUsername(savedUsername);
            setIsUsernameLocked(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent, parentId: number | null = null) => {
        e.preventDefault();
        if (!username.trim() || !content.trim()) return;

        localStorage.setItem('comment_username', username.trim());
        setIsUsernameLocked(true);

        setIsSubmitting(true);
        try {
            await addComment(documentId, username, content, parentId);
            setContent('');
            setReplyingTo(null);
            if (!parentId) setIsCommenting(false);
        } catch (error: unknown) {
            console.error('Failed to post comment:', error);
            const message = error instanceof Error ? error.message : 'Failed to post comment';
            alert(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnlockUsername = () => {
        if (confirm('Are you sure you want to change your username? This will affect future comments.')) {
            setIsUsernameLocked(false);
        }
    };

    // Recursive render helper
    const renderCommentTree = (comments: Comment[], isReply = false) => {
        return comments.map((comment) => (
            <div key={comment.id} className={isReply ? 'ml-8 border-l-2 border-border pl-4' : ''}>
                <CommentItem
                    comment={comment}
                    documentId={documentId}
                    onReply={setReplyingTo}
                />

                {/* Reply Form */}
                {replyingTo === comment.id && (
                    <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-3 ml-11 animate-in fade-in slide-in-from-top-2 mb-4">
                        <div className="flex gap-2">
                            {isUsernameLocked ? (
                                <div className="bg-background border border-border rounded px-3 py-2 text-sm text-muted w-1/3 flex items-center justify-between">
                                    <span className="truncate">@{username}</span>
                                </div>
                            ) : (
                                <div className="relative w-1/3">
                                    <input
                                        type="text"
                                        placeholder="Your X username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        maxLength={MAX_USERNAME_LENGTH}
                                        className={`bg-background border border-border rounded px-3 py-2 text-sm text-foreground w-full focus:outline-none ${username.trim().length > MAX_USERNAME_LENGTH ? 'border-red-500' : 'focus:border-blue-500'}`}
                                        required
                                    />
                                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${username.trim().length > MAX_USERNAME_LENGTH ? 'text-red-500 font-medium' : 'text-muted'}`}>
                                        {username.trim().length}/{MAX_USERNAME_LENGTH}
                                    </span>
                                </div>
                            )}
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Write a reply..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    maxLength={MAX_COMMENT_LENGTH}
                                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500"
                                    required
                                    autoFocus
                                />
                                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${content.length > (MAX_COMMENT_LENGTH - 100) ? 'text-orange-500' : 'text-muted'}`}>
                                    {content.length > (MAX_COMMENT_LENGTH - 100) && `${content.length}/${MAX_COMMENT_LENGTH}`}
                                </span>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || content.length > MAX_COMMENT_LENGTH || username.trim().length > MAX_USERNAME_LENGTH}
                                className="bg-foreground text-background hover:bg-gray-200 dark:hover:bg-gray-300 px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                )}

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2">
                        {renderCommentTree(comment.replies, true)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-8 pb-20">
            {!isCommenting && (
                <div className="flex justify-center mb-8">
                    <button
                        onClick={() => setIsCommenting(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-card hover:bg-gray-100 dark:hover:bg-[#252525] text-foreground rounded-full border border-border transition-all hover:border-gray-400 dark:hover:border-gray-700 shadow-lg"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>Add a Comment</span>
                    </button>
                </div>
            )}

            <div className="border-t border-border pt-8">
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-6">
                    <MessageCircle className="w-5 h-5" />
                    Discussion
                </h3>

                {/* Main Comment Form */}
                {isCommenting && (
                    <form onSubmit={(e) => handleSubmit(e)} className="bg-card p-4 rounded-xl border border-border mb-8 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-muted mb-1 uppercase tracking-wider font-semibold">Username</label>
                                {isUsernameLocked ? (
                                    <div className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2 text-sm text-foreground">
                                            <span className="text-muted">@</span>
                                            <span className="font-medium">{username}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleUnlockUsername}
                                            className="text-xs text-muted hover:text-foreground transition-colors"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted text-sm">@</span>
                                        <input
                                            type="text"
                                            placeholder="elonmusk"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            maxLength={MAX_USERNAME_LENGTH}
                                            className={`w-full bg-background border rounded-lg pl-7 pr-10 py-2 text-sm text-foreground focus:outline-none transition-colors ${username.trim().length > MAX_USERNAME_LENGTH ? 'border-red-500' : 'border-border focus:border-blue-500'}`}
                                            required
                                        />
                                        <span className={`absolute right-3 top-2.5 text-xs ${username.trim().length > MAX_USERNAME_LENGTH ? 'text-red-500 font-medium' : 'text-muted'}`}>
                                            {username.trim().length}/{MAX_USERNAME_LENGTH}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs text-muted uppercase tracking-wider font-semibold">Comment</label>
                                    <span className={`text-xs ${content.length > MAX_COMMENT_LENGTH ? 'text-red-500 font-medium' : 'text-muted'}`}>
                                        {content.length}/{MAX_COMMENT_LENGTH}
                                    </span>
                                </div>
                                <textarea
                                    placeholder="What do you think about this document?"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    maxLength={MAX_COMMENT_LENGTH}
                                    className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground min-h-[80px] focus:outline-none transition-colors resize-y ${content.length > MAX_COMMENT_LENGTH ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-blue-500'}`}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCommenting(false)}
                                    className="text-muted hover:text-foreground px-4 py-2 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || content.length > MAX_COMMENT_LENGTH || username.trim().length > MAX_USERNAME_LENGTH}
                                    className="bg-foreground text-background hover:bg-gray-200 dark:hover:bg-gray-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Comments List */}
                <div className="space-y-2">
                    {initialComments.length === 0 ? (
                        <p className="text-center text-muted py-8">No comments yet. Be the first to share your thoughts!</p>
                    ) : (
                        renderCommentTree(initialComments)
                    )}
                </div>
            </div>
        </div>
    );
}
