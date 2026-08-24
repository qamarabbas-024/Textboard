import { GitLogStreamParser } from './git-log-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('GitLogStreamParser', () => {
  const parser = new GitLogStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_git_test',
    datasetId: 'ds_git_test',
    filename: 'repo_git_log.txt',
  };

  it('should identify git log files', () => {
    expect(parser.canHandle('text/plain', 'repo_git_log.txt')).toBe(true);
    expect(parser.canHandle('text/plain', 'commits.txt')).toBe(true);
    expect(parser.canHandle('text/plain', 'notes.txt')).toBe(false);
  });

  it('should parse multi-commit git logs with hashes, authors, and commit messages', async () => {
    const rawGitLog =
      'commit 4a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b\n' +
      'Author: Linus Torvalds <torvalds@kernel.org>\n' +
      'Date:   Mon Aug 24 10:00:00 2026 +0000\n' +
      '\n' +
      '    feat: implement bounded memory streaming sink 🚀\n' +
      '    \n' +
      '    Detailed architecture commit note\n' +
      '\n' +
      'commit 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b\n' +
      'Author: Ada Lovelace <ada@analytics.org>\n' +
      'Date:   Mon Aug 24 11:00:00 2026 +0000\n' +
      '\n' +
      '    fix: resolve Unicode glyph fallback chain\n';

    const stream = Readable.from([rawGitLog]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);

    expect(records[0].actor).toBe('Linus Torvalds');
    expect(records[0].content).toContain('[Commit 4a8b1c2]');
    expect(records[0].content).toContain('implement bounded memory streaming sink');
    expect(records[0].emojis).toContain('🚀');
    expect(records[0].eventType).toBe('git_commit');

    expect(records[1].actor).toBe('Ada Lovelace');
    expect(records[1].content).toContain('[Commit 1a2b3c4]');
    expect(records[1].content).toContain('resolve Unicode glyph fallback chain');
    expect(records[1].eventType).toBe('git_commit');
  });
});
