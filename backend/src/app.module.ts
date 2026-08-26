import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { TextChatModule } from './analyzers/text-chat/text-chat.module';
import { SpreadsheetModule } from './analyzers/spreadsheet/spreadsheet.module';
import { DocumentModule } from './analyzers/document/document.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ExportModule } from './export/export.module';
import { PrivacyModule } from './privacy/privacy.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    RedisModule,
    HealthModule,
    IngestionModule,
    AnalyticsModule,
    SearchModule,
    TextChatModule,
    SpreadsheetModule,
    DocumentModule,
    DatasetsModule,
    ExportModule,
    PrivacyModule,
    StorageModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
