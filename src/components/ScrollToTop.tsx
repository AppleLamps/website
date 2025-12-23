'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setIsVisible(window.scrollY > 300);
        };

        // Initialize on mount
        onScroll();

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={[
                'fixed bottom-4 right-4 z-50',
                'sm:hidden',
                'rounded-full border border-border bg-card/90 backdrop-blur',
                'text-foreground shadow-lg shadow-black/20',
                'transition-all',
                isVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none',
            ].join(' ')}
            aria-label="Back to top"
            title="Back to top"
        >
            <span className="inline-flex items-center justify-center w-11 h-11">
                <ArrowUp className="h-5 w-5" />
            </span>
        </button>
    );
}
