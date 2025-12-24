import Link from 'next/link';
import { Github, BarChart2, Bookmark } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/50 backdrop-blur-xl">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl tracking-tight text-foreground">
                        <span className="sm:hidden">Epstein Files</span>
                        <span className="hidden sm:inline">Epstein Files Browser</span>
                    </Link>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <Link
                        href="/analytics"
                        className="text-sm font-medium text-muted hover:text-foreground transition-colors flex items-center gap-2"
                        title="Analytics"
                    >
                        <BarChart2 className="h-5 w-5 sm:hidden" />
                        <span className="hidden sm:inline">Analytics</span>
                    </Link>
                    <Link
                        href="/bookmarks"
                        className="text-sm font-medium text-muted hover:text-foreground transition-colors flex items-center gap-2"
                        title="Bookmarks"
                    >
                        <Bookmark className="h-5 w-5 sm:hidden" />
                        <span className="hidden sm:inline">Bookmarks</span>
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
