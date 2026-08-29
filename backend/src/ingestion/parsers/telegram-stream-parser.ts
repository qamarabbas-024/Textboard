import { Injectable, Logger } from '@nestjs/common';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

@Injectable()
export class TelegramStreamParser implements IStreamParser {
  private readonly logger = new Logger(TelegramStreamParser.name);
  readonly formatId = 'telegram';
  readonly name = 'Telegram Desktop Export Stream Parser (JSON & HTML)';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      ((lower.includes('telegram') || lower === 'result.json' || lower.includes('chat_export')) &&
        (lower.endsWith('.json') || lower.endsWith('.html') || lower.endsWith('.htm'))) ||
      (lower.startsWith('messages') && (lower.endsWith('.html') || lower.endsWith('.htm')))
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

    const fullStr = Buffer.concat(chunks).toString('utf8');
    const isHtml = context.filename.toLowerCase().endsWith('.html') || context.filename.toLowerCase().endsWith('.htm') || fullStr.includes('<div class="message default');

    if (isHtml) {
      yield* this.parseHtmlExport(fullStr, context);
    } else {
      yield* this.parseJsonExport(fullStr, context);
    }
  }

  private async *parseJsonExport(fullJsonStr: string, context: ParserContext): AsyncIterable<ParsedRecord> {
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
      if (context.signal?.aborted) break;

      const msg = messages[i];
      if (msg.type !== 'message') continue;

      let textContent = '';
      if (typeof msg.text === 'string') {
        textContent = msg.text;
      } else if (Array.isArray(msg.text)) {
        textContent = msg.text
          .map((part: any) => (typeof part === 'string' ? part : part.text || ''))
          .join('');
      }

      let hasMedia = false;
      let mediaTag = '';
      let audioDuration: number | undefined;
      let locationObj: { lat: number; lng: number } | undefined;

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
        audioDuration = msg.duration_seconds || 0;
        mediaTag = ` [Voice Note: ${audioDuration ? `${audioDuration}s` : 'Audio'}]`;
      } else if (msg.location_information) {
        locationObj = {
          lat: msg.location_information.latitude,
          lng: msg.location_information.longitude,
        };
        mediaTag = ` [Location: ${locationObj.lat}, ${locationObj.lng}]`;
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
          mediaType: msg.media_type || (hasMedia ? 'attachment' : undefined),
          reactions: msg.reactions,
          audioDuration,
          location: locationObj,
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

  private async *parseHtmlExport(htmlStr: string, context: ParserContext): AsyncIterable<ParsedRecord> {
    const msgRegex = /<div class="message default[^"]*" id="message(\d+)">([\s\S]*?)(?=(?:<div class="message default|$))/gi;
    let match: RegExpExecArray | null;
    let recordsYielded = 0;
    const baseDate = new Date();
    let lastAuthor = 'Telegram User';

    while ((match = msgRegex.exec(htmlStr)) !== null) {
      if (context.signal?.aborted) break;

      const msgId = match[1];
      const body = match[2];

      const fromMatch = /<div class="from_name">\s*([^<]+)\s*<\/div>/i.exec(body);
      if (fromMatch) {
        lastAuthor = fromMatch[1].trim();
      }

      const dateMatch = /<div class="pull_right date details" title="([^"]+)">/i.exec(body);
      const rawDate = dateMatch ? dateMatch[1] : '';
      const dateVal = rawDate ? parseFlexibleDate(rawDate) || baseDate : baseDate;

      const textMatch = /<div class="text[^"]*">([\s\S]*?)<\/div>/i.exec(body);
      let content = '';
      if (textMatch) {
        content = textMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
      }

      const hasMedia = /class="media_wrap|photo_wrap|video_file|audio_file"/i.test(body);

      yield {
        timestamp: dateVal,
        actor: lastAuthor,
        content: content || (hasMedia ? '[Media Attachment]' : '[Empty Message]'),
        eventType: 'message',
        metadata: {
          telegramMessageId: msgId,
          sourceFormat: 'telegram-html',
          filename: context.filename,
        },
        urls: extractUrls(content),
        emojis: extractEmojis(content),
        hasMedia,
      };

      recordsYielded++;
      if (recordsYielded % 1000 === 0 && context.onProgress) {
        context.onProgress(0, recordsYielded);
      }
    }

    this.logger.log(`Completed Telegram HTML stream parse: messages=${recordsYielded}`);
  }
}
