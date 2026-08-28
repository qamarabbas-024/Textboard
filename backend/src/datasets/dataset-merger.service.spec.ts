import { DatasetMergerService } from './dataset-merger.service';

describe('DatasetMergerService', () => {
  let service: DatasetMergerService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      dataset: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'ds_1', name: 'WhatsApp Group' },
          { id: 'ds_2', name: 'Telegram Channel' },
        ]),
        create: jest.fn().mockResolvedValue({
          id: 'ds_merged_123',
          name: 'Unified Group Stream',
          sourceType: 'federated_merge',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      timelineEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ev_1',
            datasetId: 'ds_1',
            actor: 'Alice',
            timestamp: new Date('2026-08-20T10:00:00Z'),
            content: 'Hello WhatsApp',
            eventType: 'message',
            charLength: 14,
            wordCount: 2,
            hasUrls: false,
            hasEmojis: false,
            hasMedia: false,
          },
          {
            id: 'ev_2',
            datasetId: 'ds_2',
            actor: 'Bob',
            timestamp: new Date('2026-08-20T10:02:00Z'),
            content: 'Hello Telegram',
            eventType: 'message',
            charLength: 14,
            wordCount: 2,
            hasUrls: false,
            hasEmojis: false,
            hasMedia: false,
          },
        ]),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    service = new DatasetMergerService(mockPrisma);
  });

  it('should merge multiple datasets into a single chronological stream', async () => {
    const result = await service.mergeDatasets({
      name: 'Unified Group Stream',
      sourceDatasetIds: ['ds_1', 'ds_2'],
      tagSources: true,
    });

    expect(result.mergedDatasetId).toBe('ds_merged_123');
    expect(result.totalEvents).toBe(2);
    expect(result.sourceDatasetsCount).toBe(2);
    expect(mockPrisma.timelineEvent.createMany).toHaveBeenCalled();
  });
});
