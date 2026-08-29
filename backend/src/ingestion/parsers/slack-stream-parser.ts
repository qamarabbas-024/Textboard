import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis } from './parser-utils';

@Injectable()
export class SlackStreamParser implements IStreamParser {
  private readonly logger = new Logger(SlackStreamParser.name);
  readonly formatId = 'slack-stream';
  readonly name = 'Slack Workspace Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.includes('slack') ||
      lower.endsWith('.slack.json')
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const rl = readline.createInterface({
      input: stream as any,
      crlfDelay: Infinity,
    });

    let buffer = '';
    let isJsonArray = false;
    let recordsCount = 0;

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`Parsing aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      const trimmed = line.trim();
      if (!trimmed) continue;

      // NDJSON line
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const msg = JSON.parse(trimmed);
          if (msg && typeof msg === 'object' && (!msg.type || msg.type === 'message')) {
            const record = this.transformSlackMessage(msg);
            if (record) {
              recordsCount++;
              yield record;
            }
          }
        } catch {
          buffer += line + '\n';
        }
        continue;
      }

      buffer += line + '\n';
    }

    if (buffer) {
      try {
        const parsed = JSON.parse(buffer);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const msg of list) {
          if (msg && typeof msg === 'object' && (!msg.type || msg.type === 'message')) {
            const record = this.transformSlackMessage(msg);
            if (record) {
              recordsCount++;
              yield record;
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to parse Slack JSON stream buffer: ${err.message}`);
      }
    }
  }

  private transformSlackMessage(msg: any): ParsedRecord | null {
    if (!msg.text && (!msg.files || msg.files.length === 0)) return null;

    let timestamp = new Date();
    if (msg.ts) {
      const unixSecs = parseFloat(msg.ts);
      if (!isNaN(unixSecs)) {
        timestamp = new Date(Math.floor(unixSecs * 1000));
      }
    }

    let cleanText = msg.text || '';
    cleanText = cleanText.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2 ($1)');
    cleanText = cleanText.replace(/<(https?:\/\/[^>]+)>/g, '$1');
    cleanText = cleanText.replace(/<@([A-Z0-9]+)>/g, '@$1');

    if (msg.files && msg.files.length > 0) {
      const fileNames = msg.files.map((f: any) => f.name || f.title || f.mimetype || 'file').join(', ');
      cleanText += ` [Files: ${fileNames}]`;
    }

    if (msg.reactions && msg.reactions.length > 0) {
      const reactionStr = msg.reactions.map((r: any) => `:${r.name}: (${r.count || 1})`).join(' ');
      cleanText += ` [Reactions: ${reactionStr}]`;
    }

    const actor = msg.user_profile?.display_name || msg.user_profile?.real_name || msg.username || msg.user || 'Slack User';

    return {
      timestamp,
      rawTimestamp: String(msg.ts || ''),
      actor,
      content: cleanText.trim() || '[Empty Message]',
      eventType: msg.subtype === 'channel_join' ? 'system' : 'message',
      hasMedia: Boolean(msg.files && msg.files.length > 0),
      metadata: {
        platform: 'slack',
        threadTs: msg.thread_ts,
        isThreadReply: Boolean(msg.thread_ts && msg.thread_ts !== msg.ts),
        replyCount: msg.reply_count,
        subtype: msg.subtype,
      },
      urls: extractUrls(cleanText),
      emojis: extractEmojis(cleanText),
    };
  }
}
