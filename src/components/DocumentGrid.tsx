'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronDown, SortAsc, Loader2, Heart, MessageCircle, FileText, X } from 'lucide-react';

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
}

interface DocumentGridProps {
    documents: Document[];
    initialStats?: Record<string, { likes: number, comments: number }>;
}

const ITEMS_PER_PAGE = 24;
// Number of images to load with priority (above the fold)
const PRIORITY_IMAGE_COUNT = 6;

export default function DocumentGrid({ documents, initialStats }: DocumentGridProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'pages' | 'likes' | 'comments'>('name');
    // Use initialStats if provided (server-side), otherwise default to empty object
    const stats = useMemo(() => initialStats ?? {}, [initialStats]);

    // Infinite scroll state
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const filteredLengthRef = useRef(0);
    const observerRef = useRef<IntersectionObserver | null>(null);

    const filteredDocuments = useMemo(() => {
        const docs = documents.filter((doc) =>
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.id.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (sortBy === 'name') {
            return [...docs].sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'pages') {
            return [...docs].sort((a, b) => b.pageCount - a.pageCount);
        } else if (sortBy === 'likes') {
            return [...docs].sort((a, b) => (stats[b.id]?.likes || 0) - (stats[a.id]?.likes || 0));
        } else if (sortBy === 'comments') {
            return [...docs].sort((a, b) => (stats[b.id]?.comments || 0) - (stats[a.id]?.comments || 0));
        }

        return docs;
    }, [documents, searchQuery, sortBy, stats]);

    // Update ref when filtered documents change
    useEffect(() => {
        filteredLengthRef.current = filteredDocuments.length;
    }, [filteredDocuments.length]);

    // Keep the observer callback stable, but always read latest values from refs.
    const setObserverTarget = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }

        if (!node) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting) return;

                setVisibleCount((prev) => {
                    const maxLength = filteredLengthRef.current;
                    if (prev >= maxLength) return prev;
                    return Math.min(prev + ITEMS_PER_PAGE, maxLength);
                });
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        observerRef.current.observe(node);
    }, []);

    useEffect(() => {
        return () => {
            observerRef.current?.disconnect();
            observerRef.current = null;
        };
    }, []);

    const visibleDocuments = useMemo(() => {
        return filteredDocuments.slice(0, visibleCount);
    }, [filteredDocuments, visibleCount]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setVisibleCount(ITEMS_PER_PAGE);
    };

    const handleSortChange = (newSort: 'name' | 'pages' | 'likes' | 'comments') => {
        setSortBy(newSort);
        setVisibleCount(ITEMS_PER_PAGE);
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border sm:sticky sm:top-20 sm:z-40 shadow-xl shadow-black/5 backdrop-blur-sm bg-card/90">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="relative group">
                        <button
                            className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
                        >
                            <SortAsc className="h-4 w-4" />
                            <span>
                                {sortBy === 'name' && 'Sort by Name'}
                                {sortBy === 'pages' && 'Sort by Pages'}
                                {sortBy === 'likes' && 'Most Liked'}
                                {sortBy === 'comments' && 'Most Discussed'}
                            </span>
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>

                        <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                            <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                                <button onClick={() => handleSortChange('name')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-[#222]">Name</button>
                                <button onClick={() => handleSortChange('pages')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-[#222]">Page Count</button>
                                <button onClick={() => handleSortChange('likes')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-[#222]">Most Liked</button>
                                <button onClick={() => handleSortChange('comments')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-[#222]">Most Discussed</button>
                            </div>
                        </div>
                    </div>

                    <div className="px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono text-muted">
                        {filteredDocuments.length.toLocaleString()} files
                    </div>
                </div>
            </div>

            {/* Grid */}
            {visibleDocuments.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {visibleDocuments.map((doc, index) => (
                            <Link key={doc.id} href={`/viewer/${doc.id}`} className="group flex flex-col gap-2">
                                <div className="aspect-[3/4] w-full bg-card rounded-xl overflow-hidden border border-border group-hover:border-gray-400 dark:group-hover:border-gray-600 transition-colors relative shadow-sm">
                                    <Image
                                        src={doc.thumbnail}
                                        alt={doc.title}
                                        fill
                                        priority={index < PRIORITY_IMAGE_COUNT}
                                        quality={65}
                                        className="object-cover opacity-90 dark:opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                                    />
                                </div>
                                <div className="px-1 space-y-1">
                                    <h3 className="text-sm font-medium text-foreground leading-tight line-clamp-2 group-hover:text-blue-500 transition-colors">
                                        {doc.title}
                                    </h3>
                                    <div className="flex items-center justify-between text-xs text-muted">
                                        <div className="flex items-center gap-1" title={`${doc.pageCount} pages`}>
                                            <FileText className="w-3 h-3" />
                                            <span>{doc.pageCount}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1" title={`${stats[doc.id]?.likes || 0} likes`}>
                                                <Heart className="w-3 h-3" />
                                                <span>{stats[doc.id]?.likes || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1" title={`${stats[doc.id]?.comments || 0} comments`}>
                                                <MessageCircle className="w-3 h-3" />
                                                <span>{stats[doc.id]?.comments || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Loading trigger / indicator */}
                    {visibleCount < filteredDocuments.length && (
                        <div ref={setObserverTarget} className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium mb-2">No documents found</p>
                    <p className="text-sm mb-6">
                        We couldn&apos;t find any matches for &quot;{searchQuery}&quot;
                    </p>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setVisibleCount(ITEMS_PER_PAGE);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                        Clear Search
                    </button>
                </div>
            )}
        </div>
    );
}
