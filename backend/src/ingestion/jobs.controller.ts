import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JobsService } from './jobs.service';

@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * List recent ingestion jobs.
   */
  @Get()
  async listJobs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 20;
    const off = offset ? parseInt(offset, 10) : 0;
    return this.jobsService.listJobs(lim, off);
  }

  /**
   * Get detailed status and error statistics for a specific job.
   */
  @Get(':jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.jobsService.getJob(jobId);
  }

  /**
   * Subscribe to real-time Server-Sent Events for job progress updates.
   */
  @Sse(':jobId/events')
  streamJobEvents(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.jobsService.getJobEventStream(jobId) as any;
  }

  /**
   * Cancel an in-flight background processing job.
   */
  @Post(':jobId/cancel')
  async cancelJob(@Param('jobId') jobId: string) {
    const cancelled = await this.jobsService.cancelJob(jobId);
    return { success: cancelled, jobId, status: 'CANCELLED' };
  }
}
