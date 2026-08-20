import { Readable } from 'stream';
import { JsonStreamParser } from './json-stream-parser';

describe('JsonStreamParser (V1)', () => {
  let parser: JsonStreamParser;

  beforeEach(() => {
    parser = new JsonStreamParser();
  });

  it('should identify JSON and NDJSON formats', () => {
    expect(parser.canHandle('application/json', 'export.json')).toBe(true);
    expect(parser.canHandle('application/x-ndjson', 'events.jsonl')).toBe(true);
    expect(parser.canHandle('text/plain', 'notes.txt')).toBe(false);
  });

  it('should stream parse NDJSON / JSON Lines line by line', async () => {
    const ndjsonContent = [
      '{"sender": "Alice", "timestamp": "2024-01-15T10:00:00Z", "message": "NDJSON message 1 🎉"}\n',
      '{"sender": "Bob", "timestamp": "2024-01-15T10:05:00Z", "message": "NDJSON message 2 with https://example.com"}\n',
    ];

    const stream = Readable.from(ndjsonContent);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_ndjson',
      datasetId: 'ds_ndjson',
      filename: 'data.jsonl',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Alice');
    expect(records[0].content).toBe('NDJSON message 1 🎉');
    expect(records[0].emojis).toContain('🎉');

    expect(records[1].actor).toBe('Bob');
    expect(records[1].urls).toContain('https://example.com');
  });

  it('should parse standard JSON array of objects', async () => {
    const jsonContent = JSON.stringify([
      { author: 'Charlie', date: '2024-02-01 12:00:00', text: 'First array item', score: 100 },
      { author: 'Dana', date: '2024-02-01 12:30:00', text: 'Second array item', tags: ['work', 'review'] },
    ]);

    const stream = Readable.from([jsonContent]);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_json_array',
      datasetId: 'ds_json_array',
      filename: 'export.json',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Charlie');
    expect(records[0].content).toBe('First array item');
    expect(records[0].metadata.score).toBe(100);

    expect(records[1].actor).toBe('Dana');
    expect(records[1].metadata.tags).toContain('work');
  });

  it('should parse Telegram / Discord export envelopes with nested messages array', async () => {
    const telegramExport = JSON.stringify({
      name: 'Family Chat',
      type: 'saved_messages',
      id: 123456789,
      messages: [
        {
          id: 1,
          type: 'message',
          date: '2024-01-10T08:00:00',
          from: 'Alice',
          text: 'Hello from Telegram export!',
        },
        {
          id: 2,
          type: 'message',
          date: '2024-01-10T08:05:00',
          from: 'Bob',
          text: ['Formatted text with ', { type: 'bold', text: 'bold segment' }, ' 🎉'],
        },
      ],
    });

    const stream = Readable.from([telegramExport]);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_telegram',
      datasetId: 'ds_telegram',
      filename: 'result.json',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Alice');
    expect(records[0].content).toBe('Hello from Telegram export!');

    expect(records[1].actor).toBe('Bob');
    expect(records[1].content).toContain('Formatted text with bold segment');
    expect(records[1].emojis).toContain('🎉');
  });

  it('should handle malformed NDJSON lines without crashing or dropping valid lines', async () => {
    const rawContent = [
      '{"sender": "Alice", "message": "Good line 1"}\n',
      '{corrupt json line without quotes\n',
      '{"sender": "Bob", "message": "Good line 2"}\n',
    ];

    const stream = Readable.from(rawContent);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_malformed_json',
      datasetId: 'ds_malformed_json',
      filename: 'stream.jsonl',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(3);
    expect(records[0].actor).toBe('Alice');
    expect(records[1].eventType).toBe('unstructured');
    expect(records[1].metadata.parseError).toBeDefined();
    expect(records[2].actor).toBe('Bob');
  });

  it('should handle empty JSON files cleanly', async () => {
    const stream = Readable.from([]);
    const records: any[] = [];

    for await (const record of parser.parseStream(stream, {
      jobId: 'job_empty_json',
      datasetId: 'ds_empty_json',
      filename: 'empty.json',
    })) {
      records.push(record);
    }

    expect(records.length).toBe(0);
  });
});
