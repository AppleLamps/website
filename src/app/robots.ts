import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://epsteinphotos.vercel.app';

/**
 * Generate robots.txt for crawler guidance.
 * 
 * Allows all crawlers to access public pages while blocking:
 * - API routes (internal functionality)
 * - Cron endpoints (scheduled tasks)
 * 
 * Points crawlers to the sitemap for efficient discovery of all 10,588+ document pages.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',           // Block API routes
                    '/_next/',         // Block Next.js internals
                    '/bookmarks',      // User-specific page (localStorage-based)
                ],
            },
            {
                // Googlebot-specific rules for faster crawling
                userAgent: 'Googlebot',
                allow: '/',
                disallow: [
                    '/api/',
                    '/_next/',
                    '/bookmarks',
                ],
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    };
}
