import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

const LOG_PATTERNS = [
  // 1. [YYYY-MM-DD HH:MM:SS] [LEVEL] [Service] Message
  /^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\]\s*(?:\[([A-Z]+)\])?\s*(?:\[([^\]]+)\])?\s*(.*)$/,
  // 2. YYYY-MM-DDTHH:MM:SS.mmmZ LEVEL [Service] Message
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+([A-Z]+)\s+(?:\[([^\]]+)\])?\s*(.*)$/,
  // 3. Syslog: MMM DD HH:MM:SS hostname service[pid]: message
  /^([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+([^\s:]+)\s+([^:]+):\s*(.*)$/,
  // 4. Combined Web Access Log: IP - - [DD/MMM/YYYY:HH:MM:SS +ZZZZ] "METHOD /path" STATUS BYTES
  /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d{3})\s+(\S+)/,
];

@Injectable()
export class LogStreamParser implements IStreamParser {
  private readonly logger = new Logger(LogStreamParser.name);
  readonly formatId = 'log-stream';
  readonly name = 'System & Application Log Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return (
      ext === 'log' ||
      filename.includes('.log.') ||
      filename.endsWith('.access') ||
      filename.endsWith('.error')
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const rl = readline.createInterface({
      input: stream as any,
      crlfDelay: Infinity,
    });

    let recordsYielded = 0;
    let currentRecord: ParsedRecord | null = null;
    const baseDate = new Date();

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`Log parser aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      if (!line || line.trim().length === 0) continue;

      let matched = false;

      // 1. Try standard structured log patterns
      for (const pattern of LOG_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          matched = true;

          if (currentRecord) {
            yield currentRecord;
            recordsYielded++;
          }

          let timestamp: Date;
          let actor: string;
          let content: string;
          let level = 'INFO';

          if (match.length >= 5) {
            timestamp = parseFlexibleDate(match[1]) || baseDate;
            level = match[2] || 'INFO';
            actor = match[3] ? match[3].trim() : `${context.filename.replace(/\.log$/i, '')}`;
            content = match[4] || line;
          } else {
            timestamp = baseDate;
            actor = context.filename;
            content = line;
          }

          const isCritical = ['ERROR', 'FATAL', 'CRITICAL', 'SEVERE'].includes(level.toUpperCase());
          const isWarning = ['WARN', 'WARNING'].includes(level.toUpperCase());

          currentRecord = {
            timestamp,
            actor: `${actor} [${level.toUpperCase()}]`,
            content,
            eventType: isCritical ? 'log_error' : isWarning ? 'log_warn' : 'log_info',
            metadata: {
              logLevel: level.toUpperCase(),
              isCritical,
              isWarning,
              filename: context.filename,
            },
            urls: extractUrls(content),
            emojis: extractEmojis(content),
            hasMedia: false,
          };
          break;
        }
      }

      // If multiline stack trace / continuation
      if (!matched) {
        if (currentRecord) {
          currentRecord.content += `\n${line}`;
        } else {
          currentRecord = {
            timestamp: baseDate,
            actor: context.filename,
            content: line,
            eventType: 'log_info',
            metadata: { filename: context.filename },
            urls: extractUrls(line),
            emojis: extractEmojis(line),
            hasMedia: false,
          };
        }
      }

      if (recordsYielded % 2500 === 0 && context.onProgress) {
        context.onProgress(0, recordsYielded);
      }
    }

    if (currentRecord) {
      yield currentRecord;
      recordsYielded++;
    }

    this.logger.log(`Completed Log stream parse: records=${recordsYielded}`);
  }
}
