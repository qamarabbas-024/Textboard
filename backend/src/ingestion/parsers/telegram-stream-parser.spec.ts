import { TelegramStreamParser } from './telegram-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('TelegramStreamParser', () => {
  const parser = new TelegramStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_tg_test',
    datasetId: 'ds_tg_test',
    filename: 'result.json',
  };

  it('should identify Telegram result.json exports', () => {
    expect(parser.canHandle('application/json', 'result.json')).toBe(true);
    expect(parser.canHandle('application/json', 'telegram_chat_export.json')).toBe(true);
    expect(parser.canHandle('application/json', 'data.json')).toBe(false);
  });

  it('should parse Telegram messages with text arrays and photos', async () => {
    const tgJson = JSON.stringify({
      name: 'TextBoard Engineering Group',
      type: 'public_supergroup',
      id: 12345678,
      messages: [
        {
          id: 101,
          type: 'message',
          date: '2026-08-24T10:00:00',
          from: 'Telegram Alice',
          text: [
            'Check the new release notes on ',
            { type: 'link', text: 'https://textboard.local' },
            ' 🚀',
          ],
        },
        {
          id: 102,
          type: 'message',
          date: '2026-08-24T10:05:00',
          from: 'Telegram Bob',
          text: 'Here is the diagram',
          photo: 'photos/photo_102@24-08-2026_10-05-00.jpg',
        },
      ],
    });

    const stream = Readable.from([Buffer.from(tgJson)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);

    expect(records[0].actor).toBe('Telegram Alice');
    expect(records[0].content).toContain('Check the new release notes on https://textboard.local 🚀');
    expect(records[0].urls).toContain('https://textboard.local');
    expect(records[0].emojis).toContain('🚀');

    expect(records[1].actor).toBe('Telegram Bob');
    expect(records[1].content).toContain('[Photo: photos/photo_102@24-08-2026_10-05-00.jpg]');
    expect(records[1].hasMedia).toBe(true);
  });
});
