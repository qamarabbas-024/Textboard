import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { JobsController } from './jobs.controller';
import { IngestionService } from './ingestion.service';
import { FilesService } from './files.service';
import { JobsService } from './jobs.service';
import { NormalizationService } from './normalizer.service';
import { BatchedSinkService } from './batched-sink.service';
import { ParserRegistryService } from './parsers/parser-registry.service';
import { TxtStreamParser } from './parsers/txt-stream-parser';
import { CsvStreamParser } from './parsers/csv-stream-parser';
import { JsonStreamParser } from './parsers/json-stream-parser';
import { XlsxStreamParser } from './parsers/xlsx-stream-parser';
import { ImessageStreamParser } from './parsers/imessage-stream-parser';
import { SignalStreamParser } from './parsers/signal-stream-parser';
import { SlackStreamParser } from './parsers/slack-stream-parser';
import { DiscordStreamParser } from './parsers/discord-stream-parser';
import { ChatStreamParser } from './parsers/chat-stream-parser';
import { ZipStreamParser } from './parsers/zip-stream-parser';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IngestionController, JobsController],
  providers: [
    IngestionService,
    FilesService,
    JobsService,
    NormalizationService,
    BatchedSinkService,
    ParserRegistryService,
    TxtStreamParser,
    CsvStreamParser,
    JsonStreamParser,
    XlsxStreamParser,
    ImessageStreamParser,
    SignalStreamParser,
    SlackStreamParser,
    DiscordStreamParser,
    ChatStreamParser,
    ZipStreamParser,
  ],
  exports: [
    IngestionService,
    JobsService,
    FilesService,
    ParserRegistryService,
    TxtStreamParser,
    CsvStreamParser,
    JsonStreamParser,
    XlsxStreamParser,
    ImessageStreamParser,
    SignalStreamParser,
    SlackStreamParser,
    DiscordStreamParser,
    ChatStreamParser,
    ZipStreamParser,
  ],
})
export class IngestionModule {}
