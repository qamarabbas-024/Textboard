import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

@Injectable()
export class MboxStreamParser implements IStreamParser {
  private readonly logger = new Logger(MboxStreamParser.name);
  readonly formatId = 'mbox';
  readonly name = 'Mbox / EML Email Archive Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return (
      ext === 'mbox' ||
      ext === 'eml' ||
      mimeType.includes('mbox') ||
      mimeType.includes('message/rfc822')
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
    let inHeader = false;
    let currentEmail: {
      from?: string;
      to?: string;
      subject?: string;
      date?: Date;
      bodyLines: string[];
    } | null = null;

    const baseDate = new Date();

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`Mbox parser aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      // Mbox delimiter: "From "
      if (line.startsWith('From ') || (context.filename.endsWith('.eml') && currentEmail === null)) {
        if (currentEmail) {
          const body = currentEmail.bodyLines.join('\n').trim();
          const subject = currentEmail.subject || 'No Subject';
          const content = `Subject: ${subject}\n\n${body}`;

          yield {
            timestamp: currentEmail.date || baseDate,
            actor: currentEmail.from || 'Email Sender',
            content,
            eventType: 'email_message',
            metadata: {
              subject,
              to: currentEmail.to,
              filename: context.filename,
            },
            urls: extractUrls(content),
            emojis: extractEmojis(content),
            hasMedia: content.toLowerCase().includes('attachment') || content.toLowerCase().includes('content-disposition'),
          };
          recordsYielded++;
        }

        currentEmail = {
          bodyLines: [],
        };
        inHeader = true;
        continue;
      }

      if (currentEmail) {
        if (inHeader) {
          if (line.trim() === '') {
            inHeader = false;
            continue;
          }

          if (/^From:\s*(.*)/i.test(line)) {
            const m = line.match(/^From:\s*(.*)/i);
            currentEmail.from = m ? m[1].replace(/["']/g, '').trim() : undefined;
          } else if (/^To:\s*(.*)/i.test(line)) {
            const m = line.match(/^To:\s*(.*)/i);
            currentEmail.to = m ? m[1].trim() : undefined;
          } else if (/^Subject:\s*(.*)/i.test(line)) {
            const m = line.match(/^Subject:\s*(.*)/i);
            currentEmail.subject = m ? m[1].trim() : undefined;
          } else if (/^Date:\s*(.*)/i.test(line)) {
            const m = line.match(/^Date:\s*(.*)/i);
            if (m) {
              currentEmail.date = parseFlexibleDate(m[1]) || baseDate;
            }
          }
        } else {
          // Body line
          // Skip MIME boundaries
          if (!line.startsWith('--') && !line.startsWith('Content-Type:') && !line.startsWith('Content-Transfer-Encoding:')) {
            currentEmail.bodyLines.push(line);
          }
        }
      }

      if (recordsYielded % 1000 === 0 && context.onProgress) {
        context.onProgress(0, recordsYielded);
      }
    }

    if (currentEmail) {
      const body = currentEmail.bodyLines.join('\n').trim();
      const subject = currentEmail.subject || 'No Subject';
      const content = `Subject: ${subject}\n\n${body}`;

      yield {
        timestamp: currentEmail.date || baseDate,
        actor: currentEmail.from || 'Email Sender',
        content,
        eventType: 'email_message',
        metadata: {
          subject,
          to: currentEmail.to,
          filename: context.filename,
        },
        urls: extractUrls(content),
        emojis: extractEmojis(content),
        hasMedia: content.toLowerCase().includes('attachment') || content.toLowerCase().includes('content-disposition'),
      };
      recordsYielded++;
    }

    this.logger.log(`Completed Mbox stream parse: emails=${recordsYielded}`);
  }
}
