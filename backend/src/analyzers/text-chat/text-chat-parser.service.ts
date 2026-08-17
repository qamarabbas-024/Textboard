import { Injectable, Logger, BadRequestException, RequestTimeoutException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Readable } from 'stream';
import * as readline from 'readline';

export interface ParseResult {
  datasetId: string;
  name: string;
  totalMessages: number;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  actorCounts: Record<string, number>;
  processingTimeMs: number;
}

const LINE_PATTERNS = [
  // 1. [DD/MM/YYYY, HH:MM:SS] Sender: Message
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+([^:]+):\s+(.*)$/,
  // 2. DD/MM/YYYY, HH:MM - Sender: Message
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+-\s+([^:]+):\s+(.*)$/,
  // 3. [YYYY-MM-DD HH:MM:SS] Sender: Message
  /^\[(\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\]\s+([^:]+):\s+(.*)$/,
  // 4. YYYY-MM-DD HH:MM - Sender: Message
  /^(\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\s+-\s+([^:]+):\s+(.*)$/,
];

const SYSTEM_PATTERNS = [
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+(.*)$/,
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+-\s+(.*)$/,
];

const MAX_MESSAGE_LENGTH = 65536; // 64KB max per message
const PARSE_TIMEOUT_MS = 60000; // 60s timeout

@Injectable()
export class TextChatParserService {
  private readonly logger = new Logger(TextChatParserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processStream(
    stream: Readable,
    filename: string,
    batchSize = 5000,
    timeoutMs = PARSE_TIMEOUT_MS,
  ): Promise<ParseResult> {
    const parsePromise = this.internalProcessStream(stream, filename, batchSize);
    const timeoutPromise = new Promise<ParseResult>((_, reject) => {
      setTimeout(() => {
        reject(new RequestTimeoutException(`Parsing timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
    });

    return Promise.race([parsePromise, timeoutPromise]);
  }

  private async internalProcessStream(
    stream: Readable,
    filename: string,
    batchSize = 5000,
  ): Promise<ParseResult> {
    const startTime = Date.now();

    // Create Dataset row first
    const dataset = await this.prisma.dataset.create({
      data: {
        name: filename,
        sourceType: 'text-chat',
        metadata: {
          originalFilename: filename,
        },
      },
    });

    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    let totalMessages = 0;
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const actorCounts: Record<string, number> = {};

    let currentEvent: {
      datasetId: string;
      timestamp: Date;
      actor: string | null;
      content: string;
      eventType: string;
    } | null = null;

    const eventBatch: typeof currentEvent[] = [];
    let linesProcessed = 0;
    let binaryByteDetected = false;

    for await (const line of rl) {
      linesProcessed++;

      // Check for corrupted binary bytes
      if (line.includes('\u0000') || /[\x00-\x08\x0E-\x1F]/.test(line.slice(0, 100))) {
        binaryByteDetected = true;
        break;
      }

      if (!line || line.trim().length === 0) {
        continue;
      }

      let matched = false;

      // 1. Try standard message patterns
      for (const pattern of LINE_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          if (currentEvent) {
            eventBatch.push(currentEvent);
            if (eventBatch.length >= batchSize) {
              await this.flushBatch(eventBatch);
            }
          }

          let dateStr: string;
          let actor: string;
          let content: string;

          if (match.length === 5) {
            dateStr = `${match[1]} ${match[2]}`;
            actor = match[3].trim();
            content = match[4];
          } else {
            dateStr = match[1];
            actor = match[2].trim();
            content = match[3];
          }

          const parsedDate = this.parseDate(dateStr);
          if (!startDate || parsedDate < startDate) startDate = parsedDate;
          if (!endDate || parsedDate > endDate) endDate = parsedDate;

          actorCounts[actor] = (actorCounts[actor] || 0) + 1;
          totalMessages++;

          // Truncate giant messages to prevent memory exhaustion
          const safeContent = content.length > MAX_MESSAGE_LENGTH
            ? content.slice(0, MAX_MESSAGE_LENGTH) + ' [TRUNCATED DUE TO SIZE]'
            : content;

          currentEvent = {
            datasetId: dataset.id,
            timestamp: parsedDate,
            actor,
            content: safeContent,
            eventType: 'message',
          };

          matched = true;
          break;
        }
      }

      if (matched) continue;

      // 2. Try system message pattern
      for (const pattern of SYSTEM_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          if (currentEvent) {
            eventBatch.push(currentEvent);
            if (eventBatch.length >= batchSize) {
              await this.flushBatch(eventBatch);
            }
          }

          const dateStr = match.length === 4 ? `${match[1]} ${match[2]}` : match[1];
          const content = match[match.length - 1];
          const parsedDate = this.parseDate(dateStr);

          if (!startDate || parsedDate < startDate) startDate = parsedDate;
          if (!endDate || parsedDate > endDate) endDate = parsedDate;

          totalMessages++;

          const safeContent = content.length > MAX_MESSAGE_LENGTH
            ? content.slice(0, MAX_MESSAGE_LENGTH) + ' [TRUNCATED]'
            : content;

          currentEvent = {
            datasetId: dataset.id,
            timestamp: parsedDate,
            actor: null,
            content: safeContent,
            eventType: 'system_event',
          };

          matched = true;
          break;
        }
      }

      if (matched) continue;

      // 3. Multi-line continuation of previous message
      if (currentEvent) {
        if (currentEvent.content.length < MAX_MESSAGE_LENGTH) {
          currentEvent.content += '\n' + line.slice(0, MAX_MESSAGE_LENGTH - currentEvent.content.length);
        }
      } else {
        // Fallback for unstructured initial lines
        const now = new Date();
        currentEvent = {
          datasetId: dataset.id,
          timestamp: now,
          actor: null,
          content: line.slice(0, MAX_MESSAGE_LENGTH),
          eventType: 'unstructured',
        };
        totalMessages++;
      }
    }

    if (binaryByteDetected) {
      await this.prisma.dataset.delete({ where: { id: dataset.id } });
      throw new BadRequestException('File appears to be corrupted or binary content.');
    }

    if (currentEvent) {
      eventBatch.push(currentEvent);
    }

    if (eventBatch.length > 0) {
      await this.flushBatch(eventBatch);
    }

    if (totalMessages === 0) {
      await this.prisma.dataset.delete({ where: { id: dataset.id } });
      throw new BadRequestException('File is empty or contains no parseable text lines.');
    }

    const processingTimeMs = Date.now() - startTime;

    // Strict privacy logging: only metadata counts, never message content
    this.logger.log(
      `Dataset ingested successfully: id=${dataset.id}, totalMessages=${totalMessages}, duration=${processingTimeMs}ms`,
    );

    return {
      datasetId: dataset.id,
      name: filename,
      totalMessages,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      actorCounts,
      processingTimeMs,
    };
  }

  private async flushBatch(batch: any[]) {
    await this.prisma.timelineEvent.createMany({
      data: batch.map((item) => ({
        datasetId: item.datasetId,
        timestamp: item.timestamp,
        actor: item.actor,
        content: item.content,
        eventType: item.eventType,
      })),
    });
    batch.length = 0;
  }

  parseDate(dateStr: string): Date {
    try {
      const parts = dateStr.trim().split(/[\s,]+/);
      if (parts.length >= 2) {
        const datePart = parts[0];
        const timePart = parts.slice(1).join(' ');

        if (datePart.includes('/')) {
          const [d, m, y] = datePart.split('/');
          const fullYear = y.length === 2 ? `20${y}` : y;
          const isoCandidate = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${timePart}`;
          const parsed = new Date(isoCandidate);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }

      const direct = new Date(dateStr);
      if (!isNaN(direct.getTime())) return direct;
    } catch {
      // ignore
    }
    return new Date();
  }
}
