import Link from 'next/link';
import { Github } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/50 backdrop-blur-xl">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground">
                        Epstein Files Browser
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/analytics"
                        className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                    >
                        Analytics
                    </Link>
                    <Link
                        href="/bookmarks"
                        className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                    >
                        Bookmarks
                    </Link>
                    <ThemeToggle />
                    <Link
                        href="https://github.com/RhysSullivan/epstein-files-browser"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <Github className="h-5 w-5" />
                        <span className="sr-only">GitHub</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}
