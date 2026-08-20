import { Readable } from 'stream';
import { CsvStreamParser } from './csv-stream-parser';

describe('CsvStreamParser (V1)', () => {
  let parser: CsvStreamParser;

  beforeEach(() => {
    parser = new CsvStreamParser();
  });

  it('should identify CSV/TSV formats', () => {
    expect(parser.canHandle('text/csv', 'data.csv')).toBe(true);
    expect(parser.canHandle('text/tab-separated-values', 'data.tsv')).toBe(true);
    expect(parser.canHandle('application/json', 'data.json')).toBe(false);
  });

  it('should parse standard CSV with headers, actor, timestamps, and metadata', async () => {
    const csvContent = [
      'Name,Date,Score,Notes\n',
      'Alice,2024-01-15 10:00:00,95,Excellent progress! 🌟\n',
      'Bob,2024-01-15 10:30:00,82,Check repo: https://github.com/project\n',
    ];

    const stream = Readable.from(csvContent);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_csv_1',
      datasetId: 'ds_csv_1',
      filename: 'scores.csv',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Alice');
    expect(records[0].content).toContain('Score: 95');
    expect(records[0].emojis).toContain('🌟');
    expect(records[0].metadata.rowData.Score).toBe('95');

    expect(records[1].actor).toBe('Bob');
    expect(records[1].urls).toContain('https://github.com/project');
  });

  it('should auto-detect TSV tab delimiters and parse correctly', async () => {
    const tsvContent = [
      'author\ttimestamp\tmessage\n',
      'Charlie\t2024-02-01 12:00:00\tTab-separated message content\n',
    ];

    const stream = Readable.from(tsvContent);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_tsv',
      datasetId: 'ds_tsv',
      filename: 'data.tsv',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(1);
    expect(records[0].actor).toBe('Charlie');
    expect(records[0].content).toContain('Tab-separated message content');
  });

  it('should handle quoted fields with embedded commas and quotes', async () => {
    const csvContent = [
      'User,Comment,Category\n',
      'Dana,"Hello, this is a quoted string with, commas",Feedback\n',
      'Evan,"Quotes with ""escaped"" internal quotes",Test\n',
    ];

    const stream = Readable.from(csvContent);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_quoted',
      datasetId: 'ds_quoted',
      filename: 'quoted.csv',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Dana');
    expect(records[0].metadata.rowData.Comment).toBe('Hello, this is a quoted string with, commas');
    expect(records[1].metadata.rowData.Comment).toBe('Quotes with "escaped" internal quotes');
  });

  it('should handle missing fields without dropping records', async () => {
    const csvContent = [
      'Name,Date,Extra1,Extra2\n',
      'Frank,2024-01-01,,\n', // Missing trailing values
    ];

    const stream = Readable.from(csvContent);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_missing',
      datasetId: 'ds_missing',
      filename: 'missing.csv',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(1);
    expect(records[0].actor).toBe('Frank');
    expect(records[0].metadata.rowData.Extra1).toBe('');
  });

  it('should handle empty CSV files cleanly', async () => {
    const stream = Readable.from([]);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_empty_csv',
      datasetId: 'ds_empty_csv',
      filename: 'empty.csv',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(0);
  });
});
