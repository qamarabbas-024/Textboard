import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

@Injectable()
export class JsonStreamParser implements IStreamParser {
  private readonly logger = new Logger(JsonStreamParser.name);
  readonly formatId = 'json';
  readonly name = 'Structured JSON / NDJSON Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return (
      ext === 'json' ||
      ext === 'jsonl' ||
      ext === 'ndjson' ||
      mimeType.includes('application/json') ||
      mimeType.includes('json')
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const isNdjson =
      context.filename.endsWith('.jsonl') ||
      context.filename.endsWith('.ndjson');

    if (isNdjson) {
      yield* this.parseNdjsonStream(stream, context);
    } else {
      yield* this.parseStandardJsonStream(stream, context);
    }
  }

  /**
   * High-throughput line-by-line parsing for NDJSON / JSON Lines.
   */
  private async *parseNdjsonStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const rl = readline.createInterface({
      input: stream as any,
      crlfDelay: Infinity,
    });

    let lineIndex = 0;
    let recordsYielded = 0;

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`JSON parser aborted by signal for job ${context.jobId}`);
        rl.close();
        break;
      }

      if (!line || line.trim().length === 0) continue;
      lineIndex++;

      try {
        const item = JSON.parse(line);
        yield this.mapObjectToRecord(item, lineIndex);
        recordsYielded++;

        if (recordsYielded % 2500 === 0 && context.onProgress) {
          context.onProgress(0, recordsYielded);
        }
      } catch (err: any) {
        this.logger.warn(`Malformed JSON line at index ${lineIndex}: ${err.message}`);
        // Never silent data loss: preserve raw line as unstructured event
        yield {
          timestamp: new Date(),
          content: line.slice(0, 1000),
          eventType: 'unstructured',
          metadata: { parseError: err.message, rawLine: line },
        };
        recordsYielded++;
      }
    }

    this.logger.log(`NDJSON stream completed: records=${recordsYielded}`);
  }

  /**
   * Resilient parsing for standard JSON arrays or export envelopes (e.g. Telegram, Discord).
   */
  private async *parseStandardJsonStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    // Read stream chunks
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (context.signal?.aborted) {
        this.logger.warn(`JSON parser aborted by signal for job ${context.jobId}`);
        break;
      }
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const fullText = Buffer.concat(chunks).toString('utf8').trim();
    if (!fullText) return;

    let parsedRoot: any;
    try {
      parsedRoot = JSON.parse(fullText);
    } catch (err: any) {
      this.logger.warn(`Standard JSON parse error: ${err.message}. Falling back to line scanner.`);
      // Fallback: try parsing individual lines
      const lines = fullText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (!l) continue;
        try {
          const item = JSON.parse(l);
          yield this.mapObjectToRecord(item, i + 1);
        } catch {
          // Ignore non-json fragments
        }
      }
      return;
    }

    // Extract target array
    let itemsArray: any[] = [];
    if (Array.isArray(parsedRoot)) {
      itemsArray = parsedRoot;
    } else if (parsedRoot && typeof parsedRoot === 'object') {
      // Check for common export containers: messages, records, events, data, items
      if (Array.isArray(parsedRoot.messages)) {
        itemsArray = parsedRoot.messages;
      } else if (Array.isArray(parsedRoot.records)) {
        itemsArray = parsedRoot.records;
      } else if (Array.isArray(parsedRoot.events)) {
        itemsArray = parsedRoot.events;
      } else if (Array.isArray(parsedRoot.data)) {
        itemsArray = parsedRoot.data;
      } else if (Array.isArray(parsedRoot.items)) {
        itemsArray = parsedRoot.items;
      } else {
        // Single root object
        itemsArray = [parsedRoot];
      }
    }

    let count = 0;
    for (const item of itemsArray) {
      if (context.signal?.aborted) break;
      count++;
      yield this.mapObjectToRecord(item, count);

      if (count % 2500 === 0 && context.onProgress) {
        context.onProgress(0, count);
      }
    }

    this.logger.log(`JSON stream completed: items=${count}`);
  }

  /**
   * Maps a generic JSON object to canonical ParsedRecord while preserving all fields in metadata.
   */
  private mapObjectToRecord(item: any, index: number): ParsedRecord {
    if (!item || typeof item !== 'object') {
      return {
        timestamp: new Date(),
        content: String(item),
        eventType: 'record',
        metadata: { rawValue: item, index },
      };
    }

    // 1. Resolve Actor
    const actor =
      item.actor ||
      item.sender ||
      item.from ||
      item.from_name ||
      item.author ||
      item.user ||
      item.username ||
      item.name;

    // 2. Resolve Timestamp
    const rawTimestamp =
      item.timestamp ||
      item.date ||
      item.time ||
      item.created_at ||
      item.createdAt ||
      item.date_unixtime;
    const timestamp = parseFlexibleDate(rawTimestamp);

    // 3. Resolve Content
    let content = '';
    const rawContent = item.content || item.text || item.message || item.body || item.summary || item.description;

    if (typeof rawContent === 'string') {
      content = rawContent;
    } else if (Array.isArray(rawContent)) {
      // Telegram format: text can be array of strings and objects
      content = rawContent
        .map((part) => (typeof part === 'string' ? part : part.text || ''))
        .join('');
    } else if (rawContent !== undefined && rawContent !== null) {
      content = JSON.stringify(rawContent);
    } else {
      // Fallback: format key-values
      content = Object.entries(item)
        .filter(([k, v]) => typeof v !== 'object' && v !== null && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ') || `Record #${index}`;
    }

    const urls = extractUrls(content);
    const emojis = extractEmojis(content);

    return {
      timestamp,
      rawTimestamp: rawTimestamp ? String(rawTimestamp) : undefined,
      actor: actor ? String(actor).trim() : undefined,
      content,
      eventType: item.type || item.eventType || (item.media_type ? 'media' : 'record'),
      metadata: item,
      urls: urls.length > 0 ? urls : undefined,
      emojis: emojis.length > 0 ? emojis : undefined,
      hasMedia: Boolean(item.photo || item.file || item.media_type || item.attachment),
    };
  }
}
