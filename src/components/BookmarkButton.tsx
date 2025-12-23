'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Bookmark } from 'lucide-react';

interface BookmarkButtonProps {
    documentId: string;
}

// Cache to prevent infinite loops in useSyncExternalStore
let cachedBookmarks: string[] | null = null;
let cachedRaw: string | null = null;

function readBookmarks(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem('bookmarks');
        
        // Return cached result if localStorage hasn't changed
        if (raw === cachedRaw && cachedBookmarks !== null) {
            return cachedBookmarks;
        }
        
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        const bookmarks = Array.isArray(parsed) 
            ? parsed.filter((v): v is string => typeof v === 'string')
            : [];
        
        // Update cache
        cachedRaw = raw;
        cachedBookmarks = bookmarks;
        
        return bookmarks;
    } catch {
        return [];
    }
}

export default function BookmarkButton({ documentId }: BookmarkButtonProps) {
    const subscribe = useCallback((onStoreChange: () => void) => {
        if (typeof window === 'undefined') return () => {};

        const handler = () => {
            // Invalidate cache when storage changes
            cachedBookmarks = null;
            cachedRaw = null;
            onStoreChange();
        };
        window.addEventListener('storage', handler);
        // Our app dispatches this event when it updates bookmarks.
        window.addEventListener('bookmarksUpdated', handler as EventListener);

        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('bookmarksUpdated', handler as EventListener);
        };
    }, []);

    const bookmarks = useSyncExternalStore(subscribe, readBookmarks, () => []);
    const isBookmarked = bookmarks.includes(documentId);

    const toggleBookmark = () => {
        const currentBookmarks = readBookmarks();
        let newBookmarks: string[];

        if (isBookmarked) {
            newBookmarks = currentBookmarks.filter((id) => id !== documentId);
        } else {
            newBookmarks = [...currentBookmarks, documentId];
        }

        localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));

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
