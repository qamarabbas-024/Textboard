import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import * as fs from 'fs';
import * as path from 'path';

export interface WatchedDirectoryInfo {
  id: string;
  directoryPath: string;
  active: boolean;
  filesProcessed: number;
  lastEventAt: Date | null;
}

@Injectable()
export class DirectoryWatcherService implements OnModuleDestroy {
  private readonly logger = new Logger(DirectoryWatcherService.name);
  private readonly watchers = new Map<string, { watcher: fs.FSWatcher; info: WatchedDirectoryInfo }>();
  private readonly processingFiles = new Set<string>();

  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Starts monitoring a directory for newly dropped export files.
   */
  startWatching(directoryPath: string): WatchedDirectoryInfo {
    const resolvedPath = path.resolve(directoryPath);

    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }

    const id = `watch_${Buffer.from(resolvedPath).toString('base64url')}`;

    if (this.watchers.has(id)) {
      return this.watchers.get(id)!.info;
    }

    const info: WatchedDirectoryInfo = {
      id,
      directoryPath: resolvedPath,
      active: true,
      filesProcessed: 0,
      lastEventAt: null,
    };

    const watcher = fs.watch(resolvedPath, (eventType, filename) => {
      if (!filename || eventType !== 'rename') return;
      const fullPath = path.join(resolvedPath, filename);

      // Debounce and ensure file exists and is complete
      setTimeout(async () => {
        if (fs.existsSync(fullPath) && !this.processingFiles.has(fullPath)) {
          const stats = fs.statSync(fullPath);
          if (stats.isFile() && stats.size > 0) {
            await this.handleNewFile(fullPath, filename, info);
          }
        }
      }, 1000);
    });

    this.watchers.set(id, { watcher, info });
    this.logger.log(`Started directory watcher for: ${resolvedPath}`);
    return info;
  }

  /**
   * Stops monitoring a directory.
   */
  stopWatching(id: string): boolean {
    const entry = this.watchers.get(id);
    if (!entry) return false;

    entry.watcher.close();
    this.watchers.delete(id);
    this.logger.log(`Stopped watching directory: ${entry.info.directoryPath}`);
    return true;
  }

  /**
   * Returns list of currently active watched directories.
   */
  getWatchedDirectories(): WatchedDirectoryInfo[] {
    return Array.from(this.watchers.values()).map((w) => w.info);
  }

  /**
   * Processes a newly detected file and ingests it.
   */
  private async handleNewFile(
    filePath: string,
    filename: string,
    info: WatchedDirectoryInfo,
  ) {
    this.processingFiles.add(filePath);
    try {
      this.logger.log(`Auto-ingesting new file detected by watcher: ${filename}`);
      const fileStream = fs.createReadStream(filePath);
      const ext = path.extname(filename).toLowerCase().replace('.', '');
      const mimeType = ext === 'json' ? 'application/json' : ext === 'csv' ? 'text/csv' : 'text/plain';

      await this.ingestionService.submitIngestJob(fileStream, filename, mimeType, {
        datasetName: `Auto-Ingested: ${path.parse(filename).name}`,
        sourceType: ext,
      });

      info.filesProcessed++;
      info.lastEventAt = new Date();
    } catch (err: any) {
      this.logger.error(`Failed to auto-ingest file ${filename}: ${err.message}`);
    } finally {
      this.processingFiles.delete(filePath);
    }
  }

  onModuleDestroy() {
    for (const [id, entry] of this.watchers.entries()) {
      entry.watcher.close();
    }
    this.watchers.clear();
  }
}
