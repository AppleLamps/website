'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ZoomIn, ZoomOut, ChevronUp, ChevronDown } from 'lucide-react';

interface DocumentViewerProps {
    pages: string[];
    title: string;
    prevId?: string;
    nextId?: string;
}

export default function DocumentViewer({ pages, title, prevId, nextId }: DocumentViewerProps) {
    const router = useRouter();
    const [zoom, setZoom] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

    const scrollToPage = (pageIndex: number) => {
        const element = pageRefs.current[pageIndex];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setCurrentPage(pageIndex + 1);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                (document.activeElement as HTMLElement)?.isContentEditable
            ) {
                return;
            }

            if (e.key === 'ArrowRight' && nextId) {
                router.push(`/viewer/${nextId}`);
            } else if (e.key === 'ArrowLeft' && prevId) {
                router.push(`/viewer/${prevId}`);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nextId, prevId, router]);

    // Update current page on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-page-index'));
                        setCurrentPage(index + 1);
                    }
                });
            },
            { threshold: 0.5 }
        );

        pageRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [pages]);

    return (
        <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center gap-8 pb-20">
            {/* Floating Controls */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a]/90 backdrop-blur text-gray-200 px-4 py-2 rounded-full shadow-xl flex items-center gap-4 border border-gray-800">
                <div className="flex items-center gap-2 border-r border-gray-800 pr-4">
                    <button onClick={handleZoomOut} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Zoom Out">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono w-12 text-center text-gray-400">{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Zoom In">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => scrollToPage(Math.max(0, currentPage - 2))}
                        disabled={currentPage === 1}
                        className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-gray-400">
                        {currentPage} / {pages.length}
                    </span>
                    <button
                        onClick={() => scrollToPage(Math.min(pages.length - 1, currentPage))}
                        disabled={currentPage === pages.length}
                        className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Pages */}
            {pages.map((page, index) => (
                <div
                    key={index}
                    ref={(el) => { pageRefs.current[index] = el; }}
                    data-page-index={index}
                    className="relative bg-white shadow-2xl rounded-sm overflow-hidden transition-all duration-200 ease-out origin-top"
                    style={{
                        width: `${100 * zoom}%`,
                        maxWidth: '100%', // Prevent overflow on small screens unless zoomed
                        minWidth: '300px'
                    }}
                >
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">
                        Page {index + 1}
                    </div>
                    <Image
                        src={page}
                        alt={`${title} - Page ${index + 1}`}
                        width={1200}
                        height={1600}
                        className="mx-auto object-contain"
                        style={{
                            width: 'auto',
                            height: 'auto',
                            maxWidth: '100%',
                            maxHeight: `calc((100vh - 160px) * ${zoom})`
                        }}
                        priority={index < 2}
                        loading={index < 2 ? "eager" : "lazy"}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                    />
                </div>
            ))}
        </div>
    );
}
