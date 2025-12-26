import manifestData from '@/data/manifest.json';
import DocumentGrid from '@/components/DocumentGrid';
import Header from '@/components/Header';
import { getAllDocumentStats } from '@/app/actions';
import { Metadata } from 'next';

interface Document {
  id: string;
  title: string;
  pageCount: number;
  thumbnail: string;
}

const manifest = manifestData as Document[];

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://epsteinphotos.vercel.app';

// Calculate total pages across all documents
const totalPages = manifest.reduce((sum, doc) => sum + doc.pageCount, 0);

/**
 * Homepage-specific metadata for SEO.
 * Overrides default layout metadata with more specific homepage content.
 */
export const metadata: Metadata = {
  title: 'Epstein Files Browser - Browse 10,588 DOJ Documents | December 2025 Release',
  description: `Search and browse ${manifest.length.toLocaleString()} publicly released Epstein case documents (${totalPages.toLocaleString()} pages) from the December 2025 DOJ release. Free access to official court records, photos, and files.`,
  keywords: [
    'Epstein files',
    'Epstein documents 2025',
    'DOJ Epstein release',
    'Epstein case files',
    'December 2025 Epstein',
    'Epstein photos',
    'Epstein court documents',
    'Maxwell trial documents',
    'SDNY Epstein files',
    'Epstein public records',
    'browse Epstein files',
    'search Epstein documents',
  ],
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: 'Epstein Files Browser - Official DOJ Document Archive',
    description: `Browse ${manifest.length.toLocaleString()} publicly released Epstein case documents. December 2025 DOJ release.`,
    url: BASE_URL,
    type: 'website',
  },
};

// Revalidate every 5 minutes (matches stats cache duration)
export const revalidate = 300;

/**
 * Generate ItemList structured data for document collection.
 * This helps Google understand the collection and may enable rich results.
 */
function generateHomeStructuredData() {
  // Take first 10 documents for the ItemList (Google recommendation)
  const featuredDocs = manifest.slice(0, 10);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Epstein DOJ Document Archive',
    description: `Collection of ${manifest.length.toLocaleString()} publicly released documents from the Epstein case.`,
    numberOfItems: manifest.length,
    itemListElement: featuredDocs.map((doc, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'DigitalDocument',
        '@id': `${BASE_URL}/files/${doc.id}`,
        name: `Document ${doc.id}`,
        url: `${BASE_URL}/files/${doc.id}`,
        thumbnailUrl: doc.thumbnail,
        numberOfPages: doc.pageCount,
      },
    })),
  };
}

export default async function Home() {
  // Fetch stats server-side (cached for 5 minutes)
  const stats = await getAllDocumentStats();
  const structuredData = generateHomeStructuredData();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
      {/* Homepage-specific structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      
      <Header />

      <main className="container mx-auto px-4 md:px-6 py-8">
        {/* SEO-friendly intro section */}
        <section className="mb-8 text-center max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Epstein Files Browser
          </h1>
          <p className="text-muted text-sm sm:text-base">
            Browse and search {manifest.length.toLocaleString()} publicly released documents 
            ({totalPages.toLocaleString()} pages) from the December 2025 DOJ release. 
            Official U.S. Department of Justice records from the Epstein case.
          </p>
        </section>

        {manifest.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="bg-card p-8 rounded-2xl border border-border max-w-md w-full">
              <h2 className="text-2xl font-bold text-foreground mb-2">No documents found</h2>
              <p className="text-muted mb-6">
                Run the conversion script to process your PDFs and populate the archive.
              </p>
              <div className="bg-background p-4 rounded-lg border border-border text-left">
                <code className="text-sm font-mono text-blue-400">
                  npx tsx scripts/convert-pdfs.ts
                </code>
              </div>
            </div>
          </div>
        ) : (
          <DocumentGrid documents={manifest} initialStats={stats} />
        )}
      </main>

      {/* SEO footer with additional context */}
      <footer className="border-t border-border mt-16 py-8 px-4">
        <div className="container mx-auto max-w-4xl text-center text-xs text-muted space-y-2">
          <p>
            This archive contains {manifest.length.toLocaleString()} documents publicly released by the 
            U.S. Department of Justice in December 2025 as part of the Epstein case proceedings.
          </p>
          <p>
            All documents are public records. Source:{' '}
            <a 
              href="https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400"
            >
              U.S. Attorney&apos;s Office, Southern District of New York
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
