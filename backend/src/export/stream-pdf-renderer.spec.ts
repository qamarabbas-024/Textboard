import { DataIntegrityVerifier } from './data-integrity-verifier';
import { FontResolverService } from './font-resolver.service';
import { EmojiRendererService } from './emoji-renderer.service';
import { StreamPdfRendererService } from './stream-pdf-renderer.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Chat PDF Export & Integrity Verification Suite', () => {
  let fontResolver: FontResolverService;
  let emojiRenderer: EmojiRendererService;
  let chatRenderer: StreamPdfRendererService;
  const testOutputDir = path.resolve(process.cwd(), '.textboard', 'test_output');

  beforeAll(() => {
    fs.mkdirSync(testOutputDir, { recursive: true });
    fontResolver = new FontResolverService();
    emojiRenderer = new EmojiRendererService();
    chatRenderer = new StreamPdfRendererService(fontResolver, emojiRenderer);
  });

  afterAll(() => {
    if (fs.existsSync(testOutputDir)) {
      try {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      } catch {}
    }
  });

  describe('DataIntegrityVerifier', () => {
    it('should verify lossless message export when counts, ordering, and IDs match', () => {
      const verifier = new DataIntegrityVerifier('ds_1', 'exp_1');
      verifier.setExpectedSource(3, 'msg_1', 'msg_3');

      verifier.onMessageRendered({
        id: 'msg_1',
        timestamp: '2025-01-01T10:00:00Z',
        content: 'Hello World',
        actor: 'Ali',
      });
      verifier.onMessageRendered({
        id: 'msg_2',
        timestamp: '2025-01-01T10:01:00Z',
        content: 'How are you?',
        actor: 'Fatima',
      });
      verifier.onMessageRendered({
        id: 'msg_3',
        timestamp: '2025-01-01T10:02:00Z',
        content: 'All good!',
        actor: 'Ali',
      });

      const { isValid, manifest } = verifier.finalize();

      expect(isValid).toBe(true);
      expect(manifest.status).toBe('VERIFIED');
      expect(manifest.sourceMessageCount).toBe(3);
      expect(manifest.renderedMessageCount).toBe(3);
      expect(manifest.missingCount).toBe(0);
      expect(manifest.duplicateCount).toBe(0);
      expect(manifest.failedCount).toBe(0);
      expect(manifest.firstMessageId).toBe('msg_1');
      expect(manifest.lastMessageId).toBe('msg_3');
      expect(manifest.contentChecksum).toBeTruthy();
    });

    it('should fail verification if messages are missing', () => {
      const verifier = new DataIntegrityVerifier('ds_1', 'exp_2');
      verifier.setExpectedSource(5, 'msg_1', 'msg_5');

      verifier.onMessageRendered({
        id: 'msg_1',
        timestamp: '2025-01-01T10:00:00Z',
        content: 'Only one message',
      });

      const { isValid, manifest } = verifier.finalize();

      expect(isValid).toBe(false);
      expect(manifest.status).toBe('FAILED');
      expect(manifest.missingCount).toBe(4);
      expect(manifest.diagnostics?.length).toBeGreaterThan(0);
    });

    it('should fail verification if duplicate IDs are encountered', () => {
      const verifier = new DataIntegrityVerifier('ds_1', 'exp_3');
      verifier.setExpectedSource(2, 'msg_1', 'msg_1');

      verifier.onMessageRendered({
        id: 'msg_1',
        timestamp: '2025-01-01T10:00:00Z',
        content: 'First pass',
      });
      verifier.onMessageRendered({
        id: 'msg_1',
        timestamp: '2025-01-01T10:01:00Z',
        content: 'Duplicate ID pass',
      });

      const { isValid, manifest } = verifier.finalize();

      expect(isValid).toBe(false);
      expect(manifest.status).toBe('FAILED');
      expect(manifest.duplicateCount).toBe(1);
    });
  });

  describe('FontResolverService & Text Sanitization', () => {
    it('should sanitize unprintable control codes while keeping newlines and tabs', () => {
      const raw = 'Line 1\x00\x07\r\nLine 2\twith tabs\x1F';
      const clean = fontResolver.sanitizeText(raw);
      expect(clean).toBe('Line 1\nLine 2\twith tabs');
    });

    it('should normalize Unicode correctly', () => {
      const urduArabic = 'مرحبا بكم في المحادثة! 🌟';
      const clean = fontResolver.sanitizeText(urduArabic);
      expect(clean).toContain('مرحبا');
    });
  });

  describe('StreamPdfRendererService', () => {
    it('should render a multi-message PDF archive with date separators, groupings, and emojis', async () => {
      const testPdfPath = path.join(testOutputDir, 'test_chat_export.pdf');
      const verifier = new DataIntegrityVerifier('ds_test', 'exp_test');
      verifier.setExpectedSource(4, 'ev_1', 'ev_4');

      const { doc, writeStream, fonts } = chatRenderer.createPdfDocument(testPdfPath, {
        pageSize: 'A4',
      });

      chatRenderer.renderDocumentHeader(
        doc,
        { name: 'Unit Test Chat Dataset' },
        {},
        fonts,
        4,
      );

      const events = [
        {
          id: 'ev_1',
          timestamp: new Date('2025-08-14T10:42:00Z'),
          actor: 'Ali',
          content: 'Hey, are you coming tomorrow? 🚀',
          eventType: 'message',
        },
        {
          id: 'ev_2',
          timestamp: new Date('2025-08-14T10:43:00Z'),
          actor: 'Fatima',
          content: 'Yeah 😂 Looking forward to it!',
          eventType: 'message',
        },
        {
          id: 'ev_3',
          timestamp: new Date('2025-08-14T10:44:00Z'),
          actor: 'Fatima',
          content: 'Here is the document: <Media omitted>',
          eventType: 'message',
          hasMedia: true,
        },
        {
          id: 'ev_4',
          timestamp: new Date('2025-08-15T08:12:00Z'),
          actor: 'Ali',
          content: 'مرحبا! Multilingual Urdu/Arabic proposal text\nWith multiple lines.',
          eventType: 'message',
        },
      ];

      let lastDateStr = '';
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const dateStr = ev.timestamp.toISOString().slice(0, 10);
        if (dateStr !== lastDateStr) {
          chatRenderer.renderDateSeparator(doc, ev.timestamp, fonts);
          lastDateStr = dateStr;
        }

        const isSameActorAsPrev = i > 0 && events[i - 1].actor === ev.actor;
        chatRenderer.renderTimelineEvent(
          doc,
          ev,
          {},
          fonts,
          !isSameActorAsPrev,
          verifier,
          'Ali',
        );
      }

      doc.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      const { isValid, manifest } = verifier.finalize();

      expect(isValid).toBe(true);
      expect(manifest.status).toBe('VERIFIED');
      expect(manifest.renderedMessageCount).toBe(4);
      expect(fs.existsSync(testPdfPath)).toBe(true);
      expect(fs.statSync(testPdfPath).size).toBeGreaterThan(1000);
    });
  });
});
