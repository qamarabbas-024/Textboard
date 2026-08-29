import { SlackStreamParser } from './slack-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('SlackStreamParser', () => {
  const parser = new SlackStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_slack_test',
    datasetId: 'ds_slack_test',
    filename: 'general_slack.json',
  };

  it('should identify Slack export JSON files', () => {
    expect(parser.canHandle('application/json', 'general.slack.json')).toBe(true);
    expect(parser.canHandle('application/json', 'slack_export_2026.json')).toBe(true);
    expect(parser.canHandle('application/json', 'notes.json')).toBe(false);
  });

  it('should parse Slack channel message arrays with threads and file attachments', async () => {
    const slackJson = JSON.stringify([
      {
        ts: '1724500000.000100',
        user: 'U12345',
        user_profile: { display_name: 'Lead Forensics Dev' },
        text: 'Review the sprint deliverable at <https://github.com/qamarabbas-024/Textboard|TextBoard Repo>',
        files: [{ name: 'architecture_diagram.png', mimetype: 'image/png' }],
        reactions: [{ name: 'rocket', count: 4 }],
      },
      {
        ts: '1724500060.000200',
        thread_ts: '1724500000.000100',
        user: 'U67890',
        user_profile: { display_name: 'QA Analyst' },
        text: 'Everything tests 100% clean in isolated sandbox!',
      },
    ]);

    const stream = Readable.from([Buffer.from(slackJson)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('Lead Forensics Dev');
    expect(records[0].content).toContain('TextBoard Repo (https://github.com/qamarabbas-024/Textboard)');
    expect(records[0].content).toContain('[Files: architecture_diagram.png]');
    expect(records[0].content).toContain('[Reactions: :rocket: (4)]');
    expect(records[0].hasMedia).toBe(true);

    expect(records[1].actor).toBe('QA Analyst');
    expect(records[1].metadata.isThreadReply).toBe(true);
    expect(records[1].metadata.threadTs).toBe('1724500000.000100');
  });
});
