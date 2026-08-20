import { Injectable, Logger, BadRequestException, RequestTimeoutException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as xlsx from 'xlsx';

const PARSE_TIMEOUT_MS = 60000;

@Injectable()
export class SpreadsheetParserService {
  private readonly logger = new Logger(SpreadsheetParserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processSpreadsheet(
    buffer: Buffer,
    filename: string,
    batchSize = 5000,
    timeoutMs = PARSE_TIMEOUT_MS,
  ) {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Uploaded spreadsheet file is empty (0 bytes).');
    }

    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<any>((_, reject) => {
      timer = setTimeout(() => {
        reject(new RequestTimeoutException(`Spreadsheet parsing timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });

    try {
      return await Promise.race([
        this.internalProcessSpreadsheet(buffer, filename, batchSize),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private async internalProcessSpreadsheet(
    buffer: Buffer,
    filename: string,
    batchSize = 5000,
  ) {
    const startTime = Date.now();

    // 1. Read workbook safely
    let workbook: xlsx.WorkBook;
    try {
      workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    } catch (err: any) {
      throw new BadRequestException(`Unable to parse spreadsheet: ${err.message || 'Corrupted workbook format'}`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new BadRequestException('Spreadsheet contains no readable sheets.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      throw new BadRequestException('Primary worksheet is empty.');
    }

    const rawRows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      throw new BadRequestException('Spreadsheet contains no data rows (empty sheet).');
    }

    const columns = Object.keys(rawRows[0]);
    if (columns.length === 0) {
      throw new BadRequestException('No column headers detected in spreadsheet.');
    }

    // 2. Auto-detect column data types
    const columnTypes: Record<string, 'date' | 'number' | 'text'> = {};
    for (const col of columns) {
      let isDate = false;
      let isNum = true;
      let nonNullCount = 0;

      for (const row of rawRows.slice(0, 50)) {
        const val = row[col];
        if (val === '' || val === null || val === undefined) continue;
        nonNullCount++;

        if (val instanceof Date) {
          isDate = true;
          isNum = false;
          break;
        } else if (typeof val === 'string' && !isNaN(Date.parse(val)) && (val.includes('-') || val.includes('/'))) {
          isDate = true;
          isNum = false;
          break;
        } else if (isNaN(Number(val))) {
          isNum = false;
        }
      }

      if (isDate) {
        columnTypes[col] = 'date';
      } else if (isNum && nonNullCount > 0) {
        columnTypes[col] = 'number';
      } else {
        columnTypes[col] = 'text';
      }
    }

    // 3. Identify gradebook / student performance characteristics
    const actorCol =
      columns.find((c) => /^(name|student|student_name|candidate|user|person|author|employee)$/i.test(c)) ||
      columns.find((c) => columnTypes[c] === 'text') ||
      columns[0];

    const dateCol =
      columns.find((c) => /^(date|timestamp|term|semester|quarter|time|period|year)$/i.test(c)) ||
      columns.find((c) => columnTypes[c] === 'date');

    const numericCols = columns.filter((c) => columnTypes[c] === 'number');

    // Check if gradebook data
    const isGradebook =
      numericCols.length >= 2 &&
      columns.some((c) => /math|science|english|physics|chem|grade|score|gpa|mark|exam/i.test(c));

    // 4. Create Dataset record
    const dataset = await this.prisma.dataset.create({
      data: {
        name: filename,
        sourceType: 'spreadsheet',
        metadata: JSON.stringify({
          columns,
          columnTypes,
          rowCount: rawRows.length,
          sheetName: firstSheetName,
          isGradebook,
          actorColumn: actorCol,
          dateColumn: dateCol || null,
        }),
      },
    });

    // 5. Build TimelineEvents & Analytical Highlights/Metrics
    const eventsBatch: any[] = [];
    const highlightsToInsert: any[] = [];
    const metricsToInsert: any[] = [];

    let baseDate = new Date('2024-01-01T08:00:00Z');
    let totalMessages = 0;
    const actorCounts: Record<string, number> = {};

    const studentSubjectScores: Record<string, Record<string, number[]>> = {};
    const columnSums: Record<string, number> = {};
    const columnMins: Record<string, number> = {};
    const columnMaxs: Record<string, number> = {};

    for (const numCol of numericCols) {
      columnSums[numCol] = 0;
      columnMins[numCol] = Infinity;
      columnMaxs[numCol] = -Infinity;
    }

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      totalMessages++;

      const actor = row[actorCol] ? String(row[actorCol]).trim() : `Row ${i + 1}`;
      actorCounts[actor] = (actorCounts[actor] || 0) + 1;

      // Determine timestamp
      let timestamp = new Date(baseDate.getTime() + i * 3600000);
      if (dateCol && row[dateCol]) {
        const rawD = row[dateCol];
        const parsed = rawD instanceof Date ? rawD : new Date(rawD);
        if (!isNaN(parsed.getTime())) {
          timestamp = parsed;
        }
      }

      // Format content summary
      const contentParts: string[] = [];
      for (const col of columns) {
        const val = row[col];
        if (col === actorCol) continue;
        if (val !== '' && val !== null && val !== undefined) {
          contentParts.push(`${col}: ${val}`);

          if (columnTypes[col] === 'number') {
            const numVal = Number(val);
            if (!isNaN(numVal)) {
              columnSums[col] += numVal;
              if (numVal < columnMins[col]) columnMins[col] = numVal;
              if (numVal > columnMaxs[col]) columnMaxs[col] = numVal;

              if (isGradebook) {
                if (!studentSubjectScores[actor]) studentSubjectScores[actor] = {};
                if (!studentSubjectScores[actor][col]) studentSubjectScores[actor][col] = [];
                studentSubjectScores[actor][col].push(numVal);
              }
            }
          }
        }
      }

      const content = contentParts.length > 0 ? contentParts.join(' | ') : `Record #${i + 1}`;

      eventsBatch.push({
        datasetId: dataset.id,
        timestamp,
        actor,
        content,
        eventType: 'message',
        metadata: row,
      });

      if (eventsBatch.length >= batchSize) {
        await this.prisma.timelineEvent.createMany({ data: eventsBatch });
        eventsBatch.length = 0;
      }
    }

    if (eventsBatch.length > 0) {
      await this.prisma.timelineEvent.createMany({ data: eventsBatch });
    }

    // 6. Generate Metrics & Highlights
    for (const numCol of numericCols) {
      const avg = rawRows.length > 0 ? columnSums[numCol] / rawRows.length : 0;
      metricsToInsert.push({
        datasetId: dataset.id,
        name: `${numCol}_average`,
        value: Math.round(avg * 100) / 100,
        category: 'column_stats',
      });
      metricsToInsert.push({
        datasetId: dataset.id,
        name: `${numCol}_max`,
        value: columnMaxs[numCol] !== -Infinity ? columnMaxs[numCol] : 0,
        category: 'column_stats',
      });
    }

    if (isGradebook) {
      for (const [student, subjects] of Object.entries(studentSubjectScores)) {
        let studentTotal = 0;
        let subjectCount = 0;

        for (const [subject, scores] of Object.entries(subjects)) {
          const avgSubjectScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          studentTotal += avgSubjectScore;
          subjectCount++;

          if (avgSubjectScore < 70) {
            highlightsToInsert.push({
              datasetId: dataset.id,
              title: `Weak Subject Alert: ${student} in ${subject}`,
              description: `Average score in ${subject} is ${avgSubjectScore.toFixed(1)}% (below 70% proficiency threshold).`,
              score: avgSubjectScore,
            });
          }
        }

        const overallAvg = subjectCount > 0 ? studentTotal / subjectCount : 0;
        const gpa = Math.max(0, Math.min(4.0, (overallAvg / 20) - 1));

        metricsToInsert.push({
          datasetId: dataset.id,
          name: `student_gpa`,
          stringValue: student,
          value: Math.round(gpa * 100) / 100,
          category: 'gpa',
        });
      }
    }

    if (highlightsToInsert.length > 0) {
      await this.prisma.highlight.createMany({ data: highlightsToInsert.slice(0, 50) });
    }

    if (metricsToInsert.length > 0) {
      await this.prisma.metric.createMany({ data: metricsToInsert });
    }

    const processingTimeMs = Date.now() - startTime;
    // Strict privacy logging: only row count and duration
    this.logger.log(`Spreadsheet processed successfully: id=${dataset.id}, rowCount=${totalMessages}, duration=${processingTimeMs}ms`);

    return {
      datasetId: dataset.id,
      name: filename,
      totalMessages,
      dateRange: {
        start: null,
        end: null,
      },
      actorCounts,
      processingTimeMs,
      isGradebook,
      columns,
    };
  }
}
