import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ImportProgressEvent, ImportJobStatus, JobSummary, JobStep } from './types';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly eventStream$ = new Subject<ImportProgressEvent>();
  private readonly activeControllers = new Map<string, AbortController>();
  private readonly lastDbUpdate = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new job record with state QUEUED.
   */
  async createJob(datasetId: string, sourceFileId?: string): Promise<string> {
    const job = await this.prisma.importJob.create({
      data: {
        datasetId,
        sourceFileId,
        status: 'QUEUED',
        step: 'spooling',
        progress: 0,
        processedRows: 0,
        failedRows: 0,
      },
    });

    const controller = new AbortController();
    this.activeControllers.set(job.id, controller);

    this.emitEvent({
      jobId: job.id,
      datasetId,
      status: 'QUEUED',
      step: 'spooling',
      progress: 0,
      processedRows: 0,
      failedRows: 0,
    });

    this.logger.log(`Created ImportJob ${job.id} for dataset ${datasetId} (Status: QUEUED)`);
    return job.id;
  }

  getAbortSignal(jobId: string): AbortSignal | undefined {
    return this.activeControllers.get(jobId)?.signal;
  }

  /**
   * Transitions job state from QUEUED to PROCESSING.
   */
  async startProcessing(jobId: string, datasetId: string, step: JobStep = 'parsing') {
    const now = new Date();
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        step,
        startedAt: now,
      },
    });

    this.emitEvent({
      jobId,
      datasetId,
      status: 'PROCESSING',
      step,
      progress: 5,
      processedRows: 0,
      failedRows: 0,
      startedAt: now,
    });

    this.logger.log(`ImportJob ${jobId} transitioned to PROCESSING (step: ${step})`);
  }

  /**
   * Updates real-time progress. Throttles DB writes to prevent disk lock contention
   * while emitting live SSE events instantly to the client.
   */
  async updateProgress(
    jobId: string,
    datasetId: string,
    step: JobStep | string,
    progress: number,
    processedRows: number,
    failedRows = 0,
  ) {
    const safeProgress = Math.min(Math.max(0, Math.round(progress)), 99);

    // Live event to SSE subscribers immediately
    this.emitEvent({
      jobId,
      datasetId,
      status: 'PROCESSING',
      step,
      progress: safeProgress,
      processedRows,
      failedRows,
    });

    // Throttled persistence to SQLite database (max once per 500ms)
    const now = Date.now();
    const lastUpdate = this.lastDbUpdate.get(jobId) || 0;
    if (now - lastUpdate > 500 || progress >= 95) {
      this.lastDbUpdate.set(jobId, now);
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          step,
          status: 'PROCESSING',
          progress: safeProgress,
          processedRows,
          failedRows,
        },
      }).catch((err) => {
        this.logger.warn(`Non-critical error updating job ${jobId} progress: ${err.message}`);
      });
    }
  }

  /**
   * Marks job as COMPLETED and records metrics.
   */
  async markCompleted(
    jobId: string,
    datasetId: string,
    totalRows: number,
    failedRows: number,
    executionTimeMs: number,
  ) {
    this.activeControllers.delete(jobId);
    this.lastDbUpdate.delete(jobId);
    const completedAt = new Date();

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        step: 'completed',
        progress: 100,
        processedRows: totalRows,
        failedRows,
        totalRows: totalRows + failedRows,
        executionTimeMs,
        completedAt,
      },
    });

    this.emitEvent({
      jobId,
      datasetId,
      status: 'COMPLETED',
      step: 'completed',
      progress: 100,
      processedRows: totalRows,
      failedRows,
      totalRows: totalRows + failedRows,
      completedAt,
      executionTimeMs,
    });

    this.logger.log(
      `ImportJob ${jobId} COMPLETED in ${executionTimeMs}ms (processed=${totalRows}, failed=${failedRows})`,
    );
  }

  /**
   * Marks job as FAILED and captures error details.
   */
  async markFailed(
    jobId: string,
    datasetId: string,
    error: string,
    errorDetails?: string[],
  ) {
    this.activeControllers.delete(jobId);
    this.lastDbUpdate.delete(jobId);
    const completedAt = new Date();

    const detailsStr = errorDetails ? JSON.stringify(errorDetails) : undefined;

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        step: 'failed',
        errorMessage: error,
        errorDetails: detailsStr,
        completedAt,
      },
    }).catch(() => {});

    this.emitEvent({
      jobId,
      datasetId,
      status: 'FAILED',
      step: 'failed',
      progress: 0,
      processedRows: 0,
      failedRows: 0,
      error,
      completedAt,
    });

    this.logger.error(`ImportJob ${jobId} FAILED: ${error}`);
  }

  /**
   * Gracefully cancels an in-flight job.
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const controller = this.activeControllers.get(jobId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(jobId);
    }
    this.lastDbUpdate.delete(jobId);

    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const completedAt = new Date();
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        step: 'cancelled',
        errorMessage: 'Job was cancelled by user request.',
        completedAt,
      },
    });

    this.emitEvent({
      jobId,
      datasetId: job.datasetId,
      status: 'CANCELLED',
      step: 'cancelled',
      progress: job.progress,
      processedRows: job.processedRows,
      failedRows: job.failedRows,
      error: 'Job was cancelled by user request.',
      completedAt,
    });

    this.logger.warn(`ImportJob ${jobId} CANCELLED by client request.`);
    return true;
  }

  /**
   * Retrieves detailed job status.
   */
  async getJob(jobId: string): Promise<JobSummary> {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: { dataset: true, sourceFile: true },
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    return {
      id: job.id,
      datasetId: job.datasetId,
      datasetName: job.dataset?.name,
      sourceFileId: job.sourceFileId,
      filename: job.sourceFile?.filename,
      fileSize: job.sourceFile?.fileSize,
      status: job.status as ImportJobStatus,
      step: job.step,
      progress: job.progress,
      processedRows: job.processedRows,
      failedRows: job.failedRows,
      totalRows: job.totalRows,
      errorMessage: job.errorMessage,
      errorDetails: job.errorDetails,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      executionTimeMs: job.executionTimeMs,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  /**
   * Lists recent import jobs for dashboard monitoring.
   */
  async listJobs(limit = 20, offset = 0): Promise<JobSummary[]> {
    const jobs = await this.prisma.importJob.findMany({
      take: Math.min(limit, 100),
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: { dataset: true, sourceFile: true },
    });

    return jobs.map((job) => ({
      id: job.id,
      datasetId: job.datasetId,
      datasetName: job.dataset?.name,
      sourceFileId: job.sourceFileId,
      filename: job.sourceFile?.filename,
      fileSize: job.sourceFile?.fileSize,
      status: job.status as ImportJobStatus,
      step: job.step,
      progress: job.progress,
      processedRows: job.processedRows,
      failedRows: job.failedRows,
      totalRows: job.totalRows,
      errorMessage: job.errorMessage,
      errorDetails: job.errorDetails,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      executionTimeMs: job.executionTimeMs,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));
  }

  /**
   * Observable stream for SSE client subscriptions.
   */
  getJobEventStream(jobId: string): Observable<{ data: ImportProgressEvent }> {
    return this.eventStream$.pipe(
      filter((e) => e.jobId === jobId),
      map((event) => ({ data: event })),
    );
  }

  private emitEvent(event: ImportProgressEvent) {
    this.eventStream$.next(event);
  }
}
