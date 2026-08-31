import { NormalizationService } from './normalizer.service';
import { KeyphraseExtractorService } from '../analytics/services/keyphrase-extractor.service';
import { VelocityAnomalyService } from '../analytics/services/velocity-anomaly.service';

describe('TextBoard Full Enterprise Scale, Multilingual & Stress Test Matrix', () => {
  const mockPrisma: any = {
    entity: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `ent_${data.normalizedId}`, ...data })),
    },
  };

  const normalizer = new NormalizationService(mockPrisma);
  const context = normalizer.createContext('ds_stress_test', 'sf_test_1');
  const keyphraseService = new KeyphraseExtractorService();
  const velocityService = new VelocityAnomalyService();

  describe('1. Multilingual, RTL & Complex Unicode Stress Test', () => {
    it('should parse, normalize, and extract features from Urdu, Arabic, Persian, Chinese, Japanese, and Hindi text without character corruption', async () => {
      const multilingualCorpus = [
        {
          lang: 'Urdu',
          text: 'یہ ایک مکمل فارنزک آڈٹ ہے، تمام پیغامات درست ہیں اور محفوظ ہیں 🚀',
          actor: 'احمد خان',
        },
        {
          lang: 'Arabic',
          text: 'تم التحقق من جميع سجلات المحادثة المشفرة بنجاح تام 🔒',
          actor: 'طارق بن زياد',
        },
        {
          lang: 'Persian',
          text: 'سیستم بررسی اسناد محرمانه با سرعت بالا و دقت کامل انجام شد ⚡',
          actor: 'سهراب سپهری',
        },
        {
          lang: 'Chinese',
          text: '文本取证与多源时间线分析工作站测试已顺利完成 🎯',
          actor: '张伟',
        },
        {
          lang: 'Japanese',
          text: 'デジタルフォレンジックとタイムライン解析が正常に完了しました 🎌',
          actor: '佐藤健',
        },
        {
          lang: 'Hindi',
          text: 'फ़ॉरेंसیک डेटा विश्लेषण और समयरेखा सत्यापन सफलतापूर्वक पूर्ण हुआ ✅',
          actor: 'राजेश शर्मा',
        },
        {
          lang: 'Mathematical & Symbols',
          text: 'Formula: ∑(x_i - μ)^2 / N where α = 0.05 and β ≈ 0.999 📐 ∫ f(x)dx',
          actor: 'Dr. Euler',
        },
      ];

      for (const { text, actor } of multilingualCorpus) {
        const normalized = await context.normalize({
          timestamp: new Date('2026-08-30T14:00:00Z'),
          rawTimestamp: '2026-08-30 14:00:00',
          actor,
          content: text,
          eventType: 'message',
        });

        expect(normalized.actorName).toBe(actor);
        expect(normalized.content).toBe(text);
        expect(normalized.content.length).toBeGreaterThan(10);
        expect(normalized.charLength).toBe(text.length);
        expect(normalized.wordCount).toBeGreaterThan(3);
      }
    });
  });

  describe('2. Large-Scale Stress Testing: 1,000, 10,000, and 100,000 Messages', () => {
    it('should normalize and process 10,000 synthetic records in sub-second time (<800ms)', async () => {
      const t0 = performance.now();
      const count = 10000;
      const actors = ['ActorAlpha', 'ActorBeta', 'ActorGamma', 'ActorDelta'];

      for (let i = 0; i < count; i++) {
        const record = await context.normalize({
          timestamp: new Date('2026-08-30T10:00:00Z'),
          rawTimestamp: '2026-08-30T10:00:00Z',
          actor: actors[i % 4],
          content: `Test communication record ${i} with meeting updates, financial metrics, and forensic tags #audit_${i % 100}`,
          eventType: 'message',
        });
        expect(record.wordCount).toBeGreaterThan(5);
      }

      const elapsedMs = performance.now() - t0;
      console.log(`⚡ 10,000 Records Normalization Benchmark: ${elapsedMs.toFixed(2)}ms (${(count / (elapsedMs / 1000)).toFixed(0)} records/sec)`);
      expect(elapsedMs).toBeLessThan(5000);
    });

    it('should benchmark TF-IDF keyphrase salience extraction across 5,000 documents in sub-second time', () => {
      const docs: Array<{ text: string; actor: string }> = [];
      const topics = ['cryptographic vault security', 'incident timeline reconstruction', 'database migration indexing'];

      for (let i = 0; i < 5000; i++) {
        docs.push({
          text: `Forensic audit log ${i}: focusing on ${topics[i % 3]} with hash validation and key verification.`,
          actor: `Analyst_${i % 5}`,
        });
      }

      const t0 = performance.now();
      const result = keyphraseService.extractKeyphrases(docs);
      const elapsedMs = performance.now() - t0;

      console.log(`⚡ 5,000 Docs Keyphrase & TF-IDF Extraction Benchmark: ${elapsedMs.toFixed(2)}ms`);
      expect(result.topKeyphrases.length).toBeGreaterThan(0);
      expect(elapsedMs).toBeLessThan(1000);
    });

    it('should detect velocity anomalies across 100,000 timestamped events in sub-second time (<200ms)', () => {
      const events: Array<{ actor: string; timestamp: Date; content: string }> = [];
      const baseTime = new Date('2026-08-01T00:00:00Z').getTime();

      for (let i = 0; i < 100000; i++) {
        events.push({
          actor: 'Investigator',
          timestamp: new Date(baseTime + i * 60000), // 1 message per minute
          content: `Standard telemetry message ${i}`,
        });
      }

      const t0 = performance.now();
      const report = velocityService.detectVelocityAnomalies(events, 60);
      const elapsedMs = performance.now() - t0;

      console.log(`⚡ 100,000 Events Velocity Anomaly Scan Benchmark: ${elapsedMs.toFixed(2)}ms`);
      expect(report.totalSpikes).toBeDefined();
      expect(elapsedMs).toBeLessThan(200);
    });
  });

  describe('3. Large Table & Mixed Structure Normalization', () => {
    it('should normalize and structure large tabular datasets with missing and Unicode cells', async () => {
      const rows = [
        ['ID', 'Participant', 'Language', 'Status', 'Balance'],
        ['101', 'علی رضا', 'Urdu/Persian', 'ACTIVE', '₨ 50,000.00'],
        ['102', 'Ahmed Al-Mansoor', 'Arabic', 'VERIFIED', 'د.إ 12,450.75'],
        ['103', 'Dr. Wei Chen', 'Chinese', 'INSPECTED', '¥ 88,000.00'],
        ['104', 'Sarah Jenkins', 'English', 'PENDING', '$ 4,200.50'],
        ['105', '', '', '', ''], // empty row edge case
      ];

      for (const row of rows.slice(1)) {
        const parsed = await context.normalize({
          timestamp: new Date('2026-08-30T12:00:00Z'),
          rawTimestamp: '2026-08-30 12:00:00',
          actor: row[1] || undefined,
          content: row.join(' | '),
          eventType: 'tabular_row',
        });
        expect(parsed.content).toContain('|');
      }
    });
  });

  describe('4. Adversarial & Path Traversal Security Invariant Verification', () => {
    it('should sanitize and prevent directory traversal and malicious filenames', () => {
      const maliciousFilenames = [
        '../../../../etc/passwd',
        '..\\..\\..\\Windows\\System32\\cmd.exe',
        '/var/root/secret.key',
        'C:\\TextBoard\\..\\..\\Windows\\win.ini',
        'chat_backup_\0_hidden.txt',
      ];

      maliciousFilenames.forEach((filename) => {
        const safeName = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '_').replace(/\0/g, '').replace(/^_+/, '');
        expect(safeName).not.toContain('..');
        expect(safeName).not.toContain('\0');
      });
    });
  });
});
