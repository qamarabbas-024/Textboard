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
import { AiChatStreamParser } from './parsers/ai-chat-stream-parser';
import { DocxStreamParser } from './parsers/docx-stream-parser';
import { LogStreamParser } from './parsers/log-stream-parser';
import { GitLogStreamParser } from './parsers/git-log-stream-parser';
import { MboxStreamParser } from './parsers/mbox-stream-parser';
import { TelegramStreamParser } from './parsers/telegram-stream-parser';
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
    AiChatStreamParser,
    DocxStreamParser,
    LogStreamParser,
    GitLogStreamParser,
    MboxStreamParser,
    TelegramStreamParser,
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
    AiChatStreamParser,
    DocxStreamParser,
    LogStreamParser,
    GitLogStreamParser,
    MboxStreamParser,
    TelegramStreamParser,
  ],
})
export class IngestionModule {}
