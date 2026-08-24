import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

export type UniversalRole = 'human' | 'assistant' | 'system' | 'tool' | 'custom';

export interface AiMessageNode {
  id?: string;
  role: UniversalRole;
  actorName: string;
  content: string;
  timestamp: Date;
  rawTimestamp?: string;
  model?: string;
  conversationTitle?: string;
  conversationId?: string;
  tokens?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class AiChatStreamParser implements IStreamParser {
  private readonly logger = new Logger(AiChatStreamParser.name);
  readonly formatId = 'ai-chat';
  readonly name = 'Universal AI & LLM Conversation Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    const isJson = lower.endsWith('.json') || mimeType.includes('application/json');
    const isMd = lower.endsWith('.md') || mimeType.includes('markdown');

    if (isJson) {
      if (
        lower.includes('conversation') ||
        lower.includes('chatgpt') ||
        lower.includes('claude') ||
        lower.includes('gemini') ||
        lower.includes('openai') ||
        lower.includes('anthropic') ||
        lower.includes('llm') ||
        lower.includes('prompt')
      ) {
        return true;
      }
    }

    if (isMd && (lower.includes('transcript') || lower.includes('chat') || lower.includes('convo') || lower.includes('prompt'))) {
      return true;
    }

    return false;
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const isMarkdown = context.filename.toLowerCase().endsWith('.md');

    if (isMarkdown) {
      yield* this.parseMarkdownAiTranscript(stream, context);
    } else {
      yield* this.parseJsonAiTranscript(stream, context);
    }
  }

  /**
   * Parses Markdown conversation transcripts with turn headers.
   */
  private async *parseMarkdownAiTranscript(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const rl = readline.createInterface({
      input: stream as any,
      crlfDelay: Infinity,
    });

    let currentRole: UniversalRole = 'human';
    let currentActor = 'User';
    let currentLines: string[] = [];
    let currentTimestamp = new Date();
    let recordsYielded = 0;

    const TURN_PATTERNS = [
      /^(?:#{1,4}\s+|\*\*)?(Human|User|Prompt|Me|You)(?:\*\*)?:\s*(.*)$/i,
      /^(?:#{1,4}\s+|\*\*)?(Assistant|Claude|ChatGPT|GPT-4|GPT-3\.5|Gemini|AI|Bot)(?:\*\*)?:\s*(.*)$/i,
      /^(?:#{1,4}\s+|\*\*)?(System)(?:\*\*)?:\s*(.*)$/i,
      /^(?:#{1,4}\s+|\*\*)?(Tool|Function)(?:\*\*)?:\s*(.*)$/i,
    ];

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`AI Markdown parser aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      let matchedTurn = false;

      for (const pattern of TURN_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          matchedTurn = true;

          // Flush previous turn
          if (currentLines.length > 0) {
            const content = currentLines.join('\n').trim();
            if (content.length > 0) {
              yield this.buildRecord(content, currentActor, currentRole, currentTimestamp);
              recordsYielded++;
            }
            currentLines = [];
          }

          const rawRole = match[1].toLowerCase();
          currentRole = this.normalizeRole(rawRole);
          currentActor = this.formatActorName(rawRole);

          if (match[2] && match[2].trim().length > 0) {
            currentLines.push(match[2].trim());
          }
          break;
        }
      }

      if (!matchedTurn && line.trim().length > 0) {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      const content = currentLines.join('\n').trim();
      if (content.length > 0) {
        yield this.buildRecord(content, currentActor, currentRole, currentTimestamp);
        recordsYielded++;
      }
    }

    this.logger.log(`Completed AI Markdown parse: records=${recordsYielded}`);
  }

  /**
   * Resilient parsing for ChatGPT, Claude, Gemini, and generic AI JSON exports.
   */
  private async *parseJsonAiTranscript(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (context.signal?.aborted) {
        this.logger.warn(`AI JSON parser aborted for job ${context.jobId}`);
        return;
      }
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const fullText = Buffer.concat(chunks).toString('utf8');
    let data: any;

    try {
      data = JSON.parse(fullText);
    } catch (err: any) {
      this.logger.warn(`Failed to parse AI JSON file: ${err.message}. Emitting raw document.`);
      yield {
        timestamp: new Date(),
        actor: 'AI Ingestion Engine',
        content: fullText.slice(0, 5000),
        eventType: 'unstructured',
        metadata: { parseError: err.message },
      };
      return;
    }

    let recordsYielded = 0;

    // 1. ChatGPT export format: Array of conversations with `mapping` graph nodes
    if (Array.isArray(data) && data.length > 0 && data[0]?.mapping) {
      for (const convo of data) {
        const title = convo.title || 'Untitled Conversation';
        const convoId = convo.id || convo.conversation_id;
        const mapping = convo.mapping || {};

        // Extract messages from tree
        const nodes = Object.values(mapping) as any[];
        // Sort nodes by create_time if present
        const validMessages = nodes
          .filter((n) => n?.message && n.message?.content?.parts?.length > 0)
          .sort((a, b) => {
            const timeA = a.message.create_time || 0;
            const timeB = b.message.create_time || 0;
            return timeA - timeB;
          });

        for (const node of validMessages) {
          const msg = node.message;
          const role = this.normalizeRole(msg.author?.role);
          const actor = this.formatActorName(msg.author?.role || role);
          const rawParts = msg.content?.parts || [];
          const textContent = rawParts
            .map((p: any) => (typeof p === 'string' ? p : JSON.stringify(p)))
            .join('\n')
            .trim();

          if (!textContent) continue;

          const timestamp = msg.create_time
            ? new Date(msg.create_time * 1000)
            : new Date();

          yield {
            timestamp,
            actor,
            content: textContent,
            eventType: `ai_${role}`,
            metadata: {
              conversationId: convoId,
              conversationTitle: title,
              model: msg.metadata?.model_slug,
              role,
            },
            urls: extractUrls(textContent),
            emojis: extractEmojis(textContent),
            hasMedia: textContent.includes('data:image') || textContent.includes('[image]'),
          };
          recordsYielded++;
        }
      }
      this.logger.log(`Completed ChatGPT conversation export parse: records=${recordsYielded}`);
      return;
    }

    // 2. Claude AI export format: Array of conversations with `chat_messages`
    if (Array.isArray(data) && data.length > 0 && data[0]?.chat_messages) {
      for (const convo of data) {
        const title = convo.name || 'Claude Conversation';
        const convoId = convo.uuid;

        for (const msg of convo.chat_messages) {
          const role = this.normalizeRole(msg.sender);
          const actor = this.formatActorName(msg.sender || role);
          const content = (msg.text || '').trim();
          if (!content) continue;

          const timestamp = msg.created_at ? new Date(msg.created_at) : new Date();

          yield {
            timestamp,
            actor,
            content,
            eventType: `ai_${role}`,
            metadata: {
              conversationId: convoId,
              conversationTitle: title,
              role,
              attachments: msg.attachments,
            },
            urls: extractUrls(content),
            emojis: extractEmojis(content),
            hasMedia: Boolean(msg.attachments && msg.attachments.length > 0),
          };
          recordsYielded++;
        }
      }
      this.logger.log(`Completed Claude conversation export parse: records=${recordsYielded}`);
      return;
    }

    // 3. Gemini / Google Takeout turns array
    if (Array.isArray(data) && data.length > 0 && (data[0]?.turns || data[0]?.messages)) {
      for (const convo of data) {
        const title = convo.title || 'Gemini Conversation';
        const turns = convo.turns || convo.messages || [];

        for (const turn of turns) {
          const role = this.normalizeRole(turn.role || turn.author);
          const actor = this.formatActorName(turn.role || turn.author || role);
          let content = '';

          if (typeof turn.content === 'string') {
            content = turn.content;
          } else if (Array.isArray(turn.parts)) {
            content = turn.parts
              .map((p: any) => p.text || (typeof p === 'string' ? p : ''))
              .join('\n');
          } else if (turn.text) {
            content = turn.text;
          }

          content = content.trim();
          if (!content) continue;

          const timestamp = turn.timestamp || turn.created_at
            ? parseFlexibleDate(turn.timestamp || turn.created_at)
            : new Date();

          yield {
            timestamp,
            actor,
            content,
            eventType: `ai_${role}`,
            metadata: {
              conversationTitle: title,
              role,
            },
            urls: extractUrls(content),
            emojis: extractEmojis(content),
            hasMedia: content.includes('data:image'),
          };
          recordsYielded++;
        }
      }
      this.logger.log(`Completed Gemini export parse: records=${recordsYielded}`);
      return;
    }

    // 4. Generic JSON list of message objects with role/sender
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      const rawRole = item.role || item.sender || item.author || 'assistant';
      const role = this.normalizeRole(rawRole);
      const actor = this.formatActorName(rawRole);
      const content = (item.content || item.text || item.message || JSON.stringify(item)).trim();

      const timestamp = item.timestamp || item.created_at || item.time
        ? parseFlexibleDate(item.timestamp || item.created_at || item.time)
        : new Date();

      yield {
        timestamp,
        actor,
        content,
        eventType: `ai_${role}`,
        metadata: { role, rawItem: item },
        urls: extractUrls(content),
        emojis: extractEmojis(content),
        hasMedia: Boolean(item.hasMedia || item.attachments),
      };
      recordsYielded++;
    }

    this.logger.log(`Completed generic AI JSON parse: records=${recordsYielded}`);
  }

  private normalizeRole(raw?: string): UniversalRole {
    if (!raw) return 'assistant';
    const lower = raw.toLowerCase();
    if (lower.includes('user') || lower.includes('human') || lower === 'me' || lower === 'prompt') {
      return 'human';
    }
    if (
      lower.includes('assistant') ||
      lower.includes('model') ||
      lower.includes('claude') ||
      lower.includes('gpt') ||
      lower.includes('gemini') ||
      lower.includes('bot')
    ) {
      return 'assistant';
    }
    if (lower.includes('system')) {
      return 'system';
    }
    if (lower.includes('tool') || lower.includes('function')) {
      return 'tool';
    }
    return 'custom';
  }

  private formatActorName(raw?: string): string {
    if (!raw) return 'AI Assistant';
    const role = this.normalizeRole(raw);
    const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
    switch (role) {
      case 'human':
        return 'User (Human)';
      case 'assistant':
        return raw.length > 2 && raw.toLowerCase() !== 'assistant' ? capitalized : 'AI Assistant';
      case 'system':
        return 'System Instructions';
      case 'tool':
        return 'Tool Execution';
      default:
        return capitalized;
    }
  }

  private buildRecord(
    content: string,
    actor: string,
    role: UniversalRole,
    timestamp: Date,
  ): ParsedRecord {
    return {
      timestamp,
      actor,
      content,
      eventType: `ai_${role}`,
      metadata: { role },
      urls: extractUrls(content),
      emojis: extractEmojis(content),
      hasMedia: content.includes('data:image') || content.includes('[IMAGE]'),
    };
  }
}
