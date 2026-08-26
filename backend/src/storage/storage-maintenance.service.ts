import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageStats {
  databaseSizeBytes: number;
  databaseSizeFormatted: string;
  walSizeBytes: number;
  totalRecords: number;
  totalDatasets: number;
  sqliteVersion: string;
  isWalMode: boolean;
}

@Injectable()
export class StorageMaintenanceService {
  private readonly logger = new Logger(StorageMaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves live disk storage statistics and SQLite database metadata.
   */
  async getStorageStats(): Promise<StorageStats> {
    const dbPath = path.resolve(process.cwd(), 'archive_local.db');
    const walPath = path.resolve(process.cwd(), 'archive_local.db-wal');

    let databaseSizeBytes = 0;
    let walSizeBytes = 0;

    if (fs.existsSync(dbPath)) {
      databaseSizeBytes = fs.statSync(dbPath).size;
    }

    if (fs.existsSync(walPath)) {
      walSizeBytes = fs.statSync(walPath).size;
    }

    const [totalRecords, totalDatasets, journalModeRows, versionRows] = await Promise.all([
      this.prisma.timelineEvent.count(),
      this.prisma.dataset.count(),
      this.prisma.$queryRawUnsafe<any[]>('PRAGMA journal_mode;'),
      this.prisma.$queryRawUnsafe<any[]>('SELECT sqlite_version() as ver;'),
    ]);

    const isWalMode = Array.isArray(journalModeRows) && journalModeRows[0]?.journal_mode === 'wal';
    const sqliteVersion = Array.isArray(versionRows) && versionRows[0]?.ver ? versionRows[0].ver : '3.x';

    return {
      databaseSizeBytes,
      databaseSizeFormatted: `${(databaseSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      walSizeBytes,
      totalRecords,
      totalDatasets,
      sqliteVersion,
      isWalMode,
    };
  }

  /**
   * Performs an immediate WAL checkpoint flush and database VACUUM compaction.
   */
  async optimizeDatabase(): Promise<{ success: boolean; freedBytes: number }> {
    this.logger.log('Starting SQLite storage compaction and VACUUM...');
    const statsBefore = await this.getStorageStats();

    try {
      // 1. Force WAL Checkpoint flush
      await this.prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');

      // 2. Execute VACUUM to reclaim deleted page space
      await this.prisma.$queryRawUnsafe('VACUUM;');

      const statsAfter = await this.getStorageStats();
      const freedBytes = Math.max(0, statsBefore.databaseSizeBytes - statsAfter.databaseSizeBytes);

      this.logger.log(`Database optimization completed. Freed ${(freedBytes / 1024).toFixed(1)} KB.`);
      return { success: true, freedBytes };
    } catch (err: any) {
      this.logger.error(`Database optimization failed: ${err.message}`);
      return { success: false, freedBytes: 0 };
    }
  }
}
