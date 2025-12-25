import { MetadataRoute } from 'next';
import manifestData from '@/data/manifest.json';

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
    pages: string[];
}

const manifest = manifestData as Document[];

// Base URL for the site
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://epstein-files.com';

/**
 * Generate dynamic sitemap for all documents.
 * Next.js automatically handles sitemap index generation if the sitemap exceeds 50,000 URLs.
 * 
 * For 10,588 documents, this will generate a single sitemap.xml file.
 * Each document page is included with appropriate priority and change frequency.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    // Static pages with highest priority
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/bookmarks`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.3,
        },
        {
            url: `${BASE_URL}/analytics`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.4,
        },
    ];

    // Document pages - each document gets its own entry
    // Priority scaled by page count (more pages = potentially more valuable content)
    const documentPages: MetadataRoute.Sitemap = manifest.map((doc) => {
        // Higher priority for multi-page documents (more content)
        // Range: 0.6 (1 page) to 0.9 (50+ pages)
        const basePriority = 0.6;
        const pageBonus = Math.min(doc.pageCount / 50, 1) * 0.3;
        const priority = Math.round((basePriority + pageBonus) * 10) / 10;

        return {
            url: `${BASE_URL}/viewer/${doc.id}`,
            lastModified: new Date('2025-12-20'), // DOJ release date
            changeFrequency: 'weekly' as const,
            priority: Math.min(priority, 0.9),
        };
    });

    return [...staticPages, ...documentPages];
}

/**
 * Sitemap configuration
 * This tells Next.js to generate the sitemap at build time and cache it.
 */
export const dynamic = 'force-static';
export const revalidate = 86400; // Revalidate daily (24 hours)
