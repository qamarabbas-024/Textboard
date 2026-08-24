import { MboxStreamParser } from './mbox-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('MboxStreamParser', () => {
  const parser = new MboxStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_mbox_test',
    datasetId: 'ds_mbox_test',
    filename: 'inbox_archive.mbox',
  };

  it('should identify mbox and eml files', () => {
    expect(parser.canHandle('application/mbox', 'inbox.mbox')).toBe(true);
    expect(parser.canHandle('message/rfc822', 'email.eml')).toBe(true);
    expect(parser.canHandle('text/plain', 'plain.txt')).toBe(false);
  });

  it('should parse email streams into structured email messages', async () => {
    const rawMbox =
      'From sender@example.com Mon Aug 24 10:00:00 2026\n' +
      'From: Alice Engineer <alice@company.com>\n' +
      'To: Team <team@company.com>\n' +
      'Subject: Quarterly Data Platform Release 🚀\n' +
      'Date: Mon, 24 Aug 2026 10:00:00 +0000\n' +
      '\n' +
      'Hello team,\n' +
      'The new local-first data workstation is live on https://textboard.internal\n' +
      '\n' +
      'From bob@example.com Mon Aug 24 11:00:00 2026\n' +
      'From: Bob Lead <bob@company.com>\n' +
      'To: Alice <alice@company.com>\n' +
      'Subject: Re: Quarterly Data Platform Release\n' +
      'Date: Mon, 24 Aug 2026 11:00:00 +0000\n' +
      '\n' +
      'Great work! Verified 100% lossless export.\n';

    const stream = Readable.from([rawMbox]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);

    expect(records[0].actor).toContain('Alice Engineer');
    expect(records[0].content).toContain('Subject: Quarterly Data Platform Release');
    expect(records[0].content).toContain('https://textboard.internal');
    expect(records[0].urls).toContain('https://textboard.internal');
    expect(records[0].emojis).toContain('🚀');
    expect(records[0].eventType).toBe('email_message');

    expect(records[1].actor).toContain('Bob Lead');
    expect(records[1].content).toContain('Verified 100% lossless export');
    expect(records[1].eventType).toBe('email_message');
  });
});
