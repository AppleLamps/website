'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronDown, SortAsc, Loader2, Heart, MessageCircle } from 'lucide-react';
import { getAllDocumentStats } from '@/app/actions';

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
}

interface DocumentGridProps {
    documents: Document[];
}

const ITEMS_PER_PAGE = 24;

export default function DocumentGrid({ documents }: DocumentGridProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'pages' | 'likes' | 'comments'>('name');
    const [stats, setStats] = useState<Record<string, { likes: number, comments: number }>>({});

    // Infinite scroll state
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getAllDocumentStats().then(setStats);
    }, []);

    const filteredDocuments = useMemo(() => {
        let docs = documents.filter((doc) =>
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.id.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (sortBy === 'name') {
            docs.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'pages') {
            docs.sort((a, b) => b.pageCount - a.pageCount);
        } else if (sortBy === 'likes') {
            docs.sort((a, b) => (stats[b.id]?.likes || 0) - (stats[a.id]?.likes || 0));
        } else if (sortBy === 'comments') {
            docs.sort((a, b) => (stats[b.id]?.comments || 0) - (stats[a.id]?.comments || 0));
        }

        return docs;
    }, [documents, searchQuery, sortBy, stats]);

    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
    }, [searchQuery, sortBy]);

    const visibleDocuments = useMemo(() => {
        return filteredDocuments.slice(0, visibleCount);
    }, [filteredDocuments, visibleCount]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    // Infinite scroll handler
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < filteredDocuments.length) {
                    // Load more items
                    setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredDocuments.length));
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [visibleCount, filteredDocuments.length]);

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#111] p-4 rounded-xl border border-gray-800 sticky top-20 z-40 shadow-xl shadow-black/20 backdrop-blur-sm bg-[#111]/90">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 focus:border-gray-600 transition-colors"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="relative group">
                        <button
                            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-[#222] transition-colors"
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
                            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-xl overflow-hidden">
                                <button onClick={() => setSortBy('name')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white">Name</button>
                                <button onClick={() => setSortBy('pages')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white">Page Count</button>
                                <button onClick={() => setSortBy('likes')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white">Most Liked</button>
                                <button onClick={() => setSortBy('comments')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white">Most Discussed</button>
                            </div>
                        </div>
                    </div>

                    <div className="px-3 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-sm font-mono text-gray-400">
                        {filteredDocuments.length.toLocaleString()} files
                    </div>
                </div>
            </div>

            {/* Grid */}
            {visibleDocuments.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {visibleDocuments.map((doc) => (
                            <Link key={doc.id} href={`/viewer/${doc.id}`} className="group flex flex-col gap-2">
                                <div className="aspect-[3/4] w-full bg-[#111] rounded-xl overflow-hidden border border-gray-800 group-hover:border-gray-600 transition-colors relative">
                                    <Image
                                        src={doc.thumbnail}
                                        alt={doc.title}
                                        fill
                                        className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                    />

                                    {/* Overlay Stats */}
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-xs text-gray-300">
                                        <div className="flex items-center gap-1">
                                            <Heart className="w-3 h-3 fill-current" />
                                            <span>{stats[doc.id]?.likes || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageCircle className="w-3 h-3 fill-current" />
                                            <span>{stats[doc.id]?.comments || 0}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-1">
                                    <h3 className="text-xs font-mono text-gray-400 group-hover:text-white truncate transition-colors">
                                        {doc.title}
                                    </h3>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Loading trigger / indicator */}
                    {visibleCount < filteredDocuments.length && (
                        <div ref={observerTarget} className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p>No documents found matching "{searchQuery}"</p>
                </div>
            )}
        </div>
    );
}
