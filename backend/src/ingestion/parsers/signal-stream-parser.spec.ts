import { SignalStreamParser } from './signal-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('SignalStreamParser', () => {
  const parser = new SignalStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_signal_test',
    datasetId: 'ds_signal_test',
    filename: 'chat.signal',
  };

  it('should identify Signal files and backup JSON exports', () => {
    expect(parser.canHandle('text/plain', 'signal_export.txt')).toBe(true);
    expect(parser.canHandle('application/json', 'signal_backup.json')).toBe(true);
    expect(parser.canHandle('application/json', 'data.json')).toBe(false);
  });

  it('should parse line-delimited Signal chat logs', async () => {
    const log = [
      '[2026-08-24 12:30:00] Alice: Encrypted payload delivered 🔐',
      '[2026-08-24 12:31:00] Bob: Received and verified.',
    ].join('\n');

    const stream = Readable.from([Buffer.from(log)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Alice');
    expect(records[0].content).toBe('Encrypted payload delivered 🔐');
    expect(records[0].emojis).toContain('🔐');
    expect(records[1].actor).toBe('Bob');
  });

  it('should parse Signal JSON backup format with quotes and reactions', async () => {
    const signalJson = JSON.stringify([
      {
        timestamp: 1724500000000,
        source: 'Alice',
        body: 'Can we sync on the architectural review?',
        quote: {
          author: 'Bob',
          text: 'Architecture document is ready',
        },
        reactions: [{ from: 'Bob', emoji: '👍' }],
        expireTimer: 604800,
      },
    ]);

    const stream = Readable.from([Buffer.from(signalJson)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(1);
    expect(records[0].actor).toBe('Alice');
    expect(records[0].content).toContain('[Replying to Bob: "Architecture document is ready"]');
    expect(records[0].content).toContain('[Reactions: Bob: 👍]');
    expect(records[0].metadata.expiresInSeconds).toBe(604800);
  });
});
