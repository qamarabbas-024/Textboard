import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { ChatExportOptions } from './types';

@Controller('api/v1/datasets/:id/export/pdf')
export class ExportController {
  constructor(protected readonly exportService: ExportService) {}

  @Post()
  async startExport(
    @Param('id') datasetId: string,
    @Body() body: ChatExportOptions,
  ) {
    return this.exportService.startPdfExport(datasetId, {
      type: body.type || 'chat',
      theme: body.theme || 'light',
      pageBgColor: body.pageBgColor,
      sentBubbleColor: body.sentBubbleColor,
      receivedBubbleColor: body.receivedBubbleColor,
      includeCoverPage: body.includeCoverPage !== false,
      includeBookmarks: body.includeBookmarks !== false,
      primaryActor: body.primaryActor,
      startDate: body.startDate,
      endDate: body.endDate,
      actor: body.actor,
      includeTimestamps: body.includeTimestamps !== false,
      includeSenderNames: body.includeSenderNames !== false,
      includeDateSeparators: body.includeDateSeparators !== false,
      includeMediaPlaceholders: body.includeMediaPlaceholders !== false,
      groupConsecutive: body.groupConsecutive !== false,
      pageSize: body.pageSize || 'A4',
    });
  }

  @Get(':jobId')
  async getJobProgress(@Param('jobId') jobId: string) {
    return this.exportService.getJobStatus(jobId);
  }

  @Get(':jobId/status')
  async getStatus(@Param('jobId') jobId: string) {
    return this.exportService.getJobStatus(jobId);
  }

  @Post(':jobId/cancel')
  async cancelJob(@Param('jobId') jobId: string) {
    return this.exportService.cancelExportJob(jobId);
  }

  @Get(':jobId/download')
  async downloadPdf(@Param('jobId') jobId: string, @Res() res: Response) {
    const { stream, filename, size } = this.exportService.getJobDownloadStream(jobId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', size);
    stream.pipe(res);
  }
}

@Controller('datasets/:id/export/pdf')
export class LegacyExportController extends ExportController {}
