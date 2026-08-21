import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';

const APPLE_EPOCH_OFFSET_MS = 978307200000;

@Injectable()
export class ImessageStreamParser implements IStreamParser {
  private readonly logger = new Logger(ImessageStreamParser.name);
  readonly formatId = 'imessage-stream';
  readonly name = 'Apple iMessage Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.includes('imessage') ||
      lower.includes('chat.db') ||
      lower.endsWith('.imessage')
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

    let buffer = '';
    let isJson = false;
    let linesProcessed = 0;
    let recordsCount = 0;

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`Parsing aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      linesProcessed++;
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('[') || trimmed.startsWith('{') || isJson) {
        isJson = true;
        buffer += line + '\n';
        continue;
      }

      // Format: "YYYY-MM-DD HH:mm:ss Sender: Content"
      const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+([^:]+):\s*(.*)$/);
      if (match) {
        const [, dateStr, sender, content] = match;
        const timestamp = new Date(dateStr);
        recordsCount++;

        yield {
          timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
          rawTimestamp: dateStr,
          actor: sender.trim(),
          content: content.trim(),
          eventType: 'message',
          metadata: { platform: 'imessage' },
        };
      }

      if (linesProcessed % 1000 === 0 && context.onProgress) {
        context.onProgress(0, recordsCount);
      }
    }

    if (isJson && buffer) {
      try {
        const items = JSON.parse(buffer);
        const array = Array.isArray(items) ? items : [items];
        for (const item of array) {
          let timestamp = new Date();
          if (item.date) {
            if (typeof item.date === 'number') {
              if (item.date > 1e15) {
                timestamp = new Date(APPLE_EPOCH_OFFSET_MS + Math.floor(item.date / 1e6));
              } else if (item.date < 1e11) {
                timestamp = new Date(APPLE_EPOCH_OFFSET_MS + item.date * 1000);
              } else {
                timestamp = new Date(item.date);
              }
            } else {
              timestamp = new Date(item.date);
            }
          }

          recordsCount++;
          yield {
            timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
            rawTimestamp: String(item.date || ''),
            actor: item.sender || item.handle || item.from || 'Me',
            content: item.text || item.content || item.body || '',
            eventType: 'message',
            hasMedia: Boolean(item.attachments && item.attachments.length > 0),
            metadata: {
              platform: 'imessage',
              isFromMe: Boolean(item.is_from_me),
              service: item.service_name || 'iMessage',
            },
          };
        }
      } catch (err: any) {
        this.logger.warn(`Failed to parse iMessage JSON stream: ${err.message}`);
      }
    }
  }
}
