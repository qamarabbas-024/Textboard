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
import { DossierGeneratorService } from './dossier-generator.service';
import { MarkdownVaultService } from './markdown-vault.service';
import { ChatExportOptions } from './types';

@Controller('api/v1/datasets/:id/export')
export class ExportController {
  constructor(
    protected readonly exportService: ExportService,
    protected readonly dossierGenerator: DossierGeneratorService,
    protected readonly markdownVault: MarkdownVaultService,
  ) {}

  @Post('pdf')
  async startPdfExport(
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

  @Get('pdf/:jobId')
  async getJobProgress(@Param('jobId') jobId: string) {
    return this.exportService.getJobStatus(jobId);
  }

  @Get('pdf/:jobId/status')
  async getStatus(@Param('jobId') jobId: string) {
    return this.exportService.getJobStatus(jobId);
  }

  @Post('pdf/:jobId/cancel')
  async cancelJob(@Param('jobId') jobId: string) {
    return this.exportService.cancelExportJob(jobId);
  }

  @Get('pdf/:jobId/download')
  async downloadPdf(@Param('jobId') jobId: string, @Res() res: Response) {
    const { stream, filename, size } = this.exportService.getJobDownloadStream(jobId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', size);
    stream.pipe(res);
  }

  @Get('csv')
  async downloadCsv(@Param('id') datasetId: string, @Res() res: Response) {
    const { filename, content } = await this.exportService.exportDatasetCsv(datasetId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(content);
  }

  @Get('json')
  async downloadJson(@Param('id') datasetId: string, @Res() res: Response) {
    const { filename, content } = await this.exportService.exportDatasetJson(datasetId);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(content);
  }

  @Get('dossier')
  async downloadHtmlDossier(@Param('id') datasetId: string, @Res() res: Response) {
    const { filename, html } = await this.dossierGenerator.generateHtmlDossier(datasetId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(html);
  }

  @Get('vault')
  async downloadMarkdownVault(@Param('id') datasetId: string, @Res() res: Response) {
    const { filename, buffer } = await this.markdownVault.generateMarkdownVault(datasetId);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}

@Controller('datasets/:id/export/pdf')
export class LegacyExportController extends ExportController {}

