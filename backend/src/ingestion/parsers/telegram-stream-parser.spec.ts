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

  it('should parse Telegram HTML exports with message author, date, and text', async () => {
    const tgHtml = `
      <div class="message default clearfix" id="message501">
        <div class="body">
          <div class="from_name">Alice Developer</div>
          <div class="pull_right date details" title="24.08.2026 14:30:00">14:30</div>
          <div class="text">Deployed the forensic parser to production.<br>Working flawlessly!</div>
        </div>
      </div>
    `;

    const htmlContext: ParserContext = {
      jobId: 'job_tg_html',
      datasetId: 'ds_tg_html',
      filename: 'messages.html',
    };

    const stream = Readable.from([Buffer.from(tgHtml)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, htmlContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(1);
    expect(records[0].actor).toBe('Alice Developer');
    expect(records[0].content).toContain('Deployed the forensic parser to production.\nWorking flawlessly!');
    expect(records[0].metadata.telegramMessageId).toBe('501');
    expect(records[0].metadata.sourceFormat).toBe('telegram-html');
  });
});
