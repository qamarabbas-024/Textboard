import { Injectable, Logger } from '@nestjs/common';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

@Injectable()
export class GoogleTakeoutStreamParser implements IStreamParser {
  private readonly logger = new Logger(GoogleTakeoutStreamParser.name);
  readonly formatId = 'google-takeout';
  readonly name = 'Google Takeout & Browser History Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      (lower.includes('myactivity') ||
        lower.includes('browserhistory') ||
        lower.includes('chrome') ||
        lower.includes('takeout') ||
        lower.includes('youtube') ||
        lower.includes('watch-history') ||
        lower.includes('keep') ||
        lower.includes('search_history') ||
        lower.includes('searches')) &&
      lower.endsWith('.json')
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (context.signal?.aborted) {
        this.logger.warn(`Google Takeout parser aborted for job ${context.jobId}`);
        return;
      }
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const jsonStr = Buffer.concat(chunks).toString('utf8');
    let parsed: any;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (err: any) {
      this.logger.error(`Malformed Google Takeout JSON: ${err.message}`);
      return;
    }

    // Google Takeout can be an array of activity items or an object with 'Browser History' / 'activities'
    const items: any[] = Array.isArray(parsed)
      ? parsed
      : parsed['Browser History'] || parsed.activities || parsed.events || [];

    let recordsYielded = 0;
    const baseDate = new Date();

    for (let i = 0; i < items.length; i++) {
      if (context.signal?.aborted) {
        this.logger.warn('Google Takeout parser aborted during item emission');
        break;
      }

      const item = items[i];
      if (!item) continue;

      // Extract title / query / header
      const title = item.title || item.header || item.titleUrl || item.name || 'Google Activity';
      const url = item.titleUrl || item.url || '';
      const timeStr = item.time || item.timestamp || item.date || item.time_usec;
      const dateVal = timeStr ? parseFlexibleDate(timeStr) || baseDate : baseDate;

      // Extract products / category
      const products = Array.isArray(item.products) ? item.products.join(', ') : item.product || 'Search / Web';
      const fullContent = url ? `${title}\nURL: ${url}` : title;

      yield {
        timestamp: dateVal,
        actor: 'You (Google Account)',
        content: `[${products}] ${fullContent}`,
        eventType: 'browser_activity',
        metadata: {
          products,
          url,
          filename: context.filename,
        },
        urls: url ? [url] : extractUrls(fullContent),
        emojis: extractEmojis(fullContent),
        hasMedia: false,
      };

      recordsYielded++;
      if (recordsYielded % 1000 === 0 && context.onProgress) {
        context.onProgress(0, recordsYielded);
      }
    }

    this.logger.log(`Completed Google Takeout stream parse: records=${recordsYielded}`);
  }
}
