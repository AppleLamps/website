import Link from 'next/link';
import manifestData from '@/data/manifest.json';
import { ChevronLeft, Grid } from 'lucide-react';
import { notFound } from 'next/navigation';
import DocumentViewer from '@/components/DocumentViewer';
import CommentSection from '@/components/CommentSection';
import LikeButton from '@/components/LikeButton';
import BookmarkButton from '@/components/BookmarkButton';
import { getComments, getDocumentLikes, Comment } from '@/app/actions';
import { Metadata } from 'next';

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
    pages: string[];
}

const manifest = manifestData as Document[];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const doc = manifest.find((d) => d.id === id);

    if (!doc) {
        return {
            title: "Document Not Found",
        };
    }

    return {
        title: `${doc.title} - Epstein Files Browser`,
        description: `View and discuss "${doc.title}", a ${doc.pageCount}-page document from the public Epstein case archive.`,
        openGraph: {
            title: doc.title,
            description: `Public document archive: ${doc.title}`,
            images: [doc.thumbnail],
        },
    };
}

// export async function generateStaticParams() {
//     return manifest.map((doc) => ({
//         id: doc.id,
//     }));
// }

export default async function ViewerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const doc = manifest.find((d) => d.id === id);

    if (!doc) {
        notFound();
    }

    const docIndex = manifest.findIndex((d) => d.id === id);
    const prevDoc = docIndex > 0 ? manifest[docIndex - 1] : null;
    const nextDoc = docIndex < manifest.length - 1 ? manifest[docIndex + 1] : null;

    // Require pages array from manifest (Vercel Blob URLs)
    if (!doc.pages || doc.pages.length === 0) {
        throw new Error(`Document ${id} is missing page URLs in manifest. Run migration script.`);
    }
    const pages = doc.pages;

    let comments: Comment[] = [];
    let likes = 0;

    try {
        const [fetchedComments, fetchedLikes] = await Promise.all([
            getComments(id),
            getDocumentLikes(id)
        ]);
        comments = fetchedComments;
        likes = fetchedLikes;
    } catch (error) {
        console.error(`Failed to fetch social stats for document ${id}:`, error);
        // Continue rendering the page without comments/likes
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-20 w-full border-b border-border bg-background/50 backdrop-blur-xl px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-muted hover:text-foreground">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-base font-medium truncate max-w-[200px] sm:max-w-md text-foreground">
                        {doc.title}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <BookmarkButton documentId={id} />
                    <LikeButton documentId={id} initialLikes={likes} />
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline text-xs font-mono text-muted mr-2">
                            {doc.pageCount} PAGES
                        </span>
                        <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-muted hover:text-foreground" title="Back to Gallery">
                            <Grid className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Document Viewer */}
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                <DocumentViewer
                    pages={pages}
                    title={doc.title}
                    prevId={prevDoc?.id}
                    nextId={nextDoc?.id}
                />
                <CommentSection documentId={id} initialComments={comments} />
            </main>
        </div>
    );
}
