import { Test, TestingModule } from '@nestjs/testing';
import { TextChatParserService } from './text-chat-parser.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Readable } from 'stream';
import { BadRequestException } from '@nestjs/common';

describe('TextChatParserService', () => {
  let service: TextChatParserService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      dataset: {
        create: jest.fn().mockResolvedValue({ id: 'test_dataset_1', name: 'chat.txt' }),
        delete: jest.fn().mockResolvedValue({ id: 'test_dataset_1' }),
      },
      timelineEvent: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextChatParserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TextChatParserService>(TextChatParserService);
  });

  it('should parse standard chat export with sender and timestamps', async () => {
    const rawChat = `[15/01/2024, 10:00:00] Alice: Hello there!\n[15/01/2024, 10:01:00] Bob: Hey Alice, how are you?`;
    const stream = Readable.from([rawChat]);

    const result = await service.processStream(stream, 'chat.txt');

    expect(result.totalMessages).toBe(2);
    expect(result.actorCounts['Alice']).toBe(1);
    expect(result.actorCounts['Bob']).toBe(1);
    expect(mockPrisma.timelineEvent.createMany).toHaveBeenCalled();
  });

  it('should throw BadRequestException on empty file', async () => {
    const stream = Readable.from(['   \n\n  ']);
    await expect(service.processStream(stream, 'empty.txt')).rejects.toThrow(BadRequestException);
    expect(mockPrisma.dataset.delete).toHaveBeenCalled();
  });

  it('should throw BadRequestException on corrupted binary content', async () => {
    const stream = Readable.from(['\u0000\u0001\u0002BINARY_DATA']);
    await expect(service.processStream(stream, 'corrupt.txt')).rejects.toThrow(BadRequestException);
  });

  it('should handle multi-line message continuation safely', async () => {
    const rawChat = `[15/01/2024, 10:00:00] Alice: Line 1 of message\nLine 2 continuation\nLine 3 continuation`;
    const stream = Readable.from([rawChat]);

    const result = await service.processStream(stream, 'multiline.txt');
    expect(result.totalMessages).toBe(1);
    expect(result.actorCounts['Alice']).toBe(1);
  });
});
