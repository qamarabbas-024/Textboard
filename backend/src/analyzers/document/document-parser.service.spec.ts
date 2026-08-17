import { Test, TestingModule } from '@nestjs/testing';
import { DocumentParserService } from './document-parser.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('DocumentParserService', () => {
  let service: DocumentParserService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      dataset: {
        create: jest.fn().mockResolvedValue({ id: 'test_doc_1', name: 'Document Collection' }),
      },
      timelineEvent: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      highlight: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      metric: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentParserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DocumentParserService>(DocumentParserService);
  });

  it('should parse multiple text documents and compute topics and similarity overlap', async () => {
    const doc1 = {
      buffer: Buffer.from('PostgreSQL architecture design notes for database performance.'),
      originalname: 'database.txt',
    };
    const doc2 = {
      buffer: Buffer.from('Redis cache and database performance architecture review.'),
      originalname: 'caching.txt',
    };

    const result = await service.processDocuments([doc1, doc2]);

    expect(result.fileCount).toBe(2);
    expect(result.similarityMatrix.length).toBe(1);
    expect(result.similarityMatrix[0].similarity).toBeGreaterThan(0);
    expect(mockPrisma.timelineEvent.createMany).toHaveBeenCalled();
  });

  it('should throw BadRequestException when no documents provided', async () => {
    await expect(service.processDocuments([])).rejects.toThrow(BadRequestException);
  });
});
