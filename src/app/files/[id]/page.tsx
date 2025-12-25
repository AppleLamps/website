import Link from 'next/link';
import manifestData from '@/data/manifest.json';
import { ChevronLeft, Grid, AlertTriangle, FileText, Calendar, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import DocumentViewer from '@/components/DocumentViewer';
import CommentSection from '@/components/CommentSection';
import LikeButton from '@/components/LikeButton';
import BookmarkButton from '@/components/BookmarkButton';
import { Metadata } from 'next';

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
    pages: string[];
}

const manifest = manifestData as Document[];

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://epstein-files.com';
const DOJ_SOURCE_URL = 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell';

const STATIC_BUILD_COUNT = 2000;

export function generateStaticParams(): Array<{ id: string }> {
    return manifest.slice(0, STATIC_BUILD_COUNT).map((doc) => ({ id: doc.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const doc = manifest.find((d) => d.id === id);

    if (!doc) {
        return {
            title: 'File Not Found - Epstein Files Browser',
            description: 'The requested file could not be found in the archive.',
        };
    }

    const canonicalUrl = `${BASE_URL}/files/${doc.id}`;

    const seoTitle = `Jeffrey Epstein DOJ File ${doc.id} - Official December 2025 Release`;
    const seoDescription = `Official DOJ file ${doc.id} from the December 2025 Epstein release. Public record; may contain sensitive content. View ${doc.pageCount} page${doc.pageCount === 1 ? '' : 's'}.`;

    return {
        title: seoTitle,
        description: seoDescription,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: seoTitle,
            description: seoDescription,
            url: canonicalUrl,
            siteName: 'Epstein Files Browser',
            type: 'article',
            images: [
                {
                    url: doc.thumbnail,
                    width: 1200,
                    height: 630,
                    alt: `First page of DOJ file ${doc.id}`,
                },
            ],
            locale: 'en_US',
        },
        twitter: {
            card: 'summary_large_image',
            title: seoTitle,
            description: seoDescription,
            images: [doc.thumbnail],
        },
        robots: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    };
}

export const dynamicParams = true;
export const revalidate = 3600;

function generateStructuredData(doc: Document, docIndex: number, canonicalUrl: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'DigitalDocument',
        '@id': canonicalUrl,
        name: `DOJ File ${doc.id} - Epstein Release`,
        description: `Official ${doc.pageCount}-page DOJ public record from the December 2025 release. Content may be sensitive.`,
        url: canonicalUrl,
        thumbnailUrl: doc.thumbnail,
        numberOfPages: doc.pageCount,
        datePublished: '2025-12-20',
        dateModified: '2025-12-20',
        inLanguage: 'en',
        isAccessibleForFree: true,
        license: 'https://www.usa.gov/government-works',
        publisher: {
            '@type': 'GovernmentOrganization',
            name: 'U.S. Department of Justice',
            url: 'https://www.justice.gov',
        },
        provider: {
            '@type': 'WebSite',
            name: 'Epstein Files Browser',
            url: BASE_URL,
        },
        position: docIndex + 1,
        isPartOf: {
            '@type': 'Collection',
            name: 'Epstein DOJ Document Archive',
            description: `Collection of ${manifest.length.toLocaleString()} publicly released files from the Epstein case.`,
            url: BASE_URL,
            numberOfItems: manifest.length,
        },
        potentialAction: {
            '@type': 'ViewAction',
            target: canonicalUrl,
            name: 'View File',
        },
    };
}

function generateBreadcrumbData(doc: Document, canonicalUrl: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: BASE_URL,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Files',
                item: BASE_URL,
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: doc.id,
                item: canonicalUrl,
            },
        ],
    };
}

function getRelatedDocuments(docIndex: number, currentId: string): Document[] {
    const results: Document[] = [];

    for (let offset = -3; offset <= 3; offset++) {
        if (offset === 0) continue;
        const neighbor = manifest[docIndex + offset];
        if (!neighbor) continue;
        if (neighbor.id === currentId) continue;
        results.push(neighbor);
    }

    const seed = Array.from(currentId).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const batchSize = Math.min(STATIC_BUILD_COUNT, manifest.length);

    for (let i = 0; results.length < 10 && i < batchSize; i++) {
        const idx = (seed + i * 97) % batchSize;
        const candidate = manifest[idx];
        if (!candidate) continue;
        if (candidate.id === currentId) continue;
        if (results.some((d) => d.id === candidate.id)) continue;
        results.push(candidate);
    }

    return results.slice(0, 10);
}

export default async function FilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const doc = manifest.find((d) => d.id === id);

    if (!doc) {
        notFound();
    }

    const docIndex = manifest.findIndex((d) => d.id === id);
    const prevDoc = docIndex > 0 ? manifest[docIndex - 1] : null;
    const nextDoc = docIndex < manifest.length - 1 ? manifest[docIndex + 1] : null;

    if (!doc.pages || doc.pages.length === 0) {
        throw new Error(`Document ${id} is missing page URLs in manifest. Run migration script.`);
    }

    const canonicalUrl = `${BASE_URL}/files/${doc.id}`;
    const structuredData = generateStructuredData(doc, docIndex, canonicalUrl);
    const breadcrumbData = generateBreadcrumbData(doc, canonicalUrl);
    const relatedDocs = getRelatedDocuments(docIndex, doc.id);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbData),
                }}
            />

            <div className="min-h-screen bg-background text-foreground flex flex-col">
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
                        <LikeButton documentId={id} initialLikes={0} />
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

                <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-600 dark:text-amber-400">Content Warning</p>
                            <p className="text-muted mt-1">
                                This is an official U.S. Department of Justice public record. Content may be sensitive.
                                Please respect victim privacy.
                            </p>
                        </div>
                    </div>

                    <div className="mb-6 p-4 bg-card border border-border rounded-lg">
                        <div className="flex flex-wrap gap-4 text-sm text-muted">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span><strong className="text-foreground">{doc.pageCount}</strong> pages</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>Released <strong className="text-foreground">December 2025</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-background px-2 py-1 rounded">
                                    File {(docIndex + 1).toLocaleString()} of {manifest.length.toLocaleString()}
                                </span>
                            </div>
                            <a 
                                href={DOJ_SOURCE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors ml-auto"
                            >
                                <ExternalLink className="w-3 h-3" />
                                <span className="text-xs">DOJ Source</span>
                            </a>
                        </div>
                    </div>

                    <DocumentViewer
                        pages={doc.pages}
                        title={doc.title}
                        prevId={prevDoc?.id}
                        nextId={nextDoc?.id}
                        routeBase="/files"
                    />

                    <div className="mt-8 p-4 bg-card border border-border rounded-lg">
                        <h2 className="text-sm font-medium text-foreground mb-3">Related Files</h2>
                        <div className="flex flex-wrap gap-2">
                            {relatedDocs.map((related) => (
                                <Link 
                                    key={related.id}
                                    href={`/files/${related.id}`}
                                    className="text-xs px-3 py-1.5 bg-background border border-border rounded-full hover:border-gray-400 transition-colors"
                                >
                                    {related.id}
                                </Link>
                            ))}
                            <Link 
                                href="/"
                                className="text-xs px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-500 rounded-full hover:bg-blue-500/20 transition-colors"
                            >
                                View All {manifest.length.toLocaleString()} Files
                            </Link>
                        </div>
                    </div>

                    <CommentSection documentId={id} initialComments={[]} />
                </main>
            </div>
        </>
    );
}
