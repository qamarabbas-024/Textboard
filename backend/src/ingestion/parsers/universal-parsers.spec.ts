import { ImessageStreamParser } from './imessage-stream-parser';
import { SignalStreamParser } from './signal-stream-parser';
import { SlackStreamParser } from './slack-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('Universal Chat Platform Parsers (iMessage, Signal, Slack)', () => {
  const dummyContext: ParserContext = {
    jobId: 'job_test_universal',
    datasetId: 'ds_test_universal',
    filename: 'test_file.txt',
  };

  describe('ImessageStreamParser', () => {
    const imessageParser = new ImessageStreamParser();

    it('should identify iMessage filenames', () => {
      expect(imessageParser.canHandle('application/json', 'my_imessage_chat.json')).toBe(true);
      expect(imessageParser.canHandle('text/plain', 'chat.db')).toBe(true);
      expect(imessageParser.canHandle('text/plain', 'imessage_archive.imessage')).toBe(true);
    });

    it('should parse iMessage text format with timestamps and senders', async () => {
      const sampleText =
        '2025-01-10 14:30:00 +15551234567: Hey! Sent via iMessage 🚀\n' +
        '2025-01-10 14:31:15 Me: Awesome! Testing local parser.\n';

      const stream = Readable.from([sampleText]);
      const records: any[] = [];
      for await (const rec of imessageParser.parseStream(stream, dummyContext)) {
        records.push(rec);
      }

      expect(records.length).toBe(2);
      expect(records[0].actor).toBe('+15551234567');
      expect(records[0].content).toContain('Sent via iMessage');
      expect(records[1].actor).toBe('Me');
    });

    it('should parse iMessage JSON array format with Apple nanoseconds', async () => {
      const sampleJson = [
        {
          date: 726678000000000000, // Apple nanoseconds since 2001
          sender: 'john.appleseed@icloud.com',
          text: 'iMessage JSON dump message',
          is_from_me: false,
        },
      ];

      const stream = Readable.from([JSON.stringify(sampleJson)]);
      const records: any[] = [];
      for await (const rec of imessageParser.parseStream(stream, dummyContext)) {
        records.push(rec);
      }

      expect(records.length).toBe(1);
      expect(records[0].actor).toBe('john.appleseed@icloud.com');
      expect(records[0].content).toBe('iMessage JSON dump message');
      expect(records[0].timestamp.getFullYear()).toBeGreaterThan(2020);
    });
  });

  describe('SignalStreamParser', () => {
    const signalParser = new SignalStreamParser();

    it('should identify Signal files', () => {
      expect(signalParser.canHandle('text/plain', 'signal-backup-2025.txt')).toBe(true);
      expect(signalParser.canHandle('text/plain', 'chat_export.signal')).toBe(true);
    });

    it('should parse Signal multiline chat transcripts and attachments', async () => {
      const sampleText =
        '[2025-03-15 09:12] Alice: Good morning team!\n' +
        'Here is the updated proposal plan.\n' +
        '[2025-03-15 09:15] Bob: [Attachment: proposal.pdf] Received!\n';

      const stream = Readable.from([sampleText]);
      const records: any[] = [];
      for await (const rec of signalParser.parseStream(stream, dummyContext)) {
        records.push(rec);
      }

      expect(records.length).toBe(2);
      expect(records[0].actor).toBe('Alice');
      expect(records[0].content).toContain('updated proposal plan');
      expect(records[1].actor).toBe('Bob');
      expect(records[1].hasMedia).toBe(true);
    });
  });

  describe('SlackStreamParser', () => {
    const slackParser = new SlackStreamParser();

    it('should identify Slack channel files', () => {
      expect(slackParser.canHandle('application/json', 'slack_export.json')).toBe(true);
      expect(slackParser.canHandle('application/json', 'general.slack.json')).toBe(true);
    });

    it('should parse Slack JSON export and sanitize mentions & links', async () => {
      const sampleSlack = [
        {
          type: 'message',
          user: 'U999',
          user_profile: { display_name: 'Lead Engineer' },
          text: 'Hello <@U12345> check out <https://textboard.local|TextBoard App>',
          ts: '1700000000.000100',
          reactions: [{ name: 'fire', count: 3 }],
        },
      ];

      const stream = Readable.from([JSON.stringify(sampleSlack)]);
      const records: any[] = [];
      for await (const rec of slackParser.parseStream(stream, dummyContext)) {
        records.push(rec);
      }

      expect(records.length).toBe(1);
      expect(records[0].actor).toBe('Lead Engineer');
      expect(records[0].content).toContain('@U12345');
      expect(records[0].content).toContain('TextBoard App (https://textboard.local)');
    });
  });
});
