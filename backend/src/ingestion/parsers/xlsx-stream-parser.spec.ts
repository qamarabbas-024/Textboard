import { Readable } from 'stream';
import * as xlsx from 'xlsx';
import { XlsxStreamParser } from './xlsx-stream-parser';

describe('XlsxStreamParser (V1)', () => {
  let parser: XlsxStreamParser;

  beforeEach(() => {
    parser = new XlsxStreamParser();
  });

  it('should identify Excel workbook formats', () => {
    expect(parser.canHandle('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'grades.xlsx')).toBe(true);
    expect(parser.canHandle('application/vnd.ms-excel', 'data.xls')).toBe(true);
    expect(parser.canHandle('text/csv', 'data.csv')).toBe(false);
  });

  it('should parse multi-sheet Excel workbooks with column values, actor, and metadata', async () => {
    const wb = xlsx.utils.book_new();

    const sheet1Data = [
      { Student: 'Alice', Math: 95, Science: 90, Feedback: 'Great work! 🌟' },
      { Student: 'Bob', Math: 80, Science: 85, Feedback: 'See link: https://school.edu' },
    ];
    const ws1 = xlsx.utils.json_to_sheet(sheet1Data);
    xlsx.utils.book_append_sheet(wb, ws1, 'Term1_Grades');

    const sheet2Data = [
      { Candidate: 'Charlie', Score: 100, Notes: 'Perfect score 🎉' },
    ];
    const ws2 = xlsx.utils.json_to_sheet(sheet2Data);
    xlsx.utils.book_append_sheet(wb, ws2, 'Special_Awards');

    const buffer: Buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const stream = Readable.from([buffer]);

    const records: any[] = [];
    for await (const record of parser.parseStream(stream, {
      jobId: 'job_xlsx',
      datasetId: 'ds_xlsx',
      filename: 'grades.xlsx',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(3);

    // Sheet 1 records
    expect(records[0].actor).toBe('Alice');
    expect(records[0].content).toContain('Math: 95');
    expect(records[0].emojis).toContain('🌟');
    expect(records[0].metadata.sheetName).toBe('Term1_Grades');

    expect(records[1].actor).toBe('Bob');
    expect(records[1].urls).toContain('https://school.edu');

    // Sheet 2 records
    expect(records[2].actor).toBe('Charlie');
    expect(records[2].content).toContain('Score: 100');
    expect(records[2].emojis).toContain('🎉');
    expect(records[2].metadata.sheetName).toBe('Special_Awards');
  });

  it('should handle empty streams cleanly', async () => {
    const stream = Readable.from([]);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_empty_xlsx',
      datasetId: 'ds_empty_xlsx',
      filename: 'empty.xlsx',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(0);
  });

  it('should throw clear error on corrupted binary data', async () => {
    const corruptBuffer = Buffer.from('NOT_A_VALID_EXCEL_ZIP_BINARY_DATA');
    const stream = Readable.from([corruptBuffer]);

    const consume = async () => {
      for await (const _ of parser.parseStream(stream, {
        jobId: 'job_corrupt',
        datasetId: 'ds_corrupt',
        filename: 'corrupted.xlsx',
      })) {
        // iterate
      }
    };

    await expect(consume()).rejects.toThrow();
  });
});
