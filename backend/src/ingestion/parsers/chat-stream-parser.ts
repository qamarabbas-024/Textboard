import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';

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

const MAX_MESSAGE_LENGTH = 65536; // 64KB max line safeguard

@Injectable()
export class ChatStreamParser implements IStreamParser {
  private readonly logger = new Logger(ChatStreamParser.name);
  readonly formatId = 'chat-text';
  readonly name = 'Text Chat Log Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'txt' || ext === 'log' || mimeType.startsWith('text/plain');
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
    let totalMessages = 0;

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`Parsing aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      linesProcessed++;
      if (linesProcessed % 2500 === 0 && context.onProgress) {
        context.onProgress(0, totalMessages);
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

      // 1. Check standard message regexes
      for (const pattern of LINE_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          if (currentRecord) {
            yield currentRecord;
            totalMessages++;
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

      // 2. Check system message pattern
      for (const pattern of SYSTEM_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          if (currentRecord) {
            yield currentRecord;
            totalMessages++;
          }

          const dateStr = match.length === 4 ? `${match[1]} ${match[2]}` : match[1];
          const content = match[match.length - 1];
          const parsedDate = this.parseDate(dateStr);

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

      // 3. Multi-line continuation of preceding message
      if (currentRecord) {
        if (currentRecord.content.length < MAX_MESSAGE_LENGTH) {
          currentRecord.content +=
            '\n' + line.slice(0, MAX_MESSAGE_LENGTH - currentRecord.content.length);
        }
      } else {
        // Fallback for unstructured initial banner lines
        currentRecord = {
          timestamp: new Date(),
          actor: undefined,
          content: line.slice(0, MAX_MESSAGE_LENGTH),
          eventType: 'unstructured',
        };
      }
    }

    if (currentRecord) {
      yield currentRecord;
      totalMessages++;
    }

    this.logger.log(
      `Chat stream parsed completely: lines=${linesProcessed}, messages=${totalMessages}`,
    );
  }

  private parseDate(dateStr: string): Date {
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
      // Fallback
    }
    return new Date();
  }
}
