import manifestData from '@/data/manifest.json';
import Header from '@/components/Header';
import BookmarksClient from './BookmarksClient';

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
}

const manifest = manifestData as Document[];

export const metadata = {
    title: 'Bookmarks | Epstein Files Browser',
    description: 'View your saved documents from the Epstein Files archive.',
};

export default function BookmarksPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
            <Header />

            <main className="container mx-auto px-4 md:px-6 py-8">
                <BookmarksClient allDocuments={manifest} />
            </main>
        </div>
    );
}
