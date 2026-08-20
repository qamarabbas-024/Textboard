import { Test, TestingModule } from '@nestjs/testing';
import { NormalizationService } from './normalizer.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NormalizationService (V1 Normalizer)', () => {
  let service: NormalizationService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      entity: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve(args.data)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NormalizationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NormalizationService>(NormalizationService);
  });

  it('should extract URLs, Emojis, word count, and character length correctly', async () => {
    const context = service.createContext('ds_test_1', 'file_test_1');
    const record = {
      timestamp: new Date('2024-01-15T10:00:00Z'),
      actor: 'Alice',
      content: 'Here is the project link: https://textboard.local 🎉🚀 and another note.',
      eventType: 'message',
    };

    const norm = await context.normalize(record);

    expect(norm.datasetId).toBe('ds_test_1');
    expect(norm.actorName).toBe('Alice');
    expect(norm.hasUrls).toBe(true);
    expect(norm.hasEmojis).toBe(true);
    expect(norm.wordCount).toBe(11);
    expect(norm.charLength).toBe(record.content.length);
    expect(norm.sequenceNum).toBe(1);

    const parsedMeta = JSON.parse(norm.metadata || '{}');
    expect(parsedMeta.urls).toContain('https://textboard.local');
    expect(parsedMeta.emojis).toEqual(expect.arrayContaining(['🎉', '🚀']));
  });

  it('should cache entity lookups in-memory during a single ingestion session', async () => {
    const context = service.createContext('ds_test_2');

    await context.normalize({
      timestamp: new Date(),
      actor: 'Bob',
      content: 'Msg 1',
    });

    await context.normalize({
      timestamp: new Date(),
      actor: 'Bob',
      content: 'Msg 2',
    });

    // DB entity create should only be called once due to caching
    expect(mockPrisma.entity.create).toHaveBeenCalledTimes(1);
  });
});
