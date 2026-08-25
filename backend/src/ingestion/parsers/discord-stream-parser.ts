import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

// Discord text log pattern: [DD-MMM-YY hh:mm A/PM] Author#1234 or [YYYY-MM-DD HH:MM] Author:
const DISCORD_TXT_PATTERN_1 = /^\[(\d{1,2}-[A-Za-z]{3}-\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*[APap][Mm])\]\s+([^#\n:]+(?:#\d{4})?)(?::\s*|\s*-\s*|\s+)?(.*)$/;
const DISCORD_TXT_PATTERN_2 = /^\[(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)\]\s+([^#\n:]+(?:#\d{4})?)(?::\s*|\s*-\s*|\s+)?(.*)$/;

@Injectable()
export class DiscordStreamParser implements IStreamParser {
  private readonly logger = new Logger(DiscordStreamParser.name);
  readonly formatId = 'discord-stream';
  readonly name = 'Discord Export Stream Parser (JSON & TXT)';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.includes('discord') ||
      lower.endsWith('.discord.json') ||
      lower.endsWith('.discord.txt')
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const isJson =
      context.filename.toLowerCase().endsWith('.json') ||
      context.filename.toLowerCase().endsWith('.jsonl');

    if (isJson) {
      yield* this.parseDiscordJson(stream, context);
    } else {
      yield* this.parseDiscordText(stream, context);
    }
  }

  /**
   * Parses Discord JSON exports (e.g. from DiscordChatExporter or bot webhooks)
   */
  private async *parseDiscordJson(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (context.signal?.aborted) break;
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return;

    let root: any;
    try {
      root = JSON.parse(raw);
    } catch (err: any) {
      this.logger.warn(`Failed to parse Discord JSON directly: ${err.message}`);
      return;
    }

    // Identify messages array
    let messages: any[] = [];
    if (Array.isArray(root)) {
      messages = root;
    } else if (root && Array.isArray(root.messages)) {
      messages = root.messages;
    } else if (root && typeof root === 'object') {
      messages = [root];
    }

    let count = 0;
    for (const msg of messages) {
      if (context.signal?.aborted) break;
      count++;

      // Resolve author
      let actor = 'Unknown';
      if (typeof msg.author === 'string') {
        actor = msg.author;
      } else if (msg.author && typeof msg.author === 'object') {
        actor = msg.author.nickname || msg.author.name || msg.author.username || msg.author.id || 'User';
        if (msg.author.discriminator && msg.author.discriminator !== '0000' && msg.author.discriminator !== '0') {
          actor += `#${msg.author.discriminator}`;
        }
      }

      // Resolve timestamp
      const rawTimestamp = msg.timestamp || msg.timestampEdited || msg.created_at || msg.date;
      const timestamp = parseFlexibleDate(rawTimestamp);

      // Resolve content & attachments
      let content = msg.content || msg.text || msg.message || '';
      const hasMedia = Boolean(
        (Array.isArray(msg.attachments) && msg.attachments.length > 0) ||
        (Array.isArray(msg.embeds) && msg.embeds.length > 0) ||
        msg.hasMedia,
      );

      if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
        const attachmentUrls = msg.attachments.map((a: any) => a.url || a.fileName || 'attachment').join(' ');
        content = content ? `${content} [Attachment: ${attachmentUrls}]` : `[Attachment: ${attachmentUrls}]`;
      }

      if (Array.isArray(msg.embeds) && msg.embeds.length > 0) {
        const embedSummaries = msg.embeds
          .map((e: any) => [e.title, e.description].filter(Boolean).join(': '))
          .filter(Boolean)
          .join(' | ');
        if (embedSummaries) {
          content = content ? `${content} [Embed: ${embedSummaries}]` : `[Embed: ${embedSummaries}]`;
        }
      }

      const urls = extractUrls(content);
      const emojis = extractEmojis(content);

      yield {
        timestamp,
        rawTimestamp: rawTimestamp ? String(rawTimestamp) : undefined,
        actor,
        content: content || '[Empty message]',
        eventType: msg.type || 'message',
        metadata: {
          id: msg.id,
          channelId: msg.channelId || root?.channel?.id,
          guildId: msg.guildId || root?.guild?.id,
          reactions: msg.reactions,
          isPinned: msg.isPinned,
        },
        urls: urls.length > 0 ? urls : undefined,
        emojis: emojis.length > 0 ? emojis : undefined,
        hasMedia,
      };

      if (count % 2500 === 0 && context.onProgress) {
        context.onProgress(0, count);
      }
    }

    this.logger.log(`Discord JSON stream parsed: messages=${count}`);
  }

  /**
   * Parses Discord formatted text transcripts
   */
  private async *parseDiscordText(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const rl = readline.createInterface({
      input: stream as any,
      crlfDelay: Infinity,
    });

    let currentRecord: ParsedRecord | null = null;
    let lineCount = 0;
    let messageCount = 0;

    for await (const line of rl) {
      if (context.signal?.aborted) break;
      lineCount++;

      const trimmed = line.trim();
      if (!trimmed) continue;

      let match = trimmed.match(DISCORD_TXT_PATTERN_1) || trimmed.match(DISCORD_TXT_PATTERN_2);
      if (match) {
        if (currentRecord) {
          yield currentRecord;
          messageCount++;
        }

        const dateStr = match[1];
        const actor = match[2].trim();
        const content = match[3] || '';
        const timestamp = parseFlexibleDate(dateStr);
        const urls = extractUrls(content);
        const emojis = extractEmojis(content);

        currentRecord = {
          timestamp,
          rawTimestamp: dateStr,
          actor,
          content,
          eventType: 'message',
          urls: urls.length > 0 ? urls : undefined,
          emojis: emojis.length > 0 ? emojis : undefined,
          hasMedia: /\[(Attachment|Image|Video|File):/i.test(content) || /https:\/\/(cdn|media)\.discordapp\.(com|net)/i.test(content),
        };
      } else if (currentRecord) {
        currentRecord.content += '\n' + line;
        if (/\[(Attachment|Image|Video|File):/i.test(line) || /https:\/\/(cdn|media)\.discordapp\.(com|net)/i.test(line)) {
          currentRecord.hasMedia = true;
        }
      }
    }

    if (currentRecord) {
      yield currentRecord;
      messageCount++;
    }

    this.logger.log(`Discord TXT stream parsed: lines=${lineCount}, messages=${messageCount}`);
  }
}
