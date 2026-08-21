import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';

const SIGNAL_REGEX = /^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\]\s+([^:]+):\s*(.*)$/;

@Injectable()
export class SignalStreamParser implements IStreamParser {
  private readonly logger = new Logger(SignalStreamParser.name);
  readonly formatId = 'signal-stream';
  readonly name = 'Signal Desktop Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.includes('signal') ||
      lower.endsWith('.signal')
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
    let recordsCount = 0;

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`Parsing aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      linesProcessed++;
      const match = line.match(SIGNAL_REGEX);

      if (match) {
        if (currentRecord) {
          recordsCount++;
          yield currentRecord;
        }

        const [, dateStr, sender, content] = match;
        const timestamp = new Date(dateStr);

        currentRecord = {
          timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
          rawTimestamp: dateStr,
          actor: sender.trim(),
          content: content.trim(),
          eventType: 'message',
          hasMedia: content.includes('[Attachment:') || content.includes('Attachment:'),
          metadata: { platform: 'signal' },
        };
      } else if (currentRecord) {
        const trimmed = line.trim();
        if (trimmed) {
          currentRecord.content += '\n' + trimmed;
        }
      }

      if (linesProcessed % 1000 === 0 && context.onProgress) {
        context.onProgress(0, recordsCount);
      }
    }

    if (currentRecord) {
      yield currentRecord;
    }
  }
}
