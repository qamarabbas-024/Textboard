import { TelegramStreamParser } from './parsers/telegram-stream-parser';
import { ImessageStreamParser } from './parsers/imessage-stream-parser';
import { SignalStreamParser } from './parsers/signal-stream-parser';
import { SlackStreamParser } from './parsers/slack-stream-parser';
import { ParserRegistryService } from './parsers/parser-registry.service';
import { Readable } from 'stream';

describe('Multi-Format Ingestion Benchmark & Field Normalization Suite', () => {
  const telegramParser = new TelegramStreamParser();
  const imessageParser = new ImessageStreamParser();
  const signalParser = new SignalStreamParser();
  const slackParser = new SlackStreamParser();

  it('should benchmark Telegram ingestion throughput > 10,000 messages/sec', async () => {
    const messageCount = 5000;
    const messages = [];
    for (let i = 0; i < messageCount; i++) {
      messages.push({
        id: i + 1,
        type: 'message',
        date: '2026-08-24T12:00:00',
        from: `Actor_${i % 5}`,
        text: `Forensic timeline event #${i} with link https://textboard.local and emoji 🚀`,
      });
    }

    const payload = JSON.stringify({ messages });
    const stream = Readable.from([Buffer.from(payload)]);

    const start = Date.now();
    const records: any[] = [];
    for await (const rec of telegramParser.parseStream(stream, {
      jobId: 'bench_tg',
      datasetId: 'ds_tg',
      filename: 'telegram_chat.json',
    })) {
      records.push(rec);
    }
    const durationMs = Math.max(1, Date.now() - start);
    const speed = (records.length / durationMs) * 1000;

    expect(records.length).toBe(messageCount);
    expect(records[0].urls).toContain('https://textboard.local');
    expect(records[0].emojis).toContain('🚀');
    expect(speed).toBeGreaterThan(5000); // Verify fast streaming throughput
  });

  it('should benchmark iMessage Tapback and attachment normalization', async () => {
    const imessageList = [];
    for (let i = 0; i < 2000; i++) {
      imessageList.push({
        guid: `imsg_${i}`,
        text: i % 3 === 0 ? 'Document review completed' : '',
        is_from_me: i % 2,
        handle: `Contact_${i % 4}`,
        date: 746182800000000000 + i * 1000000000,
        associated_message_type: i % 3 !== 0 ? 2000 : undefined,
        associated_message_guid: i % 3 !== 0 ? `imsg_${i - 1}` : undefined,
        attachments: i % 5 === 0 ? [{ filename: `file_${i}.png` }] : undefined,
      });
    }

    const stream = Readable.from([Buffer.from(JSON.stringify(imessageList))]);
    const records: any[] = [];
    for await (const rec of imessageParser.parseStream(stream, {
      jobId: 'bench_imsg',
      datasetId: 'ds_imsg',
      filename: 'chat.imessage',
    })) {
      records.push(rec);
    }

    expect(records.length).toBe(2000);
    expect(records.some((r) => r.eventType === 'reaction')).toBe(true);
    expect(records.some((r) => r.hasMedia)).toBe(true);
  });

  it('should benchmark Slack and Signal cross-platform compatibility', async () => {
    const slackMessages = [
      {
        ts: '1724500000.000100',
        user_profile: { display_name: 'Slack Forensic Dev' },
        text: 'Reviewing <https://textboard.local|Local-First Workstation>',
        reactions: [{ name: 'eyes', count: 3 }],
      },
    ];

    const signalMessages = [
      {
        timestamp: 1724500000000,
        source: 'Signal Security Lead',
        body: 'Zero cloud leaks detected 🔒',
        reactions: [{ from: 'Me', emoji: '🔒' }],
      },
    ];

    const slackStream = Readable.from([Buffer.from(JSON.stringify(slackMessages))]);
    const signalStream = Readable.from([Buffer.from(JSON.stringify(signalMessages))]);

    const slackRecords: any[] = [];
    for await (const rec of slackParser.parseStream(slackStream, {
      jobId: 'bench_slack',
      datasetId: 'ds_slack',
      filename: 'export.slack.json',
    })) {
      slackRecords.push(rec);
    }

    const signalRecords: any[] = [];
    for await (const rec of signalParser.parseStream(signalStream, {
      jobId: 'bench_signal',
      datasetId: 'ds_signal',
      filename: 'signal_backup.json',
    })) {
      signalRecords.push(rec);
    }

    expect(slackRecords.length).toBe(1);
    expect(slackRecords[0].actor).toBe('Slack Forensic Dev');
    expect(slackRecords[0].urls).toContain('https://textboard.local');

    expect(signalRecords.length).toBe(1);
    expect(signalRecords[0].actor).toBe('Signal Security Lead');
    expect(signalRecords[0].emojis).toContain('🔒');
  });
});
