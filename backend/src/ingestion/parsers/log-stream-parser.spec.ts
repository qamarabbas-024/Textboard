import { LogStreamParser } from './log-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('LogStreamParser', () => {
  const parser = new LogStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_log_test',
    datasetId: 'ds_log_test',
    filename: 'application.log',
  };

  it('should identify log files by extension', () => {
    expect(parser.canHandle('text/plain', 'server.log')).toBe(true);
    expect(parser.canHandle('text/plain', 'nginx.access')).toBe(true);
    expect(parser.canHandle('text/plain', 'app.error')).toBe(true);
  });

  it('should parse timestamped structured log lines and preserve stack trace continuations', async () => {
    const logData =
      '[2025-05-10 14:00:01] [INFO] [AuthService] User alice logged in successfully from https://login.portal 🚀\n' +
      '[2025-05-10 14:00:05] [ERROR] [DatabaseSink] Query timeout exceeded\n' +
      '  at DatabaseSink.execute (sink.ts:45:10)\n' +
      '  at Worker.process (worker.ts:12:4)\n' +
      '[2025-05-10 14:00:10] [WARN] [CachePool] Cache memory above 85% threshold\n';

    const stream = Readable.from([logData]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(3);

    // Record 1: INFO
    expect(records[0].actor).toContain('AuthService [INFO]');
    expect(records[0].content).toContain('User alice logged in successfully');
    expect(records[0].urls).toContain('https://login.portal');
    expect(records[0].emojis).toContain('🚀');
    expect(records[0].eventType).toBe('log_info');

    // Record 2: ERROR with continuation stack trace
    expect(records[1].actor).toContain('DatabaseSink [ERROR]');
    expect(records[1].content).toContain('Query timeout exceeded');
    expect(records[1].content).toContain('at DatabaseSink.execute');
    expect(records[1].eventType).toBe('log_error');

    // Record 3: WARN
    expect(records[2].actor).toContain('CachePool [WARN]');
    expect(records[2].content).toContain('Cache memory above 85%');
    expect(records[2].eventType).toBe('log_warn');
  });
});
