import { Readable } from 'stream';
import { ChatStreamParser } from './chat-stream-parser';

describe('ChatStreamParser (V1 Streaming)', () => {
  let parser: ChatStreamParser;

  beforeEach(() => {
    parser = new ChatStreamParser();
  });

  it('should identify supported files', () => {
    expect(parser.canHandle('text/plain', 'chat.txt')).toBe(true);
    expect(parser.canHandle('text/plain', 'app.log')).toBe(true);
    expect(parser.canHandle('application/pdf', 'file.pdf')).toBe(false);
  });

  it('should stream parse WhatsApp export format line by line', async () => {
    const rawLines = [
      '[15/01/2024, 10:00:00 AM] Alice: Hello Bob! Check this: https://example.com/demo 🎉\n',
      '[15/01/2024, 10:01:15 AM] Bob: Hey Alice! Looks amazing.\n',
      'Line 2 of Bob message continuation.\n',
      '[15/01/2024, 10:02:00 AM] Messages and calls are end-to-end encrypted.\n',
    ];

    const stream = Readable.from(rawLines);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_1',
      datasetId: 'ds_1',
      filename: 'chat.txt',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(3);
    expect(records[0].actor).toBe('Alice');
    expect(records[0].content).toContain('Hello Bob!');
    expect(records[0].eventType).toBe('message');

    expect(records[1].actor).toBe('Bob');
    expect(records[1].content).toContain('Looks amazing.\nLine 2 of Bob message continuation.');

    expect(records[2].actor).toBeUndefined();
    expect(records[2].eventType).toBe('system');
  });

  it('should handle cancellation gracefully via AbortSignal', async () => {
    const controller = new AbortController();
    const thousandLines = Array.from({ length: 1000 }, (_, i) =>
      `[15/01/2024, 10:00:00] Alice: Message ${i}\n`,
    );

    const stream = Readable.from(thousandLines);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_cancel',
      datasetId: 'ds_cancel',
      filename: 'chat.txt',
      signal: controller.signal,
    })) {
      records.push(record);
      if (records.length === 5) {
        controller.abort();
      }
    }

    expect(records.length).toBeLessThan(50);
  });
});
