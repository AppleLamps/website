# PDF to Image Archive Website

This project is a Next.js application designed to host and display thousands of PDF documents as high-quality WebP images. It features a robust gallery with sorting options, a high-performance document viewer, and interactive community features like comments and likes.

## Features

- **Batch Conversion**: Script to convert PDFs to optimized WebP images.
- **Gallery View**: Browse all processed documents with sorting (Most Liked, Most Discussed, Newest, Oldest).
- **Document Viewer**: High-performance vertical scroll viewer with dynamic rendering.
- **Interactive Community**: Real-time comments and likes system powered by Neon Database.
- **User Identity**: LocalStorage-based username persistence for seamless commenting.
- **Modern UI**: Fully responsive dark-themed interface built with Tailwind CSS v4.
- **Optimized Performance**: Uses Next.js Image component and dynamic server-side rendering for fast load times.

## Prerequisites

1. **Node.js**: Version 18 or higher.
2. **ImageMagick**: Required for the conversion script.
   - **Windows**: Download and install from [imagemagick.org](https://imagemagick.org/script/download.php#windows). Ensure "Add to PATH" is checked.
   - **macOS**: `brew install imagemagick`
   - **Linux**: `sudo apt install imagemagick`
3. **Neon Database**: A Postgres database for storing comments and likes.

## Getting Started

### 1. Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the root directory and add your Neon database connection string:

```env
DATABASE_URL="postgresql://user:password@ep-project-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 2. Database Schema

Run the following SQL commands in your Neon SQL Editor to set up the required tables:

```sql
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  document_id TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES comments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  likes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS document_stats (
  document_id TEXT PRIMARY KEY,
  likes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS document_views (
  id SERIAL PRIMARY KEY,
  document_id TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS view_queue (
  id SERIAL PRIMARY KEY,
  document_id TEXT NOT NULL,
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Or run the initialization script:**

```bash
npx tsx scripts/init-db.ts
```

**If you already have a database, add the queue table:**

```bash
npx tsx scripts/add-view-queue-table.ts
```

### 3. Prepare PDFs

Place all your PDF files in the `pdfs/` directory at the root of the project.

### 4. Convert PDFs

Run the conversion script to generate WebP images and the manifest:

```bash
npx tsx scripts/convert-pdfs.ts
```

This will:

- Create a folder for each PDF in `public/documents/`.
- Convert each page to a `.webp` file.
- Update `src/data/manifest.json` with the document metadata.

### 5. Run the Website

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your archive.

### 6. Migrate to Vercel Blob (Optional)

If you are hosting on Vercel and have a large archive, you should migrate your images to Vercel Blob to avoid deployment size limits.

1. Set up a Vercel Blob store and add `BLOB_READ_WRITE_TOKEN` to your `.env` file.
2. Run the migration script:

```bash
npx tsx scripts/migrate-to-blob.ts
```

This will upload all images to Vercel Blob and update `src/data/manifest.json` with the new URLs.

## Analytics & Performance Optimizations

This project includes several optimizations to reduce Vercel costs:

- **Database-backed Analytics Queue**: View tracking uses a queue table that's processed by a cron job, reducing function invocations by batching analytics writes.
- **Extended Caching**: Stats and queries are cached for 5 minutes instead of 60 seconds.
- **Image Optimization**: Reduced image quality settings and extended cache TTL for thumbnails.
- **Static Generation**: Viewer pages use ISR (Incremental Static Regeneration) with 1-hour revalidation.

### Setting up the Analytics Queue Cron Job

The analytics queue is automatically processed by a Vercel Cron Job configured in `vercel.json`. The cron job runs every minute to batch process view analytics.

**Optional**: Add a `CRON_SECRET` environment variable in Vercel for additional security:

```env
CRON_SECRET="your-secret-key-here"
```

## Deployment

This project is ready to be deployed on [Vercel](https://vercel.com).

The `vercel.json` file includes cron job configuration that will be automatically set up on deployment.

**Note on Large Archives**: If you have thousands of documents, the `public/` folder might become very large. For extremely large datasets, consider:

1. Using an external storage provider (S3, Vercel Blob).
2. Updating the conversion script to upload to that provider.
3. Updating the website to fetch images from the external URL.
