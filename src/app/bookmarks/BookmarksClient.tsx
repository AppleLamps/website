'use client';

import { useState, useEffect, useMemo } from 'react';
import DocumentGrid from '@/components/DocumentGrid';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
}

interface BookmarksClientProps {
    allDocuments: Document[];
    initialStats?: Record<string, { likes: number, comments: number }>;
}

export default function BookmarksClient({ allDocuments, initialStats }: BookmarksClientProps) {
    const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadBookmarks = () => {
            const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
            setBookmarkedIds(bookmarks);
            setIsLoaded(true);
        };

        loadBookmarks();

        // Listen for bookmark updates
        window.addEventListener('bookmarksUpdated', loadBookmarks);
        return () => window.removeEventListener('bookmarksUpdated', loadBookmarks);
    }, []);

    const bookmarkedDocuments = useMemo(() => {
        return allDocuments.filter(doc => bookmarkedIds.includes(doc.id));
    }, [allDocuments, bookmarkedIds]);

    if (!isLoaded) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-card rounded-full mb-4" />
                    <div className="h-4 w-48 bg-card rounded-full mb-2" />
                    <div className="h-3 w-32 bg-card rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Bookmark className="w-8 h-8 text-blue-500" />
                    My Bookmarks
                </h1>
                <p className="text-muted text-lg">
                    {bookmarkedDocuments.length === 1
                        ? '1 document saved'
                        : `${bookmarkedDocuments.length} documents saved`}
                </p>
            </div>

            {bookmarkedDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="bg-card p-10 rounded-3xl border border-border max-w-md w-full shadow-xl shadow-black/5">
                        <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Bookmark className="w-10 h-10 text-blue-500 opacity-50" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-3">No bookmarks yet</h2>
                        <p className="text-muted mb-8">
                            Documents you bookmark will appear here for quick access.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center px-6 py-3 bg-foreground text-background rounded-xl font-semibold hover:opacity-90 transition-opacity"
                        >
                            Browse Documents
                        </Link>
                    </div>
                </div>
            ) : (
                <DocumentGrid documents={bookmarkedDocuments} initialStats={initialStats} />
            )}
        </div>
    );
}
