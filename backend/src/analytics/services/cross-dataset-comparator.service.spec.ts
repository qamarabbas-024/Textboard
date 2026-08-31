import { CrossDatasetComparatorService, DatasetSummaryInput } from './cross-dataset-comparator.service';

describe('CrossDatasetComparatorService', () => {
  const service = new CrossDatasetComparatorService();

  it('should compare datasets and calculate Jaccard overlap and temporal alignment', () => {
    const dsA: DatasetSummaryInput = {
      id: 'ds_1',
      name: 'WhatsApp Archive',
      sourceType: 'WHATSAPP',
      totalEvents: 1500,
      startDate: '2026-08-01T00:00:00Z',
      endDate: '2026-08-20T00:00:00Z',
      actors: ['Alice', 'Bob', 'Charlie'],
      topKeyphrases: ['cryptographic keys', 'launch', 'server'],
    };

    const dsB: DatasetSummaryInput = {
      id: 'ds_2',
      name: 'Telegram Group',
      sourceType: 'TELEGRAM',
      totalEvents: 2200,
      startDate: '2026-08-10T00:00:00Z',
      endDate: '2026-08-30T00:00:00Z',
      actors: ['Alice', 'Bob', 'David', 'Eve'],
      topKeyphrases: ['cryptographic keys', 'incident', 'server'],
    };

    const result = service.compareDatasets(dsA, dsB);

    expect(result.participantOverlap.sharedActors).toContain('Alice');
    expect(result.participantOverlap.sharedActors).toContain('Bob');
    expect(result.participantOverlap.jaccardSimilarity).toBeGreaterThan(0.3);

    expect(result.keyphraseOverlap.sharedKeyphrases).toContain('cryptographic keys');
    expect(result.keyphraseOverlap.sharedKeyphrases).toContain('server');

    expect(result.temporalAlignment.relationship).toBe('CONCURRENT');
    expect(result.temporalAlignment.overlapDays).toBeGreaterThan(0);
    expect(result.correlationScore).toBeGreaterThan(40);
  });
});
