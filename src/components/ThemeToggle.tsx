'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useSyncExternalStore } from 'react';

// Hydration-safe mounted check using useSyncExternalStore
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title="Toggle Theme"
        >
            {/* Avoid hydration mismatch: theme is resolved client-side by next-themes */}
            <span className="inline-flex h-5 w-5 items-center justify-center" aria-hidden="true">
                {mounted ? (isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />) : null}
            </span>
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}
