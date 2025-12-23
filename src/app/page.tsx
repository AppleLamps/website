import manifestData from '@/data/manifest.json';
import DocumentGrid from '@/components/DocumentGrid';
import Header from '@/components/Header';
import { getAllDocumentStats } from '@/app/actions';

interface Document {
  id: string;
  title: string;
  pageCount: number;
  thumbnail: string;
}

const manifest = manifestData as Document[];

// Revalidate every 5 minutes (matches stats cache duration)
export const revalidate = 300;

export default async function Home() {
  // Fetch stats server-side (cached for 5 minutes)
  const stats = await getAllDocumentStats();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
      <Header />

      <main className="container mx-auto px-4 md:px-6 py-8">
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
    </div>
  );
}
