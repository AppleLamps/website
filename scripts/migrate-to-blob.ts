import fs from 'fs-extra';
import path from 'path';
import { put } from '@vercel/blob';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MANIFEST_PATH = path.join(process.cwd(), 'src/data/manifest.json');
const DOCUMENTS_DIR = path.join(process.cwd(), 'public/documents');

interface Document {
    id: string;
    title: string;
    pageCount: number;
    thumbnail: string;
    pages?: string[]; // New field for blob URLs
}

async function migrate() {
    console.log('Starting migration to Vercel Blob...');

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('Error: BLOB_READ_WRITE_TOKEN is not defined in .env');
        process.exit(1);
    }

    // Read manifest
    const manifest: Document[] = await fs.readJson(MANIFEST_PATH);
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < manifest.length; i++) {
        const doc = manifest[i];
        console.log(`[${i + 1}/${manifest.length}] Processing ${doc.id}...`);

        // Skip if already migrated
        if (doc.pages && doc.pages.length > 0 && doc.thumbnail.startsWith('http')) {
            console.log(`  Already migrated. Skipping.`);
            skippedCount++;
            continue;
        }

        const docPages: string[] = [];
        const docDir = path.join(DOCUMENTS_DIR, doc.id);

        // Check if local files exist
        if (!fs.existsSync(docDir)) {
            console.warn(`  Warning: Local directory not found for ${doc.id}. Skipping.`);
            continue;
        }

        try {
            // Upload each page
            for (let pageIndex = 0; pageIndex < doc.pageCount; pageIndex++) {
                const fileName = `page-${pageIndex}.webp`;
                const filePath = path.join(docDir, fileName);

                if (!fs.existsSync(filePath)) {
                    console.warn(`    Warning: File ${fileName} not found.`);
                    continue;
                }

                const fileBuffer = await fs.readFile(filePath);
                const blobPath = `documents/${doc.id}/${fileName}`;

                console.log(`    Uploading ${fileName}...`);
                const blob = await put(blobPath, fileBuffer, {
                    access: 'public',
                    addRandomSuffix: false // Keep clean URLs if possible, or true if we want unique
                });

                docPages.push(blob.url);
            }

            // Update document in manifest
            doc.pages = docPages;
            if (docPages.length > 0) {
                doc.thumbnail = docPages[0]; // Use first page as thumbnail
            }

            updatedCount++;

            // Save manifest periodically (every 10 docs) to save progress
            if (updatedCount % 10 === 0) {
                await fs.writeJson(MANIFEST_PATH, manifest, { spaces: 2 });
                console.log('  Manifest saved.');
            }

        } catch (error) {
            console.error(`  Error processing ${doc.id}:`, error);
        }
    }

    // Final save
    await fs.writeJson(MANIFEST_PATH, manifest, { spaces: 2 });
    console.log('Migration complete!');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
}

migrate().catch(console.error);
