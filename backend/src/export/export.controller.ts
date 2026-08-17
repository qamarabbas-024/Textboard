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

@Controller('datasets/:id/export/pdf')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  async startExport(
    @Param('id') datasetId: string,
    @Body() body: { type: 'chat' | 'highlights'; startDate?: string; endDate?: string },
  ) {
    return this.exportService.startPdfExport(datasetId, {
      type: body.type || 'chat',
      startDate: body.startDate,
      endDate: body.endDate,
    });
  }

  @Get(':jobId/status')
  async getStatus(@Param('jobId') jobId: string) {
    return this.exportService.getJobStatus(jobId);
  }

  @Get(':jobId/download')
  async downloadPdf(@Param('jobId') jobId: string, @Res() res: Response) {
    const { buffer, filename } = this.exportService.getJobBuffer(jobId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
