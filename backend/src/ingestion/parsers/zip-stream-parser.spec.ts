import { ZipStreamParser } from './zip-stream-parser';
import { ParserRegistryService } from './parser-registry.service';
import { TxtStreamParser } from './txt-stream-parser';
import { CsvStreamParser } from './csv-stream-parser';
import { JsonStreamParser } from './json-stream-parser';
import { XlsxStreamParser } from './xlsx-stream-parser';
import { ImessageStreamParser } from './imessage-stream-parser';
import { SignalStreamParser } from './signal-stream-parser';
import { SlackStreamParser } from './slack-stream-parser';
import { DiscordStreamParser } from './discord-stream-parser';
import { ChatStreamParser } from './chat-stream-parser';
import { AiChatStreamParser } from './ai-chat-stream-parser';
import { DocxStreamParser } from './docx-stream-parser';
import { LogStreamParser } from './log-stream-parser';
import { GitLogStreamParser } from './git-log-stream-parser';
import { MboxStreamParser } from './mbox-stream-parser';
import { TelegramStreamParser } from './telegram-stream-parser';
import { GoogleTakeoutStreamParser } from './google-takeout-stream-parser';
import { ImageStreamParser } from './image-stream-parser';
import { ParserContext } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';

describe('ZipStreamParser (Universal Backup Archive Unpacker)', () => {
  let zipParser: ZipStreamParser;
  let registry: ParserRegistryService;
  const testDir = path.resolve(process.cwd(), '.textboard', 'test_zip_parser');

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });

    const txtParser = new TxtStreamParser();
    const csvParser = new CsvStreamParser();
    const jsonParser = new JsonStreamParser();
    const xlsxParser = new XlsxStreamParser();
    const imessageParser = new ImessageStreamParser();
    const signalParser = new SignalStreamParser();
    const slackParser = new SlackStreamParser();
    const discordParser = new DiscordStreamParser();
    const chatParser = new ChatStreamParser();
    const aiChatParser = new AiChatStreamParser();
    const docxParser = new DocxStreamParser();
    const logParser = new LogStreamParser();
    const gitLogParser = new GitLogStreamParser();
    const mboxParser = new MboxStreamParser();
    const telegramParser = new TelegramStreamParser();
    const takeoutParser = new GoogleTakeoutStreamParser();
    const imageParser = new ImageStreamParser();

    registry = new ParserRegistryService(
      txtParser,
      csvParser,
      jsonParser,
      xlsxParser,
      imessageParser,
      signalParser,
      slackParser,
      discordParser,
      chatParser,
      aiChatParser,
      docxParser,
      logParser,
      gitLogParser,
      mboxParser,
      telegramParser,
      takeoutParser,
      imageParser,
    );

    zipParser = new ZipStreamParser(registry);
    zipParser.onModuleInit();
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  it('should identify zip archives by extension and mimeType', () => {
    expect(zipParser.canHandle('application/zip', 'whatsapp_backup.zip')).toBe(true);
    expect(zipParser.canHandle('application/octet-stream', 'telegram_export.zip')).toBe(true);
    expect(zipParser.canHandle('text/plain', 'notes.txt')).toBe(false);
  });

  it('should unpack WhatsApp ZIP archive with chat log and media attachments', async () => {
    const zipPath = path.join(testDir, 'sample_whatsapp_backup.zip');
    const zip = new AdmZip();

    const sampleChat =
      '14/08/2025, 10:42 - Ali: Hey! Can you send the quarterly file? 📊\n' +
      '14/08/2025, 10:43 - Fatima: Sure, here it is: <attached: report.pdf>\n';

    zip.addFile('_chat.txt', Buffer.from(sampleChat, 'utf-8'));
    zip.addFile('report.pdf', Buffer.from('dummy pdf bytes'));
    zip.addFile('photo.jpg', Buffer.from('dummy jpg bytes'));
    zip.writeZip(zipPath);

    const context: ParserContext = {
      jobId: 'job_zip_test',
      datasetId: 'ds_zip_test',
      filename: 'sample_whatsapp_backup.zip',
    };

    const fileStream = fs.createReadStream(zipPath);
    const records: any[] = [];

    for await (const rec of zipParser.parseStream(fileStream, context)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Ali');
    expect(records[0].content).toContain('quarterly file');
    expect(records[0].metadata?.archiveSource).toBe('sample_whatsapp_backup.zip');
    expect(records[0].metadata?.archiveMediaCount).toBe(2);
    expect(records[1].actor).toBe('Fatima');
  });
});
