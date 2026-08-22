import { DiscordStreamParser } from './discord-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('DiscordStreamParser', () => {
  const parser = new DiscordStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_discord_test',
    datasetId: 'ds_discord_test',
    filename: 'discord_general_export.json',
  };

  it('should identify Discord filenames and mime types', () => {
    expect(parser.canHandle('application/json', 'discord_chat.json')).toBe(true);
    expect(parser.canHandle('text/plain', 'channel_export.discord.txt')).toBe(true);
    expect(parser.canHandle('application/json', 'my_server_discord_dump.json')).toBe(true);
  });

  it('should parse Discord JSON export with author object, attachments, and timestamps', async () => {
    const sampleJson = {
      guild: { id: '12345', name: 'Textboard Dev Guild' },
      channel: { id: '67890', name: 'general' },
      messages: [
        {
          id: 'msg_001',
          type: 'Default',
          timestamp: '2025-02-14T18:30:00.000Z',
          author: {
            id: 'user_1',
            name: 'AlexDev',
            nickname: 'Alex (Lead)',
            discriminator: '1337',
          },
          content: 'Hey everyone, check out https://textboard.local 🚀',
          attachments: [
            {
              id: 'att_1',
              url: 'https://cdn.discordapp.com/attachments/123/456/screenshot.png',
              fileName: 'screenshot.png',
            },
          ],
        },
        {
          id: 'msg_002',
          type: 'Default',
          timestamp: '2025-02-14T18:32:00.000Z',
          author: {
            id: 'user_2',
            name: 'Sam',
            discriminator: '0',
          },
          content: 'Looks super clean! ✨',
          attachments: [],
        },
      ],
    };

    const stream = Readable.from([JSON.stringify(sampleJson)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Alex (Lead)#1337');
    expect(records[0].content).toContain('screenshot.png');
    expect(records[0].hasMedia).toBe(true);
    expect(records[0].urls).toContain('https://textboard.local');
    expect(records[0].emojis).toContain('🚀');

    expect(records[1].actor).toBe('Sam');
    expect(records[1].content).toContain('Looks super clean!');
    expect(records[1].emojis).toContain('✨');
  });

  it('should parse Discord formatted text log files', async () => {
    const sampleTxt =
      '[14-Feb-25 06:30 PM] Alex#1337\n' +
      'Hello Discord chat! Working on stream parsers.\n' +
      '[14-Feb-25 06:35 PM] Jordan\n' +
      'Awesome work! [Attachment: report.pdf]\n';

    const stream = Readable.from([sampleTxt]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, { ...dummyContext, filename: 'discord_log.txt' })) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Alex#1337');
    expect(records[0].content).toContain('Working on stream parsers.');
    expect(records[1].actor).toBe('Jordan');
    expect(records[1].hasMedia).toBe(true);
  });
});
