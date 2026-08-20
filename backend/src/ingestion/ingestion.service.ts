import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from './files.service';
import { JobsService } from './jobs.service';
import { ParserRegistryService } from './parsers/parser-registry.service';
import { NormalizationService } from './normalizer.service';
import { BatchedSinkService } from './batched-sink.service';
import { IngestOptions, NormalizedEvent, JobSubmissionResult } from './types';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly jobsService: JobsService,
    private readonly parserRegistry: ParserRegistryService,
    private readonly normalizer: NormalizationService,
    private readonly batchedSink: BatchedSinkService,
  ) {}

  /**
   * Non-blocking ingestion submission: Spools upload to disk, creates QUEUED job,
   * spawns background worker, and returns immediate 202 submission envelope.
   */
  async submitIngestJob(
    stream: NodeJS.ReadableStream,
    filename: string,
    mimeType: string,
    options: IngestOptions = {},
  ): Promise<JobSubmissionResult> {
    this.logger.log(`Submitting non-blocking ingestion job for file: ${filename}`);

    // 1. Spool incoming stream directly to disk (0 RAM heap growth)
    const spooled = await this.filesService.spoolStreamToDisk(stream, filename);

    if (spooled.size === 0) {
      await this.filesService.cleanupFile(spooled.filepath);
      throw new BadRequestException('Uploaded file is empty (0 bytes).');
    }

    // 2. Select streaming parser
    const parser = this.parserRegistry.getParser(mimeType, filename);

    // 3. Create Dataset and SourceFile records
    const datasetName = options.datasetName || filename;
    const dataset = await this.prisma.dataset.create({
      data: {
        name: datasetName,
        sourceType: options.sourceType || parser.formatId,
        metadata: JSON.stringify({ originalFilename: filename }),
      },
    });

    const sourceFile = await this.prisma.sourceFile.create({
      data: {
        datasetId: dataset.id,
        filename,
        fileSize: spooled.size,
        mimeType,
        checksum: spooled.checksum,
        status: 'spooled',
      },
    });

    // 4. Create Job in QUEUED state
    const jobId = await this.jobsService.createJob(dataset.id, sourceFile.id);

    // 5. Dispatch async background worker
    setImmediate(() => {
      this.executeJobWorker(
        jobId,
        dataset.id,
        sourceFile.id,
        spooled.filepath,
        filename,
        mimeType,
        options,
      ).catch((err) => {
        this.logger.error(`Background worker failed for job ${jobId}: ${err.message}`);
      });
    });

    return {
      jobId,
      datasetId: dataset.id,
      status: 'QUEUED',
      filename,
      fileSize: spooled.size,
      eventsUrl: `/api/v1/jobs/${jobId}/events`,
      statusUrl: `/api/v1/jobs/${jobId}`,
    };
  }

  /**
   * Synchronous/direct streaming ingestion wrapper (for CLI / script executions).
   */
  async ingestStream(
    stream: NodeJS.ReadableStream,
    filename: string,
    mimeType: string,
    options: IngestOptions = {},
  ) {
    const spooled = await this.filesService.spoolStreamToDisk(stream, filename);
    if (spooled.size === 0) {
      await this.filesService.cleanupFile(spooled.filepath);
      throw new BadRequestException('Uploaded file is empty (0 bytes).');
    }

    const parser = this.parserRegistry.getParser(mimeType, filename);
    const datasetName = options.datasetName || filename;

    const dataset = await this.prisma.dataset.create({
      data: {
        name: datasetName,
        sourceType: options.sourceType || parser.formatId,
        metadata: JSON.stringify({ originalFilename: filename }),
      },
    });

    const sourceFile = await this.prisma.sourceFile.create({
      data: {
        datasetId: dataset.id,
        filename,
        fileSize: spooled.size,
        mimeType,
        checksum: spooled.checksum,
        status: 'spooled',
      },
    });

    const jobId = await this.jobsService.createJob(dataset.id, sourceFile.id);

    return this.executeJobWorker(
      jobId,
      dataset.id,
      sourceFile.id,
      spooled.filepath,
      filename,
      mimeType,
      options,
    );
  }

  /**
   * Ingests an existing local file path (for local CLI / desktop drop).
   */
  async ingestLocalFile(filepath: string, options: IngestOptions = {}) {
    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(filepath)) {
      throw new BadRequestException(`File does not exist: ${filepath}`);
    }

    const filename = path.basename(filepath);
    const mimeType = 'text/plain';
    const readStream = fs.createReadStream(filepath);

    return this.submitIngestJob(readStream, filename, mimeType, options);
  }

  /**
   * Core async worker execution loop.
   */
  private async executeJobWorker(
    jobId: string,
    datasetId: string,
    sourceFileId: string,
    tempFilepath: string,
    filename: string,
    mimeType: string,
    options: IngestOptions,
  ) {
    const startTime = Date.now();
    const batchSize = options.batchSize || 2500;
    let totalInserted = 0;
    let failedRows = 0;

    try {
      await this.jobsService.startProcessing(jobId, datasetId, 'parsing');

      const parser = this.parserRegistry.getParser(mimeType, filename);
      const signal = options.signal || this.jobsService.getAbortSignal(jobId);
      const readStream = this.filesService.createReadStream(tempFilepath);
      const normContext = this.normalizer.createContext(datasetId, sourceFileId);

      const parserIterable = parser.parseStream(readStream, {
        jobId,
        datasetId,
        sourceFileId,
        filename,
        signal,
        onProgress: (_prog, count, fails) => {
          this.jobsService.updateProgress(
            jobId,
            datasetId,
            'parsing',
            Math.min(90, Math.round((count / (count + 2500)) * 85)),
            count,
            fails || 0,
          );
        },
      });

      let buffer: NormalizedEvent[] = [];

      for await (const rawRecord of parserIterable) {
        if (signal?.aborted) {
          this.logger.warn(`Ingestion worker aborted for job ${jobId}`);
          break;
        }

        try {
          const normEvent = await normContext.normalize(rawRecord);
          buffer.push(normEvent);
        } catch (err: any) {
          failedRows++;
          this.logger.warn(`Record normalization error in job ${jobId}: ${err.message}`);
        }

        if (buffer.length >= batchSize) {
          const { inserted } = await this.batchedSink.persistBatch(datasetId, buffer);
          totalInserted += inserted;
          buffer = [];

          await this.jobsService.updateProgress(
            jobId,
            datasetId,
            'normalizing',
            Math.min(95, Math.round((totalInserted / (totalInserted + 2500)) * 90)),
            totalInserted,
            failedRows,
          );
        }
      }

      // Flush remainder
      if (buffer.length > 0) {
        const { inserted } = await this.batchedSink.persistBatch(datasetId, buffer);
        totalInserted += inserted;
        buffer = [];
      }

      if (totalInserted === 0 && !signal?.aborted) {
        throw new BadRequestException('No parseable records extracted from file.');
      }

      await this.prisma.sourceFile.update({
        where: { id: sourceFileId },
        data: { status: 'processed' },
      });

      const elapsed = Date.now() - startTime;
      await this.jobsService.markCompleted(jobId, datasetId, totalInserted, failedRows, elapsed);

      return {
        jobId,
        datasetId,
        totalMessages: totalInserted,
        failedRows,
        processingTimeMs: elapsed,
      };
    } catch (err: any) {
      this.logger.error(`Job worker execution error: ${err.message}`, err.stack);
      await this.jobsService.markFailed(jobId, datasetId, err.message || 'Ingestion failed');

      // Cleanup empty dataset if 0 records written
      const count = await this.prisma.timelineEvent.count({ where: { datasetId } });
      if (count === 0) {
        await this.prisma.dataset.delete({ where: { id: datasetId } }).catch(() => {});
      }

      throw err;
    } finally {
      await this.filesService.cleanupFile(tempFilepath);
    }
  }
}
