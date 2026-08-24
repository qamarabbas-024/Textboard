import { Injectable } from '@nestjs/common';
import { IStreamParser } from '../types';
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

@Injectable()
export class ParserRegistryService {
  private readonly parsers: IStreamParser[] = [];

  constructor(
    private readonly txtParser: TxtStreamParser,
    private readonly csvParser: CsvStreamParser,
    private readonly jsonParser: JsonStreamParser,
    private readonly xlsxParser: XlsxStreamParser,
    private readonly imessageParser: ImessageStreamParser,
    private readonly signalParser: SignalStreamParser,
    private readonly slackParser: SlackStreamParser,
    private readonly discordParser: DiscordStreamParser,
    private readonly chatParser: ChatStreamParser,
    private readonly aiChatParser: AiChatStreamParser,
    private readonly docxParser: DocxStreamParser,
    private readonly logParser: LogStreamParser,
    private readonly gitLogParser: GitLogStreamParser,
    private readonly mboxParser: MboxStreamParser,
    private readonly telegramParser: TelegramStreamParser,
    private readonly takeoutParser: GoogleTakeoutStreamParser,
    private readonly imageParser: ImageStreamParser,
  ) {
    // Specific platform parsers first
    this.registerParser(aiChatParser);
    this.registerParser(telegramParser);
    this.registerParser(takeoutParser);
    this.registerParser(imageParser);
    this.registerParser(discordParser);
    this.registerParser(imessageParser);
    this.registerParser(signalParser);
    this.registerParser(slackParser);
    this.registerParser(mboxParser);
    this.registerParser(gitLogParser);
    this.registerParser(csvParser);
    this.registerParser(jsonParser);
    this.registerParser(xlsxParser);
    this.registerParser(docxParser);
    this.registerParser(logParser);
    this.registerParser(chatParser);
    this.registerParser(txtParser); // General fallback
  }

  registerParser(parser: IStreamParser) {
    this.parsers.push(parser);
  }

  getParser(mimeType: string, filename: string): IStreamParser {
    for (const parser of this.parsers) {
      if (parser.canHandle(mimeType, filename)) {
        return parser;
      }
    }

    // Default fallback: plain text stream parser
    return this.txtParser;
  }

  getAllParsers(): IStreamParser[] {
    return [...this.parsers];
  }
}
