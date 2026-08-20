import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { parseFlexibleDate, extractUrls, extractEmojis } from './parser-utils';

@Injectable()
export class XlsxStreamParser implements IStreamParser {
  private readonly logger = new Logger(XlsxStreamParser.name);
  readonly formatId = 'xlsx';
  readonly name = 'Excel Workbook Stream Parser (XLSX/XLS)';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return (
      ext === 'xlsx' ||
      ext === 'xls' ||
      mimeType.includes('spreadsheetml') ||
      mimeType.includes('excel')
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (context.signal?.aborted) {
        this.logger.warn(`XLSX parser aborted by signal for job ${context.jobId}`);
        break;
      }
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    if (chunks.length === 0) return;
    const fileBuffer = Buffer.concat(chunks);

    // Validate Excel / ZIP / OLE header signatures
    const isZip = fileBuffer.length >= 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b;
    const isOle = fileBuffer.length >= 4 && fileBuffer[0] === 0xd0 && fileBuffer[1] === 0xcf;
    const isXml = fileBuffer.slice(0, 100).toString('utf8').includes('<?xml');

    if (!isZip && !isOle && !isXml) {
      throw new BadRequestException('Invalid Excel file format or corrupted binary workbook.');
    }

    let workbook: xlsx.WorkBook;
    try {
      workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
    } catch (err: any) {
      this.logger.error(`Failed to parse Excel workbook: ${err.message}`);
      throw new BadRequestException(`Corrupted or unsupported Excel format: ${err.message}`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return;
    }

    let globalRowIndex = 0;
    const baseFallbackDate = new Date('2024-01-01T08:00:00Z');

    for (const sheetName of workbook.SheetNames) {
      if (context.signal?.aborted) break;

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rawRows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      if (rawRows.length === 0) continue;

      const columns = Object.keys(rawRows[0]);
      const actorCol = columns.find((c) =>
        /^(name|student|student_name|candidate|user|person|author|employee|sender)$/i.test(c),
      );
      const dateCol = columns.find((c) =>
        /^(date|timestamp|term|semester|quarter|time|period|year|created_at)$/i.test(c),
      );

      for (let i = 0; i < rawRows.length; i++) {
        if (context.signal?.aborted) break;

        globalRowIndex++;
        const row = rawRows[i];

        let actor: string | undefined = undefined;
        if (actorCol && row[actorCol]) {
          actor = String(row[actorCol]).trim();
        }

        let timestamp = new Date(baseFallbackDate.getTime() + globalRowIndex * 3600000);
        let rawTimestamp: string | undefined = undefined;

        if (dateCol && row[dateCol]) {
          rawTimestamp = String(row[dateCol]);
          timestamp = parseFlexibleDate(row[dateCol]);
        }

        const contentParts: string[] = [];
        for (const col of columns) {
          const val = row[col];
          if (col === actorCol) continue;
          if (val !== '' && val !== null && val !== undefined) {
            contentParts.push(`${col}: ${val}`);
          }
        }

        const safeContent =
          contentParts.length > 0 ? contentParts.join(' | ') : `Record #${globalRowIndex}`;
        const urls = extractUrls(safeContent);
        const emojis = extractEmojis(safeContent);

        yield {
          timestamp,
          rawTimestamp,
          actor,
          content: safeContent,
          eventType: 'record',
          metadata: {
            sheetName,
            rowIndex: i + 1,
            globalIndex: globalRowIndex,
            rowData: row,
            columns,
          },
          urls: urls.length > 0 ? urls : undefined,
          emojis: emojis.length > 0 ? emojis : undefined,
        };

        if (globalRowIndex % 2500 === 0 && context.onProgress) {
          context.onProgress(0, globalRowIndex);
        }
      }
    }

    this.logger.log(`XLSX workbook parsing complete: sheets=${workbook.SheetNames.length}, rows=${globalRowIndex}`);
  }
}
