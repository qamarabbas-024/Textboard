import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import {
  parseDelimitedLine,
  detectDelimiter,
  parseFlexibleDate,
  extractUrls,
  extractEmojis,
} from './parser-utils';

@Injectable()
export class CsvStreamParser implements IStreamParser {
  private readonly logger = new Logger(CsvStreamParser.name);
  readonly formatId = 'csv';
  readonly name = 'Delimited Tabular Stream Parser (CSV/TSV)';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return (
      ext === 'csv' ||
      ext === 'tsv' ||
      ext === 'tab' ||
      mimeType.includes('csv') ||
      mimeType.includes('tab-separated')
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

    let isFirstLine = true;
    let delimiter = ',';
    let headers: string[] = [];
    let actorColIndex = -1;
    let dateColIndex = -1;
    let rowsProcessed = 0;
    const baseFallbackDate = new Date('2024-01-01T08:00:00Z');

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`CSV parser aborted by signal for job ${context.jobId}`);
        rl.close();
        break;
      }

      if (!line || line.trim().length === 0) continue;

      if (isFirstLine) {
        delimiter = detectDelimiter(line);
        headers = parseDelimitedLine(line, delimiter).map((h, idx) => h.trim() || `column_${idx + 1}`);
        isFirstLine = false;

        // Auto-detect actor and date columns
        actorColIndex = headers.findIndex((h) =>
          /^(name|actor|sender|student|student_name|user|author|person|employee|from|investigator|agent|analyst|speaker|caller|officer)$/i.test(h),
        );
        dateColIndex = headers.findIndex((h) =>
          /^(date|timestamp|time|datetime|created_at|term|period|year|month)$/i.test(h),
        );

        continue;
      }

      rowsProcessed++;
      const values = parseDelimitedLine(line, delimiter);
      const rowObj: Record<string, any> = {};

      // Fill row object preserving all headers
      for (let i = 0; i < headers.length; i++) {
        rowObj[headers[i]] = values[i] !== undefined ? values[i] : '';
      }

      // If more values than headers, preserve excess
      if (values.length > headers.length) {
        for (let i = headers.length; i < values.length; i++) {
          rowObj[`extra_${i + 1}`] = values[i];
        }
      }

      let actor: string | undefined = undefined;
      if (actorColIndex >= 0 && values[actorColIndex]) {
        actor = String(values[actorColIndex]).trim();
      }

      let timestamp = new Date(baseFallbackDate.getTime() + rowsProcessed * 3600000);
      let rawTimestamp: string | undefined = undefined;

      if (dateColIndex >= 0 && values[dateColIndex]) {
        rawTimestamp = String(values[dateColIndex]).trim();
        timestamp = parseFlexibleDate(rawTimestamp);
      }

      // Format clean row summary for searchability & display
      const contentSummary = Object.entries(rowObj)
        .filter(([k, v]) => v !== '' && v !== null && v !== undefined && !k.startsWith('extra_'))
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');

      const safeContent = contentSummary.length > 0 ? contentSummary : `Row #${rowsProcessed}`;
      const urls = extractUrls(safeContent);
      const emojis = extractEmojis(safeContent);

      yield {
        timestamp,
        rawTimestamp,
        actor,
        content: safeContent,
        eventType: 'record',
        metadata: {
          rowData: rowObj,
          columns: headers,
          rowIndex: rowsProcessed,
        },
        urls: urls.length > 0 ? urls : undefined,
        emojis: emojis.length > 0 ? emojis : undefined,
      };

      if (rowsProcessed % 2500 === 0 && context.onProgress) {
        context.onProgress(0, rowsProcessed);
      }
    }

    this.logger.log(`CSV stream completed: rows=${rowsProcessed}, columns=${headers.length}`);
  }
}
