import { Test, TestingModule } from '@nestjs/testing';
import { SpreadsheetParserService } from './spreadsheet-parser.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';

describe('SpreadsheetParserService', () => {
  let service: SpreadsheetParserService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      dataset: {
        create: jest.fn().mockResolvedValue({ id: 'test_sheet_1', name: 'grades.csv' }),
      },
      timelineEvent: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      highlight: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      metric: {
        createMany: jest.fn().mockResolvedValue({ count: 4 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpreadsheetParserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SpreadsheetParserService>(SpreadsheetParserService);
  });

  it('should parse gradebook CSV and compute GPA and weak subject highlights', async () => {
    const csv = `Student,Math,Science,English\nAlice,95,90,92\nBob,55,70,60`;
    const buffer = Buffer.from(csv, 'utf8');

    const result = await service.processSpreadsheet(buffer, 'grades.csv');

    expect(result.totalMessages).toBe(2);
    expect(result.isGradebook).toBe(true);
    expect(mockPrisma.timelineEvent.createMany).toHaveBeenCalled();
    expect(mockPrisma.metric.createMany).toHaveBeenCalled();
  });

  it('should throw BadRequestException on empty buffer', async () => {
    const buffer = Buffer.alloc(0);
    await expect(service.processSpreadsheet(buffer, 'empty.csv')).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException on corrupt binary data', async () => {
    const buffer = Buffer.from('NOT_A_VALID_SPREADSHEET_CORRUPTED_BYTES');
    // xlsx parses plaintext as single cell without columns
    await expect(service.processSpreadsheet(buffer, 'corrupt.xlsx')).rejects.toThrow();
  });
});
