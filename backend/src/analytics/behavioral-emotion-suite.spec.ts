import { EmotionRadarService } from './services/emotion-radar.service';
import { BehavioralProfilerService } from './services/behavioral-profiler.service';
import { CrossDatasetComparatorService } from './services/cross-dataset-comparator.service';
import { KeyphraseExtractorService } from './services/keyphrase-extractor.service';
import { VelocityAnomalyService } from './services/velocity-anomaly.service';

describe('Phase 9: Deep Local AI & Behavioral Intelligence Suite (Commits 81-90)', () => {
  const emotionService = new EmotionRadarService();
  const behavioralService = new BehavioralProfilerService();
  const comparatorService = new CrossDatasetComparatorService();
  const keyphraseService = new KeyphraseExtractorService();
  const velocityService = new VelocityAnomalyService();

  it('1. should evaluate multi-axis emotional valence and trajectory correctly', () => {
    const texts = [
      { text: 'Great progress team, very excited for tomorrow! 🎉', expectedDominant: 'joy' },
      { text: 'This is horrible and completely unacceptable mistake 😡', expectedDominant: 'anger' },
      { text: 'Alert: critical vulnerability and danger of security breach ⚠️', expectedDominant: 'fear' },
      { text: 'Feeling really sad and disappointed by the outcome 😢', expectedDominant: 'sadness' },
      { text: 'Whoa! That is unbelievable and shocking 🤯', expectedDominant: 'surprise' },
      { text: 'Preparing roadmap and upcoming schedule for next sprint 📅', expectedDominant: 'anticipation' },
    ];

    texts.forEach(({ text, expectedDominant }) => {
      const result = emotionService.analyzeTextEmotion(text);
      expect(result.dominantEmotion).toBe(expectedDominant);
    });
  });

  it('2. should profile chronotype, response latency, and burstiness accurately', () => {
    const events = [
      { actor: 'DevNight', timestamp: new Date('2026-08-24T01:30:00Z'), content: 'Night coding' },
      { actor: 'DevNight', timestamp: new Date('2026-08-24T02:00:00Z'), content: 'Night testing' },
      { actor: 'DevDay', timestamp: new Date('2026-08-24T13:00:00Z'), content: 'Day standup' },
      { actor: 'DevDay', timestamp: new Date('2026-08-24T14:00:00Z'), content: 'Day sync' },
    ];

    const report = behavioralService.profileActors(events);
    expect(report.actorProfiles.length).toBe(2);

    const night = report.actorProfiles.find((p) => p.actor === 'DevNight');
    const day = report.actorProfiles.find((p) => p.actor === 'DevDay');

    expect(night?.nocturnalIndex).toBe(100);
    expect(day?.nocturnalIndex).toBe(0);
  });

  it('3. should extract N-gram keyphrases and compute TF-IDF salience', () => {
    const documents = [
      { text: 'Zero-knowledge cryptography and decentralized security vaults', actor: 'Alice' },
      { text: 'Local forensic analysis of zero-knowledge cryptography archives', actor: 'Bob' },
      { text: 'Decentralized security vaults with cryptographic verification', actor: 'Alice' },
    ];

    const result = keyphraseService.extractKeyphrases(documents);
    expect(result.topKeyphrases.length).toBeGreaterThan(0);
    expect(result.vocabularySize).toBeGreaterThan(0);

    const phrases = result.topKeyphrases.map((k) => k.phrase);
    expect(phrases.some((p) => p.includes('cryptography') || p.includes('zero-knowledge'))).toBe(true);
  });

  it('4. should compare cross-dataset participants, vocabulary, and time spans', () => {
    const result = comparatorService.compareDatasets(
      {
        id: 'ds_wa',
        name: 'WhatsApp Case',
        sourceType: 'WHATSAPP',
        totalEvents: 500,
        startDate: '2026-08-01T00:00:00Z',
        endDate: '2026-08-15T00:00:00Z',
        actors: ['SuspectA', 'AssociateB', 'WitnessC'],
        topKeyphrases: ['vault passkey', 'location pin', 'transfer'],
      },
      {
        id: 'ds_tg',
        name: 'Telegram Group',
        sourceType: 'TELEGRAM',
        totalEvents: 800,
        startDate: '2026-08-05T00:00:00Z',
        endDate: '2026-08-20T00:00:00Z',
        actors: ['SuspectA', 'AssociateB', 'InformantD'],
        topKeyphrases: ['vault passkey', 'server logs', 'transfer'],
      },
    );

    expect(result.participantOverlap.sharedActors).toEqual(['SuspectA', 'AssociateB']);
    expect(result.participantOverlap.jaccardSimilarity).toBe(0.5);
    expect(result.keyphraseOverlap.sharedKeyphrases).toContain('vault passkey');
    expect(result.temporalAlignment.relationship).toBe('CONCURRENT');
    expect(result.correlationScore).toBeGreaterThan(50);
  });

  it('5. should detect velocity spikes and communication blackouts', () => {
    const events: Array<{ actor: string; timestamp: Date; content: string }> = [];

    // 10 messages steady
    for (let h = 0; h < 10; h++) {
      events.push({
        actor: 'Lead',
        timestamp: new Date(`2026-08-24T${h.toString().padStart(2, '0')}:00:00Z`),
        content: 'Status update',
      });
    }

    // 40 messages surge in 1 hour
    for (let m = 0; m < 40; m++) {
      events.push({
        actor: 'Lead',
        timestamp: new Date(`2026-08-24T10:${m.toString().padStart(2, '0')}:00Z`),
        content: 'Emergency incident',
      });
    }

    const report = velocityService.detectVelocityAnomalies(events, 60);
    expect(report.totalSpikes).toBeGreaterThan(0);
    expect(report.highestZScore).toBeGreaterThan(2.5);
  });
});
