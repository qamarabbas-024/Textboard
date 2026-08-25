import { Injectable, Logger } from '@nestjs/common';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

@Injectable()
export class TelegramStreamParser implements IStreamParser {
  private readonly logger = new Logger(TelegramStreamParser.name);
  readonly formatId = 'telegram-json';
  readonly name = 'Telegram Desktop Export Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      (lower.includes('telegram') || lower === 'result.json' || lower.includes('chat_export')) &&
      lower.endsWith('.json')
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (context.signal?.aborted) {
        this.logger.warn(`Telegram parser aborted for job ${context.jobId}`);
        return;
      }
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const fullJsonStr = Buffer.concat(chunks).toString('utf8');
    let parsedData: any;

    try {
      parsedData = JSON.parse(fullJsonStr);
    } catch (err: any) {
      this.logger.error(`Malformed Telegram JSON export: ${err.message}`);
      return;
    }

    const messages = Array.isArray(parsedData.messages) ? parsedData.messages : [];
    let recordsYielded = 0;
    const baseDate = new Date();

    for (let i = 0; i < messages.length; i++) {
      if (context.signal?.aborted) {
        this.logger.warn('Telegram parser aborted during message emission');
        break;
      }

      const msg = messages[i];
      if (msg.type !== 'message') continue;

      let textContent = '';
      if (typeof msg.text === 'string') {
        textContent = msg.text;
      } else if (Array.isArray(msg.text)) {
        // Telegram rich text entities array
        textContent = msg.text
          .map((part: any) => (typeof part === 'string' ? part : part.text || ''))
          .join('');
      }

      // Check media attachments
      let hasMedia = false;
      let mediaTag = '';
      if (msg.photo) {
        hasMedia = true;
        mediaTag = ` [Photo: ${msg.photo}]`;
      } else if (msg.file) {
        hasMedia = true;
        mediaTag = ` [Attachment: ${msg.file}]`;
      } else if (msg.media_type) {
        hasMedia = true;
        mediaTag = ` [${msg.media_type.toUpperCase()}]`;
      } else if (msg.voice_message || msg.audio) {
        hasMedia = true;
        mediaTag = ' [Voice Note]';
      }

      let forwardTag = '';
      if (msg.forwarded_from) {
        forwardTag = ` [Forwarded from: ${msg.forwarded_from}]`;
      }

      const finalContent = `${forwardTag}${textContent}${mediaTag}`.trim();
      const dateVal = msg.date ? parseFlexibleDate(msg.date) || baseDate : baseDate;
      const actorName = msg.from || msg.actor || 'Telegram User';

      yield {
        timestamp: dateVal,
        actor: actorName,
        content: finalContent,
        eventType: 'message',
        metadata: {
          telegramMessageId: msg.id,
          replyToMessageId: msg.reply_to_message_id,
          mediaType: msg.media_type,
          reactions: msg.reactions,
          filename: context.filename,
        },
        urls: extractUrls(finalContent),
        emojis: extractEmojis(finalContent),
        hasMedia,
      };

      recordsYielded++;
      if (recordsYielded % 1000 === 0 && context.onProgress) {
        context.onProgress(0, recordsYielded);
      }
    }

    this.logger.log(`Completed Telegram JSON stream parse: messages=${recordsYielded}`);
  }
}
