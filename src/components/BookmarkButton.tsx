'use client';

import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';

interface BookmarkButtonProps {
    documentId: string;
}

export default function BookmarkButton({ documentId }: BookmarkButtonProps) {
    const [isBookmarked, setIsBookmarked] = useState(false);

    useEffect(() => {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        setIsBookmarked(bookmarks.includes(documentId));
    }, [documentId]);

    const toggleBookmark = () => {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        let newBookmarks;

        if (isBookmarked) {
            newBookmarks = bookmarks.filter((id: string) => id !== documentId);
        } else {
            newBookmarks = [...bookmarks, documentId];
        }

        localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
        setIsBookmarked(!isBookmarked);

        // Dispatch a custom event so other components (like a sidebar or home page) can react
        window.dispatchEvent(new Event('bookmarksUpdated'));
    };

    return (
        <button
            onClick={toggleBookmark}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                ${isBookmarked
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/50'
                    : 'bg-card text-muted border-border hover:border-blue-500/50 hover:text-blue-500 hover:bg-blue-500/5'
                }
                border
            `}
            title={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
        >
            <Bookmark
                className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''} transition-transform duration-300 ${isBookmarked ? 'scale-110' : ''}`}
            />
            <span className="hidden sm:inline font-medium">
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </span>
        </button>
    );
}
