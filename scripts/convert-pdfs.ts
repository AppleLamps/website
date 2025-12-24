import { execSync, spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const PDF_DIR = 'D:\\epstein-files-DOJ\\IMAGES\\IMAGES8';
const OUTPUT_DIR = 'D:\\epstein-files-DOJ\\IMAGES\\website\\pics';
// Optimal concurrency: balance between CPU cores and I/O
// Too high = memory pressure, too low = underutilized cores
const CONCURRENCY_LIMIT = Math.max(4, os.cpus().length);

interface FileInfo {
    name: string;
    size: number;
    path: string;
}

interface ConversionStats {
    completed: number;
    skipped: number;
    failed: number;
    total: number;
    startTime: number;
}

function getMagickCommand(): string | null {
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
                    return fullPath;
                }
            }
        } catch {
            // Ignore errors reading directory
        }
        return null;
    }
}

/**
 * Async semaphore for proper concurrency control.
 * Unlike chunking, this keeps all workers busy - when one finishes, the next starts immediately.
 */
class AsyncSemaphore {
    private running = 0;
    private queue: (() => void)[] = [];

    constructor(private readonly limit: number) {}

    async acquire(): Promise<void> {
        if (this.running < this.limit) {
            this.running++;
            return;
        }
        return new Promise<void>(resolve => this.queue.push(resolve));
    }

    release(): void {
        this.running--;
        const next = this.queue.shift();
        if (next) {
            this.running++;
            next();
        }
    }

    async run<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }
}

/**
 * Execute ImageMagick using spawn (streams output, better memory usage than exec)
 */
function runMagick(magickPath: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn(magickPath, args, { stdio: 'pipe' });
        
        let stderr = '';
        proc.stderr?.on('data', (data) => { stderr += data.toString(); });
        
        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`ImageMagick exited with code ${code}: ${stderr.slice(0, 500)}`));
            }
        });
        
        proc.on('error', reject);
    });
}

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

function logProgress(stats: ConversionStats, currentFile?: string): void {
    const elapsed = Date.now() - stats.startTime;
    const processed = stats.completed + stats.skipped + stats.failed;
    const percent = Math.round((processed / stats.total) * 100);
    const rate = processed > 0 ? elapsed / processed : 0;
    const remaining = rate > 0 ? Math.round((stats.total - processed) * rate) : 0;
    
    const statusLine = `[${percent}%] ${processed}/${stats.total} | ✓${stats.completed} ⊘${stats.skipped} ✗${stats.failed} | ETA: ${formatDuration(remaining)}`;
    
    // Clear line and print status
    process.stdout.write(`\r\x1b[K${statusLine}`);
    if (currentFile) {
        process.stdout.write(` | ${currentFile}`);
    }
}

async function convertPdfs(): Promise<void> {
    const magickCommand = getMagickCommand();
    if (!magickCommand) {
        console.error('ImageMagick (magick) not found in PATH or common installation directory.');
        console.log('Please install ImageMagick from https://imagemagick.org/script/download.php');
        return;
    }

    console.log(`Using ImageMagick: ${magickCommand}`);
    console.log(`Concurrency: ${CONCURRENCY_LIMIT} workers\n`);

    // Ensure directories exist
    await fs.ensureDir(PDF_DIR);
    await fs.ensureDir(OUTPUT_DIR);

    // Get all PDF files with their sizes
    const files = await fs.readdir(PDF_DIR);
    const pdfInfos: FileInfo[] = await Promise.all(
        files
            .filter(f => f.toLowerCase().endsWith('.pdf'))
            .map(async (name): Promise<FileInfo> => {
                const filePath = path.join(PDF_DIR, name);
                const stat = await fs.stat(filePath);
                return { name, size: stat.size, path: filePath };
            })
    );

    if (pdfInfos.length === 0) {
        console.log(`No PDF files found in ${PDF_DIR}.`);
        return;
    }

    // Sort by size ascending - smaller files first keeps the pipeline flowing
    // and provides faster feedback on progress
    pdfInfos.sort((a, b) => a.size - b.size);

    const stats: ConversionStats = {
        completed: 0,
        skipped: 0,
        failed: 0,
        total: pdfInfos.length,
        startTime: Date.now()
    };

    console.log(`Found ${pdfInfos.length} PDF files. Processing smallest first...\n`);

    const semaphore = new AsyncSemaphore(CONCURRENCY_LIMIT);

    // ImageMagick arguments optimized for speed:
    // -limit memory 1GiB: Prevent excessive memory per process (we run multiple)
    // -limit map 2GiB: Memory map limit
    // -density 100: Lower density = faster (100 DPI is fine for web viewing)
    // -define webp:method=0: Fastest encoding (method 0-6, 0 is fastest)
    // -define webp:lossless=false: Ensure lossy for smaller files
    // -quality 70: Slightly lower quality for speed
    // -strip: Remove metadata
    // -colorspace sRGB: Consistent color handling
    const baseArgs = [
        '-limit', 'memory', '1GiB',
        '-limit', 'map', '2GiB', 
        '-density', '100',
    ];
    
    const outputArgs = [
        '-colorspace', 'sRGB',
        '-define', 'webp:method=0',
        '-define', 'webp:lossless=false',
        '-quality', '70',
        '-strip',
    ];

    const conversionPromises = pdfInfos.map(fileInfo => 
        semaphore.run(async () => {
            const fileName = path.parse(fileInfo.name).name;
            const outputSubDir = path.join(OUTPUT_DIR, fileName);

            await fs.ensureDir(outputSubDir);

            // Check if already converted
            const firstPagePath = path.join(outputSubDir, 'page-0.webp');
            if (await fs.pathExists(firstPagePath)) {
                stats.skipped++;
                logProgress(stats);
                return;
            }

            logProgress(stats, fileInfo.name);

            try {
                const outputPattern = path.join(outputSubDir, 'page-%d.webp');
                const args = [
                    ...baseArgs,
                    fileInfo.path,
                    ...outputArgs,
                    outputPattern
                ];
                
                await runMagick(magickCommand, args);
                stats.completed++;
            } catch (err) {
                stats.failed++;
                // Log error on new line, then continue progress
                console.error(`\n✗ Failed: ${fileInfo.name} - ${err instanceof Error ? err.message : err}`);
            }
            
            logProgress(stats);
        })
    );

    await Promise.all(conversionPromises);

    // Final progress line
    const totalTime = formatDuration(Date.now() - stats.startTime);
    console.log(`\n\n✓ Conversion complete in ${totalTime}`);
    console.log(`  Converted: ${stats.completed} | Skipped: ${stats.skipped} | Failed: ${stats.failed}\n`);

    // Generate manifest with parallel directory reads
    console.log('Generating manifest...');
    const docDirs = await fs.readdir(OUTPUT_DIR);
    
    const manifestEntries = await Promise.all(
        docDirs.map(async (dir) => {
            const dirPath = path.join(OUTPUT_DIR, dir);
            const stat = await fs.stat(dirPath);
            
            if (!stat.isDirectory()) return null;
            
            const files = await fs.readdir(dirPath);
            const pages = files
                .filter(f => f.endsWith('.webp'))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                    return numA - numB;
                });

            if (pages.length === 0) return null;

            return {
                id: dir,
                title: dir.replace(/-/g, ' '),
                pageCount: pages.length,
                thumbnail: `/pics/${dir}/${pages[0]}`
            };
        })
    );

    const manifest = manifestEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    
    await fs.writeJson(
        path.join(process.cwd(), 'src', 'data', 'manifest.json'), 
        manifest, 
        { spaces: 2 }
    );
    
    console.log(`✓ Manifest generated with ${manifest.length} documents`);
}

convertPdfs().catch(console.error);
