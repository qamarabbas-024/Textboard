import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

const SIGNAL_REGEX = /^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\]\s+([^:]+):\s*(.*)$/;

@Injectable()
export class SignalStreamParser implements IStreamParser {
  private readonly logger = new Logger(SignalStreamParser.name);
  readonly formatId = 'signal';
  readonly name = 'Signal Encrypted Backup & Transcript Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.includes('signal') ||
      lower.endsWith('.signal') ||
      lower === 'signal_backup.json'
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const chunks: Buffer[] = [];
    let isJson = false;

    const rl = readline.createInterface({
      input: stream as any,
      crlfDelay: Infinity,
    });

    let currentRecord: ParsedRecord | null = null;
    let linesProcessed = 0;
    let recordsCount = 0;
    let rawBuffer = '';

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`Parsing aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      const trimmed = line.trim();
      if (!trimmed) continue;

      if (!isJson && !SIGNAL_REGEX.test(trimmed) && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
        isJson = true;
      }

      if (isJson) {
        rawBuffer += line + '\n';
        continue;
      }

      linesProcessed++;
      const match = line.match(SIGNAL_REGEX);

      if (match) {
        if (currentRecord) {
          recordsCount++;
          yield currentRecord;
        }

        const [, dateStr, sender, content] = match;
        const timestamp = parseFlexibleDate(dateStr) || new Date();

        currentRecord = {
          timestamp,
          rawTimestamp: dateStr,
          actor: sender.trim(),
          content: content.trim(),
          eventType: 'message',
          hasMedia: content.includes('[Attachment:') || content.includes('Attachment:') || content.includes('[Voice Message]'),
          metadata: { platform: 'signal', filename: context.filename },
          urls: extractUrls(content),
          emojis: extractEmojis(content),
        };
      } else if (currentRecord) {
        currentRecord.content += '\n' + trimmed;
        currentRecord.urls = extractUrls(currentRecord.content);
        currentRecord.emojis = extractEmojis(currentRecord.content);
      }

      if (linesProcessed % 1000 === 0 && context.onProgress) {
        context.onProgress(0, recordsCount);
      }
    }

    if (currentRecord) {
      recordsCount++;
      yield currentRecord;
    }

    if (isJson && rawBuffer) {
      try {
        const parsed = JSON.parse(rawBuffer);
        const messages = Array.isArray(parsed) ? parsed : (parsed.messages || [parsed]);
        const baseDate = new Date();

        for (const msg of messages) {
          let dateVal = baseDate;
          if (msg.sent_at || msg.timestamp || msg.date) {
            const raw = msg.sent_at || msg.timestamp || msg.date;
            dateVal = typeof raw === 'number' ? new Date(raw) : (parseFlexibleDate(raw) || baseDate);
          }

          let content = msg.body || msg.text || msg.message || '';
          if (msg.quote) {
            content = `[Replying to ${msg.quote.author || 'message'}: "${msg.quote.text || ''}"]\n${content}`;
          }

          if (msg.attachments && msg.attachments.length > 0) {
            const atts = msg.attachments.map((a: any) => a.contentType || a.fileName || 'media').join(', ');
            content += ` [Attachment: ${atts}]`;
          }

          if (msg.reactions && msg.reactions.length > 0) {
            const reactionSummary = msg.reactions.map((r: any) => `${r.from || ''}: ${r.emoji}`).join(' | ');
            content += ` [Reactions: ${reactionSummary}]`;
          }

          recordsCount++;
          yield {
            timestamp: dateVal,
            rawTimestamp: String(msg.sent_at || msg.timestamp || ''),
            actor: msg.source || msg.sender || msg.from || (msg.type === 'outgoing' ? 'Me' : 'Signal Contact'),
            content: content.trim() || '[Empty Message]',
            eventType: msg.reactions?.length ? 'reaction' : 'message',
            hasMedia: Boolean(msg.attachments && msg.attachments.length > 0),
            metadata: {
              platform: 'signal',
              expiresInSeconds: msg.expireTimer || msg.expiresInSeconds,
              isOutgoing: msg.type === 'outgoing' || msg.source === 'Me',
              filename: context.filename,
            },
            urls: extractUrls(content),
            emojis: extractEmojis(content),
          };
        }
      } catch (err: any) {
        this.logger.warn(`Failed to parse Signal JSON stream: ${err.message}`);
      }
    }
  }
}
