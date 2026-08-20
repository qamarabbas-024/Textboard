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
      this.logger.log('SQLite WAL mode, synchronous=NORMAL, and foreign keys enabled.');
    } catch (err: any) {
      this.logger.warn(`Failed to configure SQLite PRAGMAs: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect().catch(() => {});
  }
}
