'use client';

import { useState, useTransition, useEffect } from 'react';
import { Heart, MessageCircle, Reply, Send, User } from 'lucide-react';
import { Comment, addComment, likeComment } from '@/app/actions';
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
            } catch (error) {
                setLikes(prev => prev - 1);
                setHasLiked(false);
            }
        });
    };

    return (
        <div className="flex gap-3 mt-6">
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-200">@{comment.username}</span>
                    <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">{comment.content}</p>

                <div className="flex items-center gap-4 mt-2">
                    <button
                        onClick={handleLike}
                        disabled={hasLiked || isPending}
                        className={`flex items-center gap-1.5 text-xs transition-colors group ${hasLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'
                            }`}
                    >
                        <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : 'group-hover:fill-pink-500'}`} />
                        <span>{likes}</span>
                    </button>

                    <button
                        onClick={() => onReply(comment.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 transition-colors"
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
        } catch (error) {
            console.error('Failed to post comment:', error);
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
            <div key={comment.id} className={isReply ? 'ml-8 border-l-2 border-gray-800 pl-4' : ''}>
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
                                <div className="bg-[#1a1a1a] border border-gray-800 rounded px-3 py-2 text-sm text-gray-400 w-1/3 flex items-center justify-between">
                                    <span className="truncate">@{username}</span>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Your X username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="bg-[#1a1a1a] border border-gray-800 rounded px-3 py-2 text-sm text-white w-1/3 focus:outline-none focus:border-blue-500"
                                    required
                                />
                            )}
                            <input
                                type="text"
                                placeholder="Write a reply..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="bg-[#1a1a1a] border border-gray-800 rounded px-3 py-2 text-sm text-white flex-1 focus:outline-none focus:border-blue-500"
                                required
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-white text-black hover:bg-gray-200 px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors"
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
                        className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] hover:bg-[#252525] text-gray-200 rounded-full border border-gray-800 transition-all hover:border-gray-700 shadow-lg"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>Add a Comment</span>
                    </button>
                </div>
            )}

            <div className="border-t border-gray-800 pt-8">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
                    <MessageCircle className="w-5 h-5" />
                    Discussion
                </h3>

                {/* Main Comment Form */}
                {isCommenting && (
                    <form onSubmit={(e) => handleSubmit(e)} className="bg-[#111] p-4 rounded-xl border border-gray-800 mb-8 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Username</label>
                                {isUsernameLocked ? (
                                    <div className="flex items-center justify-between bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2 text-sm text-white">
                                            <span className="text-gray-500">@</span>
                                            <span className="font-medium">{username}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleUnlockUsername}
                                            className="text-xs text-gray-500 hover:text-white transition-colors"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500 text-sm">@</span>
                                        <input
                                            type="text"
                                            placeholder="elonmusk"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Comment</label>
                                <textarea
                                    placeholder="What do you think about this document?"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white min-h-[80px] focus:outline-none focus:border-blue-500 transition-colors resize-y"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCommenting(false)}
                                    className="text-gray-400 hover:text-white px-4 py-2 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
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
                        <p className="text-center text-gray-500 py-8">No comments yet. Be the first to share your thoughts!</p>
                    ) : (
                        renderCommentTree(initialComments)
                    )}
                </div>
            </div>
        </div>
    );
}
