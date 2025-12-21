'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { likeDocument } from '@/app/actions';

interface LikeButtonProps {
    documentId: string;
    initialLikes: number;
}

export default function LikeButton({ documentId, initialLikes }: LikeButtonProps) {
    const [likes, setLikes] = useState(initialLikes);
    const [isPending, startTransition] = useTransition();
    const [hasLiked, setHasLiked] = useState(false);

    const handleLike = () => {
        if (hasLiked) return; // Prevent multiple likes in same session for simple UX

        // Optimistic update
        setLikes(prev => prev + 1);
        setHasLiked(true);

        startTransition(async () => {
            try {
                await likeDocument(documentId);
            } catch (error) {
                // Revert on failure
                setLikes(prev => prev - 1);
                setHasLiked(false);
                console.error('Failed to like document:', error);
            }
        });
    };

    return (
        <button
            onClick={handleLike}
            disabled={isPending || hasLiked}
            className={`
        flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
        ${hasLiked
                    ? 'bg-pink-500/10 text-pink-500 border-pink-500/50'
                    : 'bg-card text-muted border-border hover:border-pink-500/50 hover:text-pink-500 hover:bg-pink-500/5'
                }
        border
      `}
        >
            <Heart
                className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''} transition-transform duration-300 ${hasLiked ? 'scale-110' : 'group-hover:scale-110'}`}
            />
            <span className="font-medium tabular-nums">{likes}</span>
        </button>
    );
}
