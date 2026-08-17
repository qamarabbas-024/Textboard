import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as readline from 'readline';
import { Readable } from 'stream';
import { ParsedChatEvent, ChatAnalysisSummary } from './types';

@Injectable()
export class TextChatParserService {
  private readonly logger = new Logger(TextChatParserService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Regex patterns to match common chat header formats
  // Format 1: [DD/MM/YYYY, HH:mm:ss] Author: Message or [MM/DD/YY, HH:mm:ss AM/PM] Author: Message
  private readonly bracketHeaderRegex = /^\[(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s*(?:([^:]+?):\s*)?(.*)$/;

  // Format 2: DD/MM/YYYY, HH:mm - Author: Message or MM/DD/YY, HH:mm - Author: Message
  private readonly dashHeaderRegex = /^(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*-\s*(?:([^:]+?):\s*)?(.*)$/;

  // Format 3: YYYY-MM-DD HH:mm:ss Author: Message
  private readonly standardHeaderRegex = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s+(?:([^:]+?):\s*)?(.*)$/;

  /**
   * Parse a date string into a valid Date object.
   */
  private parseDateString(dateStr: string): Date | null {
    // Normalize spaces (e.g. narrow no-break space before AM/PM)
    const cleaned = dateStr.replace(/[\u202f\u00a0]/g, ' ').trim();

    // Match components: part1, sep1, part2, sep2, part3, time, ampm
    const match = cleaned.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp][Mm]))?$/);
    if (!match) {
      const fallbackDate = new Date(cleaned);
      return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
    }

    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    const p3 = parseInt(match[3], 10);
    let hours = parseInt(match[4], 10);
    const minutes = parseInt(match[5], 10);
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    const ampm = match[7]?.toUpperCase();

    if (ampm === 'PM' && hours < 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }

    let year: number;
    let month: number; // 0-indexed
    let day: number;

    if (p1 > 1000) {
      // YYYY-MM-DD
      year = p1;
      month = p2 - 1;
      day = p3;
    } else if (p3 > 1000 || p3 < 100) {
      year = p3 < 100 ? 2000 + p3 : p3;
      if (p1 > 12) {
        // DD/MM/YYYY
        day = p1;
        month = p2 - 1;
      } else if (p2 > 12) {
        // MM/DD/YYYY
        month = p1 - 1;
        day = p2;
      } else {
        // Default to DD/MM/YYYY
        day = p1;
        month = p2 - 1;
      }
    } else {
      year = 2000 + p3;
      day = p1;
      month = p2 - 1;
    }

    const parsed = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Try to match a single line as a new message header.
   */
  private matchLineHeader(line: string): { timestamp: Date; actor: string | null; content: string } | null {
    // Strip unicode control characters (LTR, RTL, BOM)
    const sanitized = line.replace(/[\u200e\u200f\ufeff]/g, '').trim();
    if (!sanitized) return null;

    // Check bracket format
    let match = sanitized.match(this.bracketHeaderRegex);
    if (match) {
      const date = this.parseDateString(match[1]);
      if (date) {
        return {
          timestamp: date,
          actor: match[2] ? match[2].trim() : null,
          content: match[3] || '',
        };
      }
    }

    // Check dash format
    match = sanitized.match(this.dashHeaderRegex);
    if (match) {
      const date = this.parseDateString(match[1]);
      if (date) {
        return {
          timestamp: date,
          actor: match[2] ? match[2].trim() : null,
          content: match[3] || '',
        };
      }
    }

    // Check standard YYYY-MM-DD format
    match = sanitized.match(this.standardHeaderRegex);
    if (match) {
      const date = this.parseDateString(match[1]);
      if (date) {
        return {
          timestamp: date,
          actor: match[2] ? match[2].trim() : null,
          content: match[3] || '',
        };
      }
    }

    return null;
  }

  /**
   * Parse chat export from a file path or readable stream and insert directly into DB in batches.
   */
  async processChatExport(
    input: string | Readable,
    datasetName: string,
    batchSize = 5000,
  ): Promise<ChatAnalysisSummary> {
    const startTime = Date.now();

    // 1. Create Dataset record
    const dataset = await this.prisma.dataset.create({
      data: {
        name: datasetName,
        sourceType: 'text-chat',
        metadata: {
          originalName: datasetName,
          startedAt: new Date().toISOString(),
        },
      },
    });

    const stream = typeof input === 'string'
      ? fs.createReadStream(input, { encoding: 'utf-8' })
      : input;

    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    let currentEvent: ParsedChatEvent | null = null;
    const batch: any[] = [];
    let totalMessages = 0;
    let minTimestamp: Date | null = null;
    let maxTimestamp: Date | null = null;
    const actorCounts: Record<string, number> = {};

    const flushBatch = async () => {
      if (batch.length === 0) return;
      await this.prisma.timelineEvent.createMany({
        data: batch,
      });
      batch.length = 0;
    };

    const pushEvent = async (event: ParsedChatEvent) => {
      totalMessages++;
      const actorKey = event.actor || 'System';
      actorCounts[actorKey] = (actorCounts[actorKey] || 0) + 1;

      if (!minTimestamp || event.timestamp < minTimestamp) {
        minTimestamp = event.timestamp;
      }
      if (!maxTimestamp || event.timestamp > maxTimestamp) {
        maxTimestamp = event.timestamp;
      }

      batch.push({
        datasetId: dataset.id,
        timestamp: event.timestamp,
        actor: event.actor,
        content: event.content,
        eventType: event.actor ? 'message' : 'system_event',
      });

      if (batch.length >= batchSize) {
        await flushBatch();
      }
    };

    for await (const line of rl) {
      const header = this.matchLineHeader(line);
      if (header) {
        if (currentEvent) {
          await pushEvent(currentEvent);
        }
        currentEvent = {
          timestamp: header.timestamp,
          actor: header.actor,
          content: header.content,
          eventType: header.actor ? 'message' : 'system_event',
        };
      } else if (currentEvent) {
        // Multi-line message continuation
        currentEvent.content += `\n${line}`;
      }
    }

    if (currentEvent) {
      await pushEvent(currentEvent);
    }

    // Flush any remaining events
    await flushBatch();

    const processingTimeMs = Date.now() - startTime;

    // 2. Persist aggregate metrics
    const metricsToInsert: any[] = [
      {
        datasetId: dataset.id,
        name: 'total_messages',
        value: totalMessages,
        category: 'volume',
      },
      {
        datasetId: dataset.id,
        name: 'total_actors',
        value: Object.keys(actorCounts).length,
        category: 'volume',
      },
    ];

    if (minTimestamp && maxTimestamp) {
      metricsToInsert.push({
        datasetId: dataset.id,
        name: 'date_range',
        jsonValue: {
          start: minTimestamp.toISOString(),
          end: maxTimestamp.toISOString(),
        },
        category: 'timeline',
      });
    }

    for (const [actor, count] of Object.entries(actorCounts)) {
      metricsToInsert.push({
        datasetId: dataset.id,
        name: `actor_message_count`,
        stringValue: actor,
        value: count,
        category: 'actors',
      });
    }

    await this.prisma.metric.createMany({
      data: metricsToInsert,
    });

    // Update dataset metadata
    await this.prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        metadata: {
          totalMessages,
          dateRange: {
            start: minTimestamp?.toISOString() || null,
            end: maxTimestamp?.toISOString() || null,
          },
          actorCounts,
          processingTimeMs,
        },
      },
    });

    this.logger.log(
      `Processed ${totalMessages} messages in ${processingTimeMs}ms for dataset ${dataset.id}`,
    );

    return {
      datasetId: dataset.id,
      name: dataset.name,
      totalMessages,
      dateRange: {
        start: minTimestamp?.toISOString() || null,
        end: maxTimestamp?.toISOString() || null,
      },
      actorCounts,
      processingTimeMs,
    };
  }
}
