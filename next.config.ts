import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
    // Increase cache TTL to reduce re-optimizations (1 year max)
    minimumCacheTTL: 31536000,
    // Optimize device sizes for better caching
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Use WebP format for better compression
    formats: ['image/webp'],
    // Configure allowed quality values used throughout the application
    qualities: [65, 70, 75, 85],
  },
};

export default nextConfig;
