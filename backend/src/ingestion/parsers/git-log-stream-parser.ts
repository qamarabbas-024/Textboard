import { Injectable, Logger } from '@nestjs/common';
import * as readline from 'readline';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { extractUrls, extractEmojis, parseFlexibleDate } from './parser-utils';

@Injectable()
export class GitLogStreamParser implements IStreamParser {
  private readonly logger = new Logger(GitLogStreamParser.name);
  readonly formatId = 'git-log';
  readonly name = 'Git Commit History Log Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.includes('git_log') ||
      lower.includes('git-log') ||
      lower.includes('commits.txt') ||
      lower.endsWith('.gitlog')
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

    let recordsYielded = 0;
    let currentCommit: {
      hash?: string;
      author?: string;
      email?: string;
      date?: Date;
      messageLines: string[];
    } | null = null;

    const baseDate = new Date();

    for await (const line of rl) {
      if (context.signal?.aborted) {
        this.logger.warn(`Git log parser aborted for job ${context.jobId}`);
        rl.close();
        break;
      }

      const trimmed = line.trim();

      // Commit header line: commit 4a8b...
      if (/^commit\s+([0-9a-f]{7,40})/i.test(trimmed)) {
        if (currentCommit && currentCommit.hash) {
          const commitMsg = currentCommit.messageLines.join('\n').trim() || `Commit ${currentCommit.hash.slice(0, 7)}`;
          yield {
            timestamp: currentCommit.date || baseDate,
            actor: currentCommit.author || 'Git Author',
            content: `[Commit ${currentCommit.hash.slice(0, 7)}] ${commitMsg}`,
            eventType: 'git_commit',
            metadata: {
              commitHash: currentCommit.hash,
              authorEmail: currentCommit.email,
              filename: context.filename,
            },
            urls: extractUrls(commitMsg),
            emojis: extractEmojis(commitMsg),
            hasMedia: false,
          };
          recordsYielded++;
        }

        const match = trimmed.match(/^commit\s+([0-9a-f]{7,40})/i);
        currentCommit = {
          hash: match ? match[1] : undefined,
          messageLines: [],
        };
        continue;
      }

      if (currentCommit) {
        // Author: Name <email>
        if (/^Author:\s*(.*)/i.test(trimmed)) {
          const authorMatch = trimmed.match(/^Author:\s*([^<]+)(?:<([^>]+)>)?/i);
          if (authorMatch) {
            currentCommit.author = authorMatch[1].trim();
            currentCommit.email = authorMatch[2]?.trim();
          }
          continue;
        }

        // Date:   Mon Aug 24 10:00:00 2026 +0000 / ISO
        if (/^Date:\s*(.*)/i.test(trimmed)) {
          const dateMatch = trimmed.match(/^Date:\s*(.*)/i);
          if (dateMatch) {
            currentCommit.date = parseFlexibleDate(dateMatch[1]) || baseDate;
          }
          continue;
        }

        // Commit message lines (indented)
        if (line.startsWith('    ') || line.startsWith('\t')) {
          currentCommit.messageLines.push(trimmed);
        }
      }

      if (recordsYielded % 1000 === 0 && context.onProgress) {
        context.onProgress(0, recordsYielded);
      }
    }

    if (currentCommit && currentCommit.hash) {
      const commitMsg = currentCommit.messageLines.join('\n').trim() || `Commit ${currentCommit.hash.slice(0, 7)}`;
      yield {
        timestamp: currentCommit.date || baseDate,
        actor: currentCommit.author || 'Git Author',
        content: `[Commit ${currentCommit.hash.slice(0, 7)}] ${commitMsg}`,
        eventType: 'git_commit',
        metadata: {
          commitHash: currentCommit.hash,
          authorEmail: currentCommit.email,
          filename: context.filename,
        },
        urls: extractUrls(commitMsg),
        emojis: extractEmojis(commitMsg),
        hasMedia: false,
      };
      recordsYielded++;
    }

    this.logger.log(`Completed Git log stream parse: commits=${recordsYielded}`);
  }
}
