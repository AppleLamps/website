import manifestData from '@/data/manifest.json';
import Header from '@/components/Header';
import BookmarksClient from './BookmarksClient';
import { getAllDocumentStats } from '@/app/actions';

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

export default async function BookmarksPage() {
    // Fetch stats server-side (cached for 60 seconds)
    const stats = await getAllDocumentStats();

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
            <Header />

            <main className="container mx-auto px-4 md:px-6 py-8">
                <BookmarksClient allDocuments={manifest} initialStats={stats} />
            </main>
        </div>
    );
}
