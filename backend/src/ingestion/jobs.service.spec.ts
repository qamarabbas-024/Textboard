import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('JobsService (V1 Job Lifecycle)', () => {
  let service: JobsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      importJob: {
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: 'job_test_123',
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
        update: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: args.where.id,
            ...args.data,
            updatedAt: new Date(),
          }),
        ),
        findUnique: jest.fn().mockResolvedValue({
          id: 'job_test_123',
          datasetId: 'ds_1',
          status: 'QUEUED',
          progress: 0,
          processedRows: 0,
          failedRows: 0,
          totalRows: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          dataset: { name: 'Test Dataset' },
          sourceFile: { filename: 'chat.txt', fileSize: 1024 },
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'job_test_123',
            datasetId: 'ds_1',
            status: 'COMPLETED',
            progress: 100,
            processedRows: 500,
            failedRows: 0,
            totalRows: 500,
            createdAt: new Date(),
            updatedAt: new Date(),
            dataset: { name: 'Test Dataset' },
            sourceFile: { filename: 'chat.txt', fileSize: 1024 },
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should initialize job in QUEUED state and create AbortSignal', async () => {
    const jobId = await service.createJob('ds_1', 'sf_1');

    expect(jobId).toBe('job_test_123');
    expect(mockPrisma.importJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        datasetId: 'ds_1',
        sourceFileId: 'sf_1',
        status: 'QUEUED',
      }),
    });

    const signal = service.getAbortSignal(jobId);
    expect(signal).toBeDefined();
    expect(signal?.aborted).toBe(false);
  });

  it('should transition job to PROCESSING and record startedAt', async () => {
    await service.startProcessing('job_test_123', 'ds_1', 'parsing');

    expect(mockPrisma.importJob.update).toHaveBeenCalledWith({
      where: { id: 'job_test_123' },
      data: expect.objectContaining({
        status: 'PROCESSING',
        step: 'parsing',
        startedAt: expect.any(Date),
      }),
    });
  });

  it('should mark job as COMPLETED with execution time and total rows', async () => {
    await service.markCompleted('job_test_123', 'ds_1', 1000, 5, 2500);

    expect(mockPrisma.importJob.update).toHaveBeenCalledWith({
      where: { id: 'job_test_123' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        step: 'completed',
        progress: 100,
        processedRows: 1000,
        failedRows: 5,
        totalRows: 1005,
        executionTimeMs: 2500,
        completedAt: expect.any(Date),
      }),
    });
  });

  it('should mark job as FAILED and record error details', async () => {
    await service.markFailed('job_test_123', 'ds_1', 'Corrupted file', ['Line 5 invalid']);

    expect(mockPrisma.importJob.update).toHaveBeenCalledWith({
      where: { id: 'job_test_123' },
      data: expect.objectContaining({
        status: 'FAILED',
        step: 'failed',
        errorMessage: 'Corrupted file',
        completedAt: expect.any(Date),
      }),
    });
  });

  it('should abort controller and transition state to CANCELLED on cancellation', async () => {
    const jobId = await service.createJob('ds_1', 'sf_1');
    const signal = service.getAbortSignal(jobId);

    const cancelled = await service.cancelJob(jobId);

    expect(cancelled).toBe(true);
    expect(signal?.aborted).toBe(true);
    expect(mockPrisma.importJob.update).toHaveBeenCalledWith({
      where: { id: jobId },
      data: expect.objectContaining({
        status: 'CANCELLED',
        step: 'cancelled',
      }),
    });
  });

  it('should stream SSE progress events to subscribers', (done) => {
    service.createJob('ds_sse', 'sf_sse').then((jobId) => {
      const stream = service.getJobEventStream(jobId);

      stream.subscribe((event) => {
        if (event.data.status === 'PROCESSING') {
          expect(event.data.progress).toBe(50);
          expect(event.data.processedRows).toBe(500);
          done();
        }
      });

      service.updateProgress(jobId, 'ds_sse', 'normalizing', 50, 500, 0);
    });
  });

  it('should list recent jobs with dataset metadata', async () => {
    const list = await service.listJobs(10, 0);

    expect(list.length).toBe(1);
    expect(list[0].id).toBe('job_test_123');
    expect(list[0].datasetName).toBe('Test Dataset');
    expect(list[0].filename).toBe('chat.txt');
  });
});
