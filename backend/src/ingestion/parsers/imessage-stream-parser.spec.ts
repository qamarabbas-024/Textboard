import { ImessageStreamParser } from './imessage-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('ImessageStreamParser', () => {
  const parser = new ImessageStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_imessage_test',
    datasetId: 'ds_imessage_test',
    filename: 'chat.imessage',
  };

  it('should identify iMessage files and chat.db exports', () => {
    expect(parser.canHandle('application/json', 'chat.imessage')).toBe(true);
    expect(parser.canHandle('application/x-sqlite3', 'imessage_chat.db')).toBe(true);
    expect(parser.canHandle('application/json', 'other.json')).toBe(false);
  });

  it('should parse line-delimited iMessage transcripts', async () => {
    const transcript = [
      '2026-08-24 10:00:00 +1234567890: Hey are you coming to the meeting?',
      '2026-08-24 10:01:30 Me: Yes on my way now!',
    ].join('\n');

    const stream = Readable.from([Buffer.from(transcript)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('+1234567890');
    expect(records[0].content).toBe('Hey are you coming to the meeting?');
    expect(records[1].actor).toBe('Me');
    expect(records[1].content).toBe('Yes on my way now!');
  });

  it('should parse JSON iMessage exports with Apple nanosecond epoch and Tapbacks', async () => {
    const imessageJson = JSON.stringify([
      {
        guid: 'msg-101',
        text: 'Great job on the demo yesterday',
        is_from_me: 0,
        handle: 'Steve',
        date: 746182800000000000,
        service_name: 'iMessage',
        attachments: [{ filename: 'chart.png' }],
      },
      {
        guid: 'msg-102',
        associated_message_guid: 'msg-101',
        associated_message_type: 2000,
        is_from_me: 1,
        date: 746182860000000000,
        service_name: 'iMessage',
      },
    ]);

    const stream = Readable.from([Buffer.from(imessageJson)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Steve');
    expect(records[0].content).toContain('Great job on the demo yesterday [Attachments: chart.png]');
    expect(records[0].hasMedia).toBe(true);

    expect(records[1].actor).toBe('Me');
    expect(records[1].eventType).toBe('reaction');
    expect(records[1].content).toContain('[Tapback: ❤️ Loved "msg-101"]');
  });
});
