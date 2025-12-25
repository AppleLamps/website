'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ZoomIn, ZoomOut, ChevronUp, ChevronDown, Share2, Check } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';

interface DocumentViewerProps {
    pages: string[];
    title: string;
    prevId?: string;
    nextId?: string;
    routeBase?: string;
}

export default function DocumentViewer({ pages, title, prevId, nextId, routeBase }: DocumentViewerProps) {
    const router = useRouter();
    const base = routeBase ?? '/viewer';
    const [zoom, setZoom] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [copied, setCopied] = useState(false);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    const handlers = useSwipeable({
        onSwipedLeft: () => nextId && router.push(`${base}/${nextId}`),
        onSwipedRight: () => prevId && router.push(`${base}/${prevId}`),
        preventScrollOnSwipe: true,
        trackMouse: true,
    });

    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: `Check out this document: ${title}`,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

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
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                (document.activeElement as HTMLElement)?.isContentEditable
            ) {
                return;
            }

            if (e.key === 'ArrowRight' && nextId) {
                router.push(`${base}/${nextId}`);
            } else if (e.key === 'ArrowLeft' && prevId) {
                router.push(`${base}/${prevId}`);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nextId, prevId, router, base]);

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
        <div {...handlers} className="relative w-full max-w-6xl mx-auto flex flex-col items-center gap-8 pb-20">
            {/* Floating Controls */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/90 backdrop-blur text-foreground px-4 py-2 rounded-full shadow-xl flex items-center gap-4 border border-border">
                <div className="flex items-center gap-2 border-r border-border pr-4">
                    <button onClick={handleZoomOut} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Zoom Out">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono w-12 text-center text-muted">{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Zoom In">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => scrollToPage(Math.max(0, currentPage - 2))}
                        disabled={currentPage === 1}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors"
                        title="Previous Page"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-muted">
                        {currentPage} / {pages.length}
                    </span>
                    <button
                        onClick={() => scrollToPage(Math.min(pages.length - 1, currentPage))}
                        disabled={currentPage === pages.length}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors"
                        title="Next Page"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2 border-l border-border pl-4">
                    <button
                        onClick={handleShare}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-muted hover:text-foreground"
                        title="Share Document"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Pages */}
            {/* Inline styles required: width is dynamically calculated from zoom state and cannot be moved to CSS */}
            {pages.map((page, index) => (
                <div
                    key={index}
                    ref={(el) => { pageRefs.current[index] = el; }}
                    data-page-index={index}
                    className="relative bg-white shadow-2xl rounded-sm overflow-hidden transition-all duration-200 ease-out origin-top"
                    style={{
                        width: `${100 * zoom}%`,
                        maxWidth: '100%',
                        minWidth: '300px'
                    }}
                >
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">
                        Page {index + 1}
                    </div>
                    <Image
                        src={page}
                        alt={`${title} - Page ${index + 1}`}
                        width={index < 2 ? 1200 : 800}
                        height={index < 2 ? 1600 : 1067}
                        quality={index < 2 ? 85 : 70}
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
