import { Test, TestingModule } from '@nestjs/testing';
import { BatchedSinkService } from './batched-sink.service';
import { PrismaService } from '../prisma/prisma.service';
import { NormalizedEvent } from './types';

describe('BatchedSinkService (V1 Chunked Persistence)', () => {
  let service: BatchedSinkService;
  let mockPrisma: any;
  let txTimelineEventCreateMany: jest.Mock;
  let txDatasetUpdate: jest.Mock;
  let txDatasetFindUnique: jest.Mock;
  let txDatasetEntityFindUnique: jest.Mock;
  let txDatasetEntityCreate: jest.Mock;

  beforeEach(async () => {
    txTimelineEventCreateMany = jest.fn().mockResolvedValue({ count: 2 });
    txDatasetFindUnique = jest.fn().mockResolvedValue({
      id: 'ds_sink_1',
      totalEvents: 0,
      startDate: null,
      endDate: null,
    });
    txDatasetUpdate = jest.fn().mockResolvedValue({});
    txDatasetEntityFindUnique = jest.fn().mockResolvedValue(null);
    txDatasetEntityCreate = jest.fn().mockResolvedValue({});

    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback({
          timelineEvent: { createMany: txTimelineEventCreateMany },
          dataset: { findUnique: txDatasetFindUnique, update: txDatasetUpdate },
          datasetEntity: {
            findUnique: txDatasetEntityFindUnique,
            create: txDatasetEntityCreate,
          },
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchedSinkService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BatchedSinkService>(BatchedSinkService);
  });

  it('should persist a batch of normalized events inside a transaction', async () => {
    const events: NormalizedEvent[] = [
      {
        id: 'ev_1',
        datasetId: 'ds_sink_1',
        entityId: 'ent_alice',
        actorName: 'Alice',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        sequenceNum: 1,
        content: 'First event',
        eventType: 'message',
        charLength: 11,
        wordCount: 2,
        hasUrls: false,
        hasEmojis: false,
        hasMedia: false,
      },
      {
        id: 'ev_2',
        datasetId: 'ds_sink_1',
        entityId: 'ent_alice',
        actorName: 'Alice',
        timestamp: new Date('2024-01-01T10:05:00Z'),
        sequenceNum: 2,
        content: 'Second event',
        eventType: 'message',
        charLength: 12,
        wordCount: 2,
        hasUrls: false,
        hasEmojis: false,
        hasMedia: false,
      },
    ];

    const result = await service.persistBatch('ds_sink_1', events);

    expect(result.inserted).toBe(2);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(txTimelineEventCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'ev_1', actorName: 'Alice' }),
        expect.objectContaining({ id: 'ev_2', actorName: 'Alice' }),
      ]),
    });
    expect(txDatasetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ds_sink_1' },
        data: expect.objectContaining({
          totalEvents: 2,
        }),
      }),
    );
  });

  it('should return 0 inserted when empty batch passed', async () => {
    const result = await service.persistBatch('ds_sink_1', []);
    expect(result.inserted).toBe(0);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
