import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to local-first SQLite database successfully.');

    // Enable high-performance WAL mode, normal synchronous writes & foreign keys
    try {
      await this.$executeRawUnsafe(`PRAGMA journal_mode = WAL;`);
      await this.$executeRawUnsafe(`PRAGMA synchronous = NORMAL;`);
      await this.$executeRawUnsafe(`PRAGMA busy_timeout = 10000;`);
      await this.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);

      // Ensure all tables exist on fresh install / target PC
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "datasets" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "sourceType" TEXT NOT NULL,
          "description" TEXT,
          "metadata" TEXT,
          "totalEvents" INTEGER NOT NULL DEFAULT 0,
          "startDate" DATETIME,
          "endDate" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "source_files" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "datasetId" TEXT NOT NULL REFERENCES "datasets"("id") ON DELETE CASCADE,
          "filename" TEXT NOT NULL,
          "fileSize" INTEGER NOT NULL,
          "mimeType" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "import_jobs" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "datasetId" TEXT NOT NULL REFERENCES "datasets"("id") ON DELETE CASCADE,
          "filename" TEXT NOT NULL,
          "fileSize" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'QUEUED',
          "progress" INTEGER NOT NULL DEFAULT 0,
          "processedRows" INTEGER NOT NULL DEFAULT 0,
          "totalRows" INTEGER NOT NULL DEFAULT 0,
          "errorMessage" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "completedAt" DATETIME
        );
      `);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "timeline_events" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "datasetId" TEXT NOT NULL REFERENCES "datasets"("id") ON DELETE CASCADE,
          "timestamp" DATETIME NOT NULL,
          "actor" TEXT,
          "content" TEXT NOT NULL,
          "eventType" TEXT NOT NULL DEFAULT 'message',
          "rawLength" INTEGER NOT NULL DEFAULT 0,
          "mediaType" TEXT,
          "sentiment" REAL,
          "urgency" REAL,
          "threadId" TEXT,
          "replyToId" TEXT,
          "metadata" TEXT
        );
      `);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "dataset_entities" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "datasetId" TEXT NOT NULL REFERENCES "datasets"("id") ON DELETE CASCADE,
          "name" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "frequency" INTEGER NOT NULL DEFAULT 1,
          "sentiment" REAL,
          "metadata" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "metrics" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "datasetId" TEXT NOT NULL REFERENCES "datasets"("id") ON DELETE CASCADE,
          "name" TEXT NOT NULL,
          "value" REAL,
          "stringValue" TEXT,
          "jsonValue" TEXT,
          "category" TEXT,
          "metadata" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "highlights" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "datasetId" TEXT NOT NULL REFERENCES "datasets"("id") ON DELETE CASCADE,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "score" REAL,
          "metadata" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.logger.log('SQLite schema verified and ready for standalone local-first operations.');
    } catch (err: any) {
      this.logger.warn(`Failed to configure SQLite schema: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect().catch(() => {});
  }
}
