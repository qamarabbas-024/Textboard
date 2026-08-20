import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Sse,
  MessageEvent,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { Observable } from 'rxjs';
import { IngestionService } from './ingestion.service';
import { JobsService } from './jobs.service';

const tempUploadDir = path.resolve(process.cwd(), '.textboard', 'temp');
fs.mkdirSync(tempUploadDir, { recursive: true });

const streamingMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, tempUploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      cb(null, `${uniqueSuffix}_${file.originalname}`);
    },
  }),
};

@Controller('api/v1/ingest')
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Non-blocking file upload endpoint: spools directly to disk, creates QUEUED job,
   * dispatches background worker, and returns immediately with job ID & SSE endpoint.
   */
  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file', streamingMulterOptions))
  async uploadAndSubmitJob(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided for ingestion.');
    }

    const stream = fs.createReadStream(file.path);
    try {
      const submission = await this.ingestionService.submitIngestJob(
        stream,
        file.originalname,
        file.mimetype,
      );
      return submission;
    } finally {
      // Cleanup multer raw upload file after stream spooling
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }

  /**
   * Submit an existing local file path for ingestion (for CLI / desktop integration).
   */
  @Post('submit-local')
  @HttpCode(HttpStatus.ACCEPTED)
  async submitLocalFile(@Body() body: { filepath: string; datasetName?: string }) {
    if (!body.filepath) {
      throw new BadRequestException('filepath parameter is required.');
    }
    return this.ingestionService.ingestLocalFile(body.filepath, {
      datasetName: body.datasetName,
    });
  }

  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.jobsService.getJob(jobId);
  }

  @Sse('jobs/:jobId/events')
  streamJobEvents(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.jobsService.getJobEventStream(jobId) as any;
  }

  @Post('jobs/:jobId/cancel')
  async cancelJob(@Param('jobId') jobId: string) {
    const cancelled = await this.jobsService.cancelJob(jobId);
    return { success: cancelled, jobId, status: 'CANCELLED' };
  }
}
