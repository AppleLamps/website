import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const execPromise = promisify(exec);
const PDF_DIR = path.join(process.cwd(), 'pdfs');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'documents');
const CONCURRENCY_LIMIT = Math.max(1, os.cpus().length - 1); // Use most cores but leave one for system

function getMagickCommand() {
    try {
        execSync('magick -version', { stdio: 'ignore' });
        return 'magick';
    } catch {
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
        try {
            const dirs = fs.readdirSync(programFiles).filter(d => d.startsWith('ImageMagick'));
            if (dirs.length > 0) {
                const latestDir = dirs.sort().reverse()[0];
                const fullPath = path.join(programFiles, latestDir, 'magick.exe');
                if (fs.existsSync(fullPath)) {
                    return `"${fullPath}"`;
                }
            }
        } catch {
            // Ignore errors reading directory
        }
        return null;
    }
}

async function convertPdfs() {
    try {
        const magickCommand = getMagickCommand();
        if (!magickCommand) {
            console.error('ImageMagick (magick) not found in PATH or common installation directory.');
            console.log('Please install ImageMagick from https://imagemagick.org/script/download.php');
            return;
        }

        console.log(`Using ImageMagick command: ${magickCommand}`);

        // Ensure directories exist
        await fs.ensureDir(PDF_DIR);
        await fs.ensureDir(OUTPUT_DIR);

        const files = await fs.readdir(PDF_DIR);
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

        if (pdfFiles.length === 0) {
            console.log('No PDF files found in ./pdfs folder.');
            console.log('Please place your PDF files in the ./pdfs directory.');
            return;
        }

        console.log(`Found ${pdfFiles.length} PDF files. Starting conversion with concurrency ${CONCURRENCY_LIMIT}...`);

        const tasks = pdfFiles.map(file => async () => {
            const fileName = path.parse(file).name;
            const inputPath = path.join(PDF_DIR, file);
            const outputSubDir = path.join(OUTPUT_DIR, fileName);

            await fs.ensureDir(outputSubDir);

            // Check if already converted
            const existingFiles = await fs.readdir(outputSubDir);
            if (existingFiles.some(f => f.endsWith('.webp'))) {
                // console.log(`Skipping ${file} (already converted)`);
                return;
            }

            console.log(`Converting ${file}...`);

            try {
                await execPromise(`${magickCommand} -density 150 "${inputPath}" -quality 75 "${path.join(outputSubDir, 'page-%d.webp')}"`);
                console.log(`Successfully converted ${file}`);
            } catch (err) {
                console.error(`Failed to convert ${file}:`, err);
            }
        });

        // Run tasks with concurrency limit
        for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
            const chunk = tasks.slice(i, i + CONCURRENCY_LIMIT);
            await Promise.all(chunk.map(task => task()));
        }

        // Generate a manifest file for the website to use
        const manifest = [];
        const docDirs = await fs.readdir(OUTPUT_DIR);

        for (const dir of docDirs) {
            const dirPath = path.join(OUTPUT_DIR, dir);
            if ((await fs.stat(dirPath)).isDirectory()) {
                const pages = (await fs.readdir(dirPath))
                    .filter(f => f.endsWith('.webp'))
                    .sort((a, b) => {
                        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                        return numA - numB;
                    });

                manifest.push({
                    id: dir,
                    title: dir.replace(/-/g, ' '),
                    pageCount: pages.length,
                    thumbnail: `/documents/${dir}/${pages[0]}`
                });
            }
        }

        await fs.writeJson(path.join(process.cwd(), 'src', 'data', 'manifest.json'), manifest, { spaces: 2 });
        console.log('Manifest generated successfully!');

    } catch (error) {
        console.error('Error during conversion:', error);
    }
}

convertPdfs();
