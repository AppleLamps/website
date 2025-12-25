import { MetadataRoute } from 'next';
import manifestData from '@/data/manifest.json';

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
}

const manifest = manifestData as Document[];

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://epstein-files.com';

export default function sitemap(): MetadataRoute.Sitemap {
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

    const documentPages: MetadataRoute.Sitemap = manifest.map((doc) => {
        const basePriority = 0.6;
        const pageBonus = Math.min(doc.pageCount / 50, 1) * 0.3;
        const priority = Math.round((basePriority + pageBonus) * 10) / 10;

        return {
            url: `${BASE_URL}/files/${doc.id}`,
            lastModified: new Date('2025-12-20'),
            changeFrequency: 'weekly' as const,
            priority: Math.min(priority, 0.9),
        };
    });

    return [...staticPages, ...documentPages];
}

export const dynamic = 'force-static';
export const revalidate = 86400;
