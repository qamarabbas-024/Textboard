import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from './files.service';
import { JobsService } from './jobs.service';
import { ParserRegistryService } from './parsers/parser-registry.service';
import { NormalizationService } from './normalizer.service';
import { BatchedSinkService } from './batched-sink.service';
import { TxtStreamParser } from './parsers/txt-stream-parser';
import { CsvStreamParser } from './parsers/csv-stream-parser';
import { JsonStreamParser } from './parsers/json-stream-parser';
import { XlsxStreamParser } from './parsers/xlsx-stream-parser';
import { Readable } from 'stream';

import { ImessageStreamParser } from './parsers/imessage-stream-parser';
import { SignalStreamParser } from './parsers/signal-stream-parser';
import { SlackStreamParser } from './parsers/slack-stream-parser';

describe('IngestionService (V1 Streaming Pipeline)', () => {
  let service: IngestionService;
  let mockPrisma: any;
  let mockFilesService: any;
  let mockJobsService: any;
  let mockBatchedSink: any;

  beforeEach(async () => {
    mockPrisma = {
      dataset: {
        create: jest.fn().mockResolvedValue({ id: 'ds_100', name: 'chat.txt' }),
        delete: jest.fn().mockResolvedValue({ id: 'ds_100' }),
      },
      sourceFile: {
        create: jest.fn().mockResolvedValue({ id: 'sf_100' }),
        update: jest.fn().mockResolvedValue({ id: 'sf_100' }),
      },
      entity: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve(args.data)),
      },
      timelineEvent: {
        count: jest.fn().mockResolvedValue(2),
      },
    };

    mockFilesService = {
      spoolStreamToDisk: jest.fn().mockResolvedValue({
        filepath: '/tmp/test_spool.txt',
        size: 1024,
        checksum: 'sha256_mock_hash',
      }),
      createReadStream: jest.fn().mockImplementation(() => {
        return Readable.from([
          '[15/01/2024, 10:00:00] Alice: First message\n',
          '[15/01/2024, 10:01:00] Bob: Second message\n',
        ]);
      }),
      cleanupFile: jest.fn().mockResolvedValue(undefined),
    };

    mockJobsService = {
      createJob: jest.fn().mockResolvedValue('job_test_100'),
      getAbortSignal: jest.fn().mockReturnValue(undefined),
      startProcessing: jest.fn().mockResolvedValue(undefined),
      updateProgress: jest.fn().mockResolvedValue(undefined),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };

    mockBatchedSink = {
      persistBatch: jest.fn().mockResolvedValue({ inserted: 2 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FilesService, useValue: mockFilesService },
        { provide: JobsService, useValue: mockJobsService },
        { provide: BatchedSinkService, useValue: mockBatchedSink },
        ParserRegistryService,
        TxtStreamParser,
        CsvStreamParser,
        JsonStreamParser,
        XlsxStreamParser,
        ImessageStreamParser,
        SignalStreamParser,
        SlackStreamParser,
        NormalizationService,
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
  });

  it('should non-blockingly submit an ingest job and return QUEUED status envelope', async () => {
    const rawStream = Readable.from(['sample line 1\n']);

    const result = await service.submitIngestJob(rawStream, 'chat.txt', 'text/plain');

    expect(result.jobId).toBe('job_test_100');
    expect(result.datasetId).toBe('ds_100');
    expect(result.status).toBe('QUEUED');
    expect(result.eventsUrl).toBe('/api/v1/jobs/job_test_100/events');
    expect(result.statusUrl).toBe('/api/v1/jobs/job_test_100');
    expect(mockFilesService.spoolStreamToDisk).toHaveBeenCalled();
  });

  it('should stream ingest directly and report completed lifecycle', async () => {
    const rawStream = Readable.from(['sample line 1\n']);

    const result = await service.ingestStream(rawStream, 'chat.txt', 'text/plain', {
      batchSize: 10,
    });

    expect(result.datasetId).toBe('ds_100');
    expect(result.totalMessages).toBe(2);
    expect(mockFilesService.spoolStreamToDisk).toHaveBeenCalled();
    expect(mockJobsService.createJob).toHaveBeenCalled();
    expect(mockJobsService.startProcessing).toHaveBeenCalledWith('job_test_100', 'ds_100', 'parsing');
    expect(mockBatchedSink.persistBatch).toHaveBeenCalled();
    expect(mockJobsService.markCompleted).toHaveBeenCalledWith(
      'job_test_100',
      'ds_100',
      2,
      0,
      expect.any(Number),
    );
    expect(mockFilesService.cleanupFile).toHaveBeenCalledWith('/tmp/test_spool.txt');
  });

  it('should cleanup temp file and mark job failed on empty stream', async () => {
    mockFilesService.spoolStreamToDisk.mockResolvedValueOnce({
      filepath: '/tmp/empty_spool.txt',
      size: 0,
      checksum: 'empty_hash',
    });

    const rawStream = Readable.from(['']);

    await expect(
      service.submitIngestJob(rawStream, 'empty.txt', 'text/plain'),
    ).rejects.toThrow();

    expect(mockFilesService.cleanupFile).toHaveBeenCalledWith('/tmp/empty_spool.txt');
  });
});
