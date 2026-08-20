import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

const LINE_PATTERNS = [
  // 1. [DD/MM/YYYY, HH:MM:SS] Sender: Message
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+([^:]+):\s+(.*)$/,
  // 2. DD/MM/YYYY, HH:MM - Sender: Message
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+-\s+([^:]+):\s+(.*)$/,
  // 3. [YYYY-MM-DD HH:MM:SS] Sender: Message
  /^\[(\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\]\s+([^:]+):\s+(.*)$/,
  // 4. YYYY-MM-DD HH:MM - Sender: Message
  /^(\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\s+-\s+([^:]+):\s+(.*)$/,
  // 5. [YYYY/MM/DD, HH:MM:SS] Sender: Message
  /^\[(\d{4}\/\d{1,2}\/\d{1,2}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+([^:]+):\s+(.*)$/,
];

const SYSTEM_PATTERNS = [
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+(.*)$/,
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+-\s+(.*)$/,
  /^\[(\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\]\s+(.*)$/,
];

const MAX_MESSAGE_LENGTH = 65536;

@Injectable()
export class TxtStreamParser implements IStreamParser {
  private readonly logger = new Logger(TxtStreamParser.name);
  readonly formatId = 'txt';
  readonly name = 'Plain Text & Chat Log Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return (
      ext === 'txt' ||
      ext === 'log' ||
      ext === 'text' ||
      mimeType.startsWith('text/plain')
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

    let currentRecord: ParsedRecord | null = null;
    let linesProcessed = 0;
    let recordsYielded = 0;

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`TXT parser aborted by signal for job ${context.jobId}`);
        rl.close();
        break;
      }

      linesProcessed++;
      if (linesProcessed % 2500 === 0 && context.onProgress) {
        context.onProgress(0, recordsYielded);
      }

      // Check for binary corrupted bytes
      if (line.includes('\u0000') || /[\x00-\x08\x0E-\x1F]/.test(line.slice(0, 100))) {
        this.logger.warn(`Skipping corrupted binary line at line ${linesProcessed}`);
        continue;
      }

      if (!line || line.trim().length === 0) {
        continue;
      }

      let matched = false;

      // 1. Check standard sender message regexes
      for (const pattern of LINE_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          if (currentRecord) {
            yield this.finalizeRecord(currentRecord);
            recordsYielded++;
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

          const parsedDate = parseFlexibleDate(dateStr);
          const safeContent =
            content.length > MAX_MESSAGE_LENGTH
              ? content.slice(0, MAX_MESSAGE_LENGTH) + ' [TRUNCATED DUE TO SIZE]'
              : content;

          currentRecord = {
            timestamp: parsedDate,
            rawTimestamp: dateStr,
            actor,
            content: safeContent,
            eventType: 'message',
          };

          matched = true;
          break;
        }
      }

      if (matched) continue;

      // 2. Check system event patterns
      for (const pattern of SYSTEM_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          if (currentRecord) {
            yield this.finalizeRecord(currentRecord);
            recordsYielded++;
          }

          const dateStr = match.length === 4 ? `${match[1]} ${match[2]}` : match[1];
          const content = match[match.length - 1];
          const parsedDate = parseFlexibleDate(dateStr);

          const safeContent =
            content.length > MAX_MESSAGE_LENGTH
              ? content.slice(0, MAX_MESSAGE_LENGTH) + ' [TRUNCATED]'
              : content;

          currentRecord = {
            timestamp: parsedDate,
            rawTimestamp: dateStr,
            actor: undefined,
            content: safeContent,
            eventType: 'system',
          };

          matched = true;
          break;
        }
      }

      if (matched) continue;

      // 3. Multi-line continuation of previous message
      if (currentRecord) {
        if (currentRecord.content.length < MAX_MESSAGE_LENGTH) {
          currentRecord.content +=
            '\n' + line.slice(0, MAX_MESSAGE_LENGTH - currentRecord.content.length);
        }
      } else {
        // Fallback for unstructured initial lines / headers (never discard)
        currentRecord = {
          timestamp: new Date(),
          actor: undefined,
          content: line.slice(0, MAX_MESSAGE_LENGTH),
          eventType: 'unstructured',
        };
      }
    }

    if (currentRecord) {
      yield this.finalizeRecord(currentRecord);
      recordsYielded++;
    }

    this.logger.log(
      `TXT stream parsed completely: lines=${linesProcessed}, records=${recordsYielded}`,
    );
  }

  private finalizeRecord(record: ParsedRecord): ParsedRecord {
    const urls = extractUrls(record.content);
    const emojis = extractEmojis(record.content);
    return {
      ...record,
      urls: urls.length > 0 ? urls : undefined,
      emojis: emojis.length > 0 ? emojis : undefined,
    };
  }
}
