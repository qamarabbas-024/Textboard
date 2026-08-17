import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { TextChatModule } from './analyzers/text-chat/text-chat.module';
import { SpreadsheetModule } from './analyzers/spreadsheet/spreadsheet.module';
import { DocumentModule } from './analyzers/document/document.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    TextChatModule,
    SpreadsheetModule,
    DocumentModule,
    DatasetsModule,
    ExportModule,
  ],
})
export class AppModule {}
