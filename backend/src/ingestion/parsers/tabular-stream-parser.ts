import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';

@Injectable()
export class TabularStreamParser implements IStreamParser {
  private readonly logger = new Logger(TabularStreamParser.name);
  readonly formatId = 'tabular-csv';
  readonly name = 'Tabular CSV/TSV Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'csv' || ext === 'tsv' || mimeType.includes('csv') || mimeType.includes('tab-separated');
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
    const baseDate = new Date('2024-01-01T08:00:00Z');

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`Tabular parsing aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      if (!line || line.trim().length === 0) continue;

      if (isFirstLine) {
        // Detect delimiter
        if (line.includes('\t') && (line.match(/\t/g) || []).length > (line.match(/,/g) || []).length) {
          delimiter = '\t';
        }
        headers = this.parseCsvLine(line, delimiter).map((h) => h.trim());
        isFirstLine = false;

        // Auto-detect actor and date columns
        actorColIndex = headers.findIndex((h) =>
          /^(name|actor|sender|student|student_name|user|author|person|employee)$/i.test(h),
        );
        dateColIndex = headers.findIndex((h) =>
          /^(date|timestamp|time|datetime|created_at|term|period)$/i.test(h),
        );

        continue;
      }

      rowsProcessed++;
      const values = this.parseCsvLine(line, delimiter);
      const rowObj: Record<string, any> = {};

      for (let i = 0; i < headers.length; i++) {
        rowObj[headers[i] || `col_${i}`] = values[i] !== undefined ? values[i] : '';
      }

      let actor: string | undefined = undefined;
      if (actorColIndex >= 0 && values[actorColIndex]) {
        actor = values[actorColIndex].trim();
      }

      let timestamp = new Date(baseDate.getTime() + rowsProcessed * 3600000);
      if (dateColIndex >= 0 && values[dateColIndex]) {
        const rawDate = values[dateColIndex];
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          timestamp = parsed;
        }
      }

      const contentSummary = Object.entries(rowObj)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');

      yield {
        timestamp,
        rawTimestamp: dateColIndex >= 0 ? values[dateColIndex] : undefined,
        actor,
        content: contentSummary,
        eventType: 'record',
        metadata: rowObj,
      };

      if (rowsProcessed % 2500 === 0 && context.onProgress) {
        context.onProgress(0, rowsProcessed);
      }
    }

    this.logger.log(`Tabular stream completed: rows=${rowsProcessed}, columns=${headers.length}`);
  }

  private parseCsvLine(text: string, delimiter: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  }
}
