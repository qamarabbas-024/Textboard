import { Readable } from 'stream';
import { TxtStreamParser } from './txt-stream-parser';

describe('TxtStreamParser (V1)', () => {
  let parser: TxtStreamParser;

  beforeEach(() => {
    parser = new TxtStreamParser();
  });

  it('should identify supported text formats', () => {
    expect(parser.canHandle('text/plain', 'chat.txt')).toBe(true);
    expect(parser.canHandle('text/plain', 'system.log')).toBe(true);
    expect(parser.canHandle('application/pdf', 'doc.pdf')).toBe(false);
  });

  it('should parse standard chat logs with sender, timestamp, emojis, and URLs', async () => {
    const rawData = [
      '[15/01/2024, 10:00:00 AM] Alice: Hello! Check https://textboard.local 🎉\n',
      '[15/01/2024, 10:01:00 AM] Bob: Thanks Alice! Looks great 🚀\n',
      'This is a multi-line continuation.\n',
      '[15/01/2024, 10:02:00 AM] Messages to this chat are end-to-end encrypted.\n',
    ];

    const stream = Readable.from(rawData);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_txt_1',
      datasetId: 'ds_txt_1',
      filename: 'chat.txt',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(3);
    expect(records[0].actor).toBe('Alice');
    expect(records[0].urls).toContain('https://textboard.local');
    expect(records[0].emojis).toContain('🎉');

    expect(records[1].actor).toBe('Bob');
    expect(records[1].content).toContain('This is a multi-line continuation.');
    expect(records[1].emojis).toContain('🚀');

    expect(records[2].eventType).toBe('system');
  });

  it('should handle full Unicode & international non-ASCII characters seamlessly', async () => {
    const rawData = [
      '[2024-01-15 14:30:00] 太郎: こんにちは世界！日本語のテスト 🌸\n',
      '[2024-01-15 14:31:00] Müller: Grüße aus München! 🍺 Über https://example.de\n',
    ];

    const stream = Readable.from(rawData);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_unicode',
      datasetId: 'ds_unicode',
      filename: 'international.txt',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('太郎');
    expect(records[0].content).toContain('こんにちは世界');
    expect(records[0].emojis).toContain('🌸');

    expect(records[1].actor).toBe('Müller');
    expect(records[1].content).toContain('Grüße aus München');
    expect(records[1].urls).toContain('https://example.de');
  });

  it('should handle empty text files cleanly', async () => {
    const stream = Readable.from([]);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_empty',
      datasetId: 'ds_empty',
      filename: 'empty.txt',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(0);
  });

  it('should handle malformed / unstructured lines without silent data loss', async () => {
    const rawData = [
      '--- Chat Export Header v1.0 ---\n',
      'Random unformatted note without date\n',
      '[15/01/2024, 10:00:00] Alice: Normal line\n',
    ];

    const stream = Readable.from(rawData);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_malformed',
      datasetId: 'ds_malformed',
      filename: 'notes.txt',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(2);
    expect(records[0].eventType).toBe('unstructured');
    expect(records[0].content).toContain('--- Chat Export Header');
    expect(records[1].actor).toBe('Alice');
  });

  it('should scale efficiently on large 10,000 line streams without memory accumulation', async () => {
    const lines = Array.from({ length: 10000 }, (_, i) =>
      `[15/01/2024, 10:00:00] User_${i % 10}: Message number ${i} with emoji 🎈\n`,
    );

    const stream = Readable.from(lines);
    let count = 0;

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_large',
      datasetId: 'ds_large',
      filename: 'large.txt',
    })) {
      count++;
      expect(record.actor).toBeDefined();
    }

    expect(count).toBe(10000);
  });
});
