import { Readable } from 'stream';
import { ChatStreamParser } from './parsers/chat-stream-parser';
import { TelegramStreamParser } from './parsers/telegram-stream-parser';
import { CsvStreamParser } from './parsers/csv-stream-parser';
import { NormalizationService } from './normalizer.service';
import { VelocityAnomalyService } from '../analytics/services/velocity-anomaly.service';
import { EmotionRadarService } from '../analytics/services/emotion-radar.service';
import { KeyphraseExtractorService } from '../analytics/services/keyphrase-extractor.service';
import { HtmlDossierService } from '../export/html-dossier.service';

describe('Real Raw Example Data End-to-End Forensic Pipeline Test', () => {
  const chatParser = new ChatStreamParser();
  const telegramParser = new TelegramStreamParser();
  const csvParser = new CsvStreamParser();

  const mockPrisma: any = {
    entity: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `ent_${data.normalizedId}`, ...data })),
    },
  };

  const normalizer = new NormalizationService(mockPrisma);
  const velocityService = new VelocityAnomalyService();
  const emotionService = new EmotionRadarService();
  const keyphraseService = new KeyphraseExtractorService();
  const htmlDossierService = new HtmlDossierService();

  it('1. should ingest and parse raw real-world WhatsApp chat log export with multiline messages & emojis', async () => {
    const rawWhatsAppLog = `
[12/05/2026, 09:15:32] Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
[12/05/2026, 09:16:04] Col. Marcus Vance: Team, rendezvous at coordinates 33.6844, 73.0479 at 22:00 sharp. 📍
Confirm receipt immediately.
[12/05/2026, 09:16:45] Sarah Connor: Copy that Colonel. Vault keys are secured in the safehouse. 🔑
Backup drive is encrypted with AES-256.
[12/05/2026, 09:17:10] Tariq Mansoor: Understood. I will monitor the peripheral network traffic from Istanbul. 🌐
No anomalies detected so far.
[12/05/2026, 09:18:00] Col. Marcus Vance: Excellent. Maintain strict radio silence until extraction. 🛑
`.trim();

    const stream = Readable.from(rawWhatsAppLog);
    const parsedRecords: any[] = [];

    for await (const record of chatParser.parseStream(stream, {
      jobId: 'job_raw_whatsapp',
      datasetId: 'ds_raw_whatsapp',
      filename: '_chat.txt',
    })) {
      parsedRecords.push(record);
    }

    // Verify parser output
    expect(parsedRecords.length).toBe(5); // 1 system notice + 4 chat messages
    expect(parsedRecords[0].eventType).toBe('system');
    expect(parsedRecords[1].actor).toBe('Col. Marcus Vance');
    expect(parsedRecords[1].content).toContain('rendezvous at coordinates');
    expect(parsedRecords[2].actor).toBe('Sarah Connor');
    expect(parsedRecords[2].content).toContain('AES-256');

    // Run normalization
    const context = normalizer.createContext('ds_raw_whatsapp', 'sf_raw_1');
    const normalizedEvents: any[] = [];
    for (const record of parsedRecords) {
      const norm = await context.normalize(record);
      normalizedEvents.push(norm);
    }

    expect(normalizedEvents.length).toBe(5);
    expect(normalizedEvents[1].hasEmojis).toBe(true);
    expect(normalizedEvents[1].charLength).toBeGreaterThan(50);

    // Run Analytics on normalized raw data
    const keyphrases = keyphraseService.extractKeyphrases(
      normalizedEvents.map((e) => ({ text: e.content, actor: e.actorName || 'System' })),
    );
    expect(keyphrases.topKeyphrases.length).toBeGreaterThan(0);

    const emotionReport = emotionService.aggregateDatasetEmotions(
      normalizedEvents.map((e) => ({
        content: e.content,
        actor: e.actorName || 'System',
        timestamp: e.timestamp || new Date(),
      })),
    );
    expect(emotionReport.overallProfile.scores).toBeDefined();
    expect(emotionReport.actorBreakdown.length).toBeGreaterThan(0);
  });

  it('2. should ingest and parse raw real-world Telegram JSON export with reply threads', async () => {
    const rawTelegramJson = JSON.stringify({
      name: 'Cyber Task Force Alpha',
      type: 'private_group',
      id: 987654321,
      messages: [
        {
          id: 101,
          type: 'message',
          date: '2026-08-15T14:30:00',
          date_unixtime: '1786797000',
          from: 'Viktor Reznov',
          from_id: 'user1001',
          text: 'Initiating deep packet inspection on target server. 💻',
        },
        {
          id: 102,
          type: 'message',
          date: '2026-08-15T14:31:20',
          date_unixtime: '1786797080',
          from: 'Elena Rostova',
          from_id: 'user1002',
          reply_to_message_id: 101,
          text: 'Found unexpected open port 8443 with self-signed certificate! 🚨',
        },
        {
          id: 103,
          type: 'message',
          date: '2026-08-15T14:32:00',
          date_unixtime: '1786797120',
          from: 'Viktor Reznov',
          from_id: 'user1001',
          text: 'Capture full pcap trace and store in the evidence locker immediately. 📦',
        },
      ],
    });

    const stream = Readable.from([rawTelegramJson]);
    const parsedRecords: any[] = [];

    for await (const record of telegramParser.parseStream(stream, {
      jobId: 'job_raw_tg',
      datasetId: 'ds_raw_tg',
      filename: 'result.json',
    })) {
      parsedRecords.push(record);
    }

    expect(parsedRecords.length).toBe(3);
    expect(parsedRecords[0].actor).toBe('Viktor Reznov');
    expect(parsedRecords[1].actor).toBe('Elena Rostova');
    expect(parsedRecords[1].content).toContain('port 8443');

    // Generate standalone HTML dossier from raw Telegram parse
    const dossierHtml = htmlDossierService.generateStandaloneHtml({
      datasetName: 'Cyber Task Force Alpha Telegram Forensic Export',
      sourceType: 'TELEGRAM',
      totalEvents: parsedRecords.length,
      startDate: '2026-08-15T14:30:00Z',
      endDate: '2026-08-15T14:32:00Z',
      actors: ['Viktor Reznov', 'Elena Rostova'],
      topTopics: ['packet inspection', 'evidence locker'],
      keyAnomalies: [
        {
          type: 'VELOCITY_SPIKE',
          severity: 'HIGH',
          description: '3 high-priority technical alerts in 2 minutes',
          timestamp: '2026-08-15T14:32:00Z',
        },
      ],
      messages: parsedRecords.map((r, i) => ({
        id: `tg_${i}`,
        timestamp: r.timestamp.toISOString(),
        actor: r.actor,
        content: r.content,
      })),
    });

    expect(dossierHtml).toContain('Cyber Task Force Alpha Telegram Forensic Export');
    expect(dossierHtml).toContain('Viktor Reznov');
    expect(dossierHtml).toContain('Elena Rostova');
    expect(dossierHtml).toContain('SHA-256:');
  });

  it('3. should ingest and parse raw multilingual WhatsApp chat with Urdu, Arabic, Persian, and English', async () => {
    const rawMultilingualChat = `
[20/08/2026, 11:00:15] احمد خان: اسلام علیکم، کیا تمام دستاویزات تیار ہیں؟ 📑
[20/08/2026, 11:01:00] طارق بن زياد: وعليكم السلام، نعم تم التحقق من جميع المعاملات المالية بنجاح. 💰
[20/08/2026, 11:02:30] سهراب سپهری: ما گزارش نهایی را تا عصر آماده و ارسال خواهیم کرد. ⏱️
[20/08/2026, 11:03:00] John Miller: Confirmed. All international compliance checks have cleared. ✅
`.trim();

    const stream = Readable.from(rawMultilingualChat);
    const parsedRecords: any[] = [];

    for await (const record of chatParser.parseStream(stream, {
      jobId: 'job_raw_multi',
      datasetId: 'ds_raw_multi',
      filename: 'multilingual_chat.txt',
    })) {
      parsedRecords.push(record);
    }

    expect(parsedRecords.length).toBe(4);
    expect(parsedRecords[0].actor).toBe('احمد خان');
    expect(parsedRecords[0].content).toContain('اسلام علیکم');
    expect(parsedRecords[1].actor).toBe('طارق بن زياد');
    expect(parsedRecords[1].content).toContain('وعليكم السلام');
    expect(parsedRecords[2].actor).toBe('سهراب سپهری');
    expect(parsedRecords[3].actor).toBe('John Miller');

    // Verify word counts and character lengths
    const context = normalizer.createContext('ds_raw_multi');
    for (const record of parsedRecords) {
      const norm = await context.normalize(record);
      expect(norm.charLength).toBeGreaterThan(15);
      expect(norm.wordCount).toBeGreaterThan(3);
    }
  });

  it('4. should ingest and parse raw forensic CSV audit logs with structured headers', async () => {
    const rawCsv = `Timestamp,Investigator,ActionType,TargetHost,Status,RiskScore
2026-08-30 08:00:00,Agent_007,AUTH_LOGIN,192.168.1.100,SUCCESS,0.1
2026-08-30 08:05:00,Agent_007,PRIV_ESCALATION,192.168.1.100,SUCCESS,0.85
2026-08-30 08:10:00,Agent_009,DATA_EXPORT,192.168.1.250,BLOCKED,0.95
`.trim();

    const stream = Readable.from(rawCsv);
    const parsedRecords: any[] = [];

    for await (const record of csvParser.parseStream(stream, {
      jobId: 'job_raw_csv',
      datasetId: 'ds_raw_csv',
      filename: 'audit_log.csv',
    })) {
      parsedRecords.push(record);
    }

    expect(parsedRecords.length).toBe(3);
    expect(parsedRecords[0].actor).toBe('Agent_007');
    expect(parsedRecords[0].content).toContain('AUTH_LOGIN');
    expect(parsedRecords[2].actor).toBe('Agent_009');
    expect(parsedRecords[2].content).toContain('BLOCKED');
  });
});
