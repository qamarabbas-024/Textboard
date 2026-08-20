import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly tempDir: string;
  private readonly blobsDir: string;

  constructor() {
    const baseDir = path.resolve(process.cwd(), '.textboard');
    this.tempDir = path.join(baseDir, 'temp');
    this.blobsDir = path.join(baseDir, 'blobs');

    fs.mkdirSync(this.tempDir, { recursive: true });
    fs.mkdirSync(this.blobsDir, { recursive: true });
  }

  getTempDir(): string {
    return this.tempDir;
  }

  /**
   * Spools any incoming readable stream directly to a disk file while calculating
   * SHA-256 hash and exact byte count in a single pass without memory accumulation.
   */
  async spoolStreamToDisk(
    stream: NodeJS.ReadableStream,
    originalFilename: string,
  ): Promise<{ filepath: string; size: number; checksum: string }> {
    const tempFilename = `spool_${Date.now()}_${crypto.randomBytes(6).toString('hex')}_${path.basename(originalFilename)}`;
    const targetPath = path.join(this.tempDir, tempFilename);

    const hash = crypto.createHash('sha256');
    let byteCount = 0;

    const meterTransform = new Transform({
      transform(chunk, _encoding, callback) {
        byteCount += chunk.length;
        hash.update(chunk);
        callback(null, chunk);
      },
    });

    const fileWriteStream = fs.createWriteStream(targetPath);

    await pipeline(stream, meterTransform, fileWriteStream);

    const checksum = hash.digest('hex');
    this.logger.debug(`File spooled to disk: path=${targetPath}, bytes=${byteCount}, sha256=${checksum}`);

    return {
      filepath: targetPath,
      size: byteCount,
      checksum,
    };
  }

  createReadStream(filepath: string): fs.ReadStream {
    return fs.createReadStream(filepath);
  }

  async cleanupFile(filepath?: string | null): Promise<void> {
    if (!filepath) return;
    try {
      if (fs.existsSync(filepath)) {
        await fs.promises.unlink(filepath);
        this.logger.debug(`Cleaned up temporary spool file: ${filepath}`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to cleanup file ${filepath}: ${err.message}`);
    }
  }
}
