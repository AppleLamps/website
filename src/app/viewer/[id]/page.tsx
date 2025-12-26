import Link from 'next/link';
import manifestData from '@/data/manifest.json';
import { ChevronLeft, Grid, AlertTriangle, FileText, Calendar, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import DocumentViewer from '@/components/DocumentViewer';
import CommentSection from '@/components/CommentSection';
import LikeButton from '@/components/LikeButton';
import BookmarkButton from '@/components/BookmarkButton';
import { getComments, getDocumentLikes, trackDocumentView } from '@/app/actions';
import type { Comment } from '@/app/shared';
import { Metadata } from 'next';

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
    pages: string[];
}

const manifest = manifestData as Document[];

// Base URL for canonical links and structured data
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://epsteinphotos.vercel.app';

// DOJ source URL for attribution
const DOJ_SOURCE_URL = 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell';

/**
 * Generate SEO-optimized metadata for each document page.
 * Includes canonical URL, Open Graph, Twitter cards, and improved descriptions.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const doc = manifest.find((d) => d.id === id);
    const docIndex = manifest.findIndex((d) => d.id === id);

    if (!doc) {
        return {
            title: 'Document Not Found - Epstein Files Browser',
            description: 'The requested document could not be found in the archive.',
        };
    }

    // Generate varied, SEO-rich descriptions based on document characteristics
    const pageDescription = doc.pageCount === 1 
        ? 'single-page document'
        : `${doc.pageCount}-page document`;
    
    // Create unique, keyword-rich title and description
    const seoTitle = `${doc.id} - Epstein DOJ Document | ${doc.pageCount} Pages | Official Release`;
    const seoDescription = `View ${doc.id}, a ${pageDescription} from the December 2025 DOJ Epstein files release. Document ${docIndex + 1} of ${manifest.length.toLocaleString()} in the public archive. Browse, search, and discuss official court records.`;

    const canonicalUrl = `${BASE_URL}/viewer/${doc.id}`;

    return {
        title: seoTitle,
        description: seoDescription,
        keywords: [
            'Epstein files',
            'DOJ documents',
            'Epstein case',
            doc.id,
            'December 2025 release',
            'public records',
            'court documents',
            'Maxwell trial',
            'SDNY documents',
        ].join(', '),
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: `${doc.id} - Epstein Files | Official DOJ Document`,
            description: `Official ${pageDescription} from the DOJ Epstein case files. Part of the December 2025 public release.`,
            url: canonicalUrl,
            siteName: 'Epstein Files Browser',
            type: 'article',
            images: [
                {
                    url: doc.thumbnail,
                    width: 1200,
                    height: 630,
                    alt: `First page of document ${doc.id} from Epstein DOJ files`,
                },
            ],
            locale: 'en_US',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${doc.id} - Epstein DOJ Files`,
            description: `${doc.pageCount}-page document from the December 2025 DOJ release. View official Epstein case records.`,
            images: [doc.thumbnail],
        },
        robots: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
        other: {
            'article:published_time': '2025-12-20T00:00:00Z',
            'article:section': 'Legal Documents',
        },
    };
}

// Use on-demand ISR instead of pre-generating all 10k+ pages at build time.
// Pages are generated on first request and cached for 1 hour.
// This dramatically reduces build time while maintaining good performance.
export const dynamicParams = true;
export const revalidate = 3600;

/**
 * Generate JSON-LD structured data for the document.
 * Uses schema.org DigitalDocument type for rich search results.
 */
function generateStructuredData(doc: Document, docIndex: number, canonicalUrl: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'DigitalDocument',
        '@id': canonicalUrl,
        name: `Document ${doc.id} - Epstein DOJ Files`,
        description: `Official ${doc.pageCount}-page document from the December 2025 DOJ Epstein case files release.`,
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
            description: `Collection of ${manifest.length.toLocaleString()} publicly released documents from the Epstein case.`,
            url: BASE_URL,
            numberOfItems: manifest.length,
        },
        potentialAction: {
            '@type': 'ViewAction',
            target: canonicalUrl,
            name: 'View Document',
        },
    };
}

/**
 * Generate BreadcrumbList structured data for navigation.
 */
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
                name: 'Documents',
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

    // Track document view (non-blocking)
    trackDocumentView(id).catch(console.error);

    const canonicalUrl = `${BASE_URL}/viewer/${doc.id}`;
    const structuredData = generateStructuredData(doc, docIndex, canonicalUrl);
    const breadcrumbData = generateBreadcrumbData(doc, canonicalUrl);

    return (
        <>
            {/* JSON-LD Structured Data for SEO */}
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
                    {/* Content Advisory Banner */}
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-600 dark:text-amber-400">Content Advisory</p>
                            <p className="text-muted mt-1">
                                This is an official public record from the U.S. Department of Justice. 
                                Content may be sensitive. Please respect victim privacy.
                            </p>
                        </div>
                    </div>

                    {/* Document Info Panel - SEO-rich content */}
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
                                    Doc {(docIndex + 1).toLocaleString()} of {manifest.length.toLocaleString()}
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
                        pages={pages}
                        title={doc.title}
                        prevId={prevDoc?.id}
                        nextId={nextDoc?.id}
                    />
                    
                    {/* Related Documents Section for Internal Linking */}
                    <div className="mt-8 p-4 bg-card border border-border rounded-lg">
                        <h2 className="text-sm font-medium text-foreground mb-3">Browse More Documents</h2>
                        <div className="flex flex-wrap gap-2">
                            {prevDoc && (
                                <Link 
                                    href={`/viewer/${prevDoc.id}`}
                                    className="text-xs px-3 py-1.5 bg-background border border-border rounded-full hover:border-gray-400 transition-colors"
                                >
                                    ← {prevDoc.id}
                                </Link>
                            )}
                            {nextDoc && (
                                <Link 
                                    href={`/viewer/${nextDoc.id}`}
                                    className="text-xs px-3 py-1.5 bg-background border border-border rounded-full hover:border-gray-400 transition-colors"
                                >
                                    {nextDoc.id} →
                                </Link>
                            )}
                            <Link 
                                href="/"
                                className="text-xs px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-500 rounded-full hover:bg-blue-500/20 transition-colors"
                            >
                                View All {manifest.length.toLocaleString()} Documents
                            </Link>
                        </div>
                    </div>

                    <CommentSection documentId={id} initialComments={comments} />
                </main>
            </div>
        </>
    );
}
