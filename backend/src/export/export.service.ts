import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatasetsAnalyticsService } from '../datasets/datasets-analytics.service';
import * as PDFDocument from 'pdfkit';

export interface ExportJob {
  id: string;
  datasetId: string;
  type: 'chat' | 'highlights';
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  buffer?: Buffer;
  filename: string;
  error?: string;
  createdAt: Date;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly jobs = new Map<string, ExportJob>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: DatasetsAnalyticsService,
  ) {}

  async startPdfExport(
    datasetId: string,
    options: {
      type: 'chat' | 'highlights';
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{ jobId: string }> {
    const dataset = await this.prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) throw new NotFoundException('Dataset not found');

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const job: ExportJob = {
      id: jobId,
      datasetId,
      type: options.type,
      status: 'processing',
      progress: 10,
      filename: `${dataset.name.replace(/[^a-zA-Z0-9]/g, '_')}_${options.type}.pdf`,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Run async in background
    this.processExportJob(job, options).catch((err) => {
      this.logger.error(`Export job ${jobId} failed: ${err.message}`);
      job.status = 'failed';
      job.error = err.message;
    });

    return { jobId };
  }

  getJobStatus(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Export job not found');

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      filename: job.filename,
      error: job.error,
      downloadUrl:
        job.status === 'completed'
          ? `/datasets/${job.datasetId}/export/pdf/${job.id}/download`
          : undefined,
    };
  }

  getJobBuffer(jobId: string): { buffer: Buffer; filename: string } {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed' || !job.buffer) {
      throw new NotFoundException('Export file not ready or not found');
    }
    return { buffer: job.buffer, filename: job.filename };
  }

  private async processExportJob(
    job: ExportJob,
    options: { type: 'chat' | 'highlights'; startDate?: string; endDate?: string },
  ) {
    const dataset = await this.prisma.dataset.findUnique({ where: { id: job.datasetId } });
    if (!dataset) return;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    if (options.type === 'highlights') {
      await this.generateHighlightsPdf(doc, dataset);
    } else {
      await this.generateChatPdf(doc, dataset, options);
    }

    doc.end();

    await new Promise<void>((resolve) => {
      doc.on('end', () => {
        job.buffer = Buffer.concat(chunks);
        job.status = 'completed';
        job.progress = 100;
        this.logger.log(`PDF Export Job ${job.id} completed successfully (${(job.buffer.length / 1024).toFixed(1)} KB)`);
        resolve();
      });
    });
  }

  private async generateHighlightsPdf(doc: PDFKit.PDFDocument, dataset: any) {
    const [highlights, peopleStats, streaks, milestones] = await Promise.all([
      this.analyticsService.getHighlights(dataset.id),
      this.analyticsService.getPeopleStats(dataset.id),
      this.analyticsService.getStreaks(dataset.id),
      this.analyticsService.getMilestones(dataset.id),
    ]);

    // Title
    doc.fillColor('#065f46').fontSize(22).text('Archive Analytics Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#374151').fontSize(12).text(`Dataset: ${dataset.name}`, { align: 'center' });
    doc.fillColor('#6b7280').fontSize(10).text(`Generated: ${new Date().toUTCString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Section 1: Overview Summary
    doc.fillColor('#111827').fontSize(14).text('1. Dataset Overview', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Total Active Participants: ${peopleStats.totalParticipants}`);
    doc.text(`Longest Continuous Chat Streak: ${streaks.longestStreak?.days || 0} days`);
    doc.text(`Longest Gap: ${streaks.longestGap?.days || 0} days`);
    doc.text(`Total Active Calendar Days: ${streaks.totalActiveDays || 0} days`);
    doc.moveDown(1);

    // Section 2: Key Highlights
    doc.fillColor('#111827').fontSize(14).text('2. Key Highlights', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151');

    if (highlights.firstMessage) {
      doc.font('Helvetica-Bold').text('First Message:');
      doc.font('Helvetica').text(
        `[${new Date(highlights.firstMessage.timestamp).toLocaleDateString()}] ${highlights.firstMessage.actor || 'System'}: "${highlights.firstMessage.content.slice(0, 200)}"`,
      );
      doc.moveDown(0.5);
    }

    if (highlights.longestMessage) {
      doc.font('Helvetica-Bold').text(`Longest Message (${highlights.longestMessage.charLength} chars):`);
      doc.font('Helvetica').text(
        `[${new Date(highlights.longestMessage.timestamp).toLocaleDateString()}] ${highlights.longestMessage.actor}: "${highlights.longestMessage.content.slice(0, 300)}..."`,
      );
      doc.moveDown(0.5);
    }

    if (highlights.mostEmojiMessage) {
      doc.font('Helvetica-Bold').text(`Most Emoji-Dense Message (${highlights.mostEmojiMessage.emojiCount || 0} emojis):`);
      doc.font('Helvetica').text(
        `[${new Date(highlights.mostEmojiMessage.timestamp).toLocaleDateString()}] ${highlights.mostEmojiMessage.actor}: "${highlights.mostEmojiMessage.content.slice(0, 200)}"`,
      );
      doc.moveDown(1);
    }

    // Section 3: Milestones
    doc.fillColor('#111827').fontSize(14).text('3. Milestones', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151');
    for (const m of milestones.slice(0, 6)) {
      if (m.event) {
        doc.text(
          `#${m.milestoneIndex.toLocaleString()} Message: [${new Date(m.event.timestamp).toLocaleDateString()}] ${m.event.actor}: "${m.event.content.slice(0, 100)}"`,
        );
      }
    }
    doc.moveDown(1);

    // Section 4: Top Participants
    doc.fillColor('#111827').fontSize(14).text('4. Top Participants', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151');
    for (const p of peopleStats.people.slice(0, 8)) {
      doc.text(
        `${p.actor}: ${p.messageCount.toLocaleString()} msgs | Avg response: ${p.avgResponseSecs ? Math.round(p.avgResponseSecs / 60) + ' mins' : 'N/A'} | Avg length: ${p.avgCharsPerMessage} chars`,
      );
    }
  }

  private async generateChatPdf(
    doc: PDFKit.PDFDocument,
    dataset: any,
    options: { startDate?: string; endDate?: string },
  ) {
    const where: any = { datasetId: dataset.id };
    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = new Date(options.startDate);
      if (options.endDate) where.timestamp.lte = new Date(options.endDate);
    }

    // Fetch up to 1000 messages for PDF export
    const events = await this.prisma.timelineEvent.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: 1000,
    });

    // Title & Header
    doc.fillColor('#111827').fontSize(18).text(dataset.name, { align: 'center' });
    doc.fillColor('#6b7280').fontSize(10).text(`Exported ${events.length} messages &bull; ${new Date().toLocaleDateString()}`, {
      align: 'center',
    });
    doc.moveDown(1.5);

    // Chat Bubbles
    for (const ev of events) {
      if (doc.y > 720) {
        doc.addPage();
      }

      const isSystem = !ev.actor || ev.eventType === 'system_event';
      const timeStr = new Date(ev.timestamp).toLocaleString();

      if (isSystem) {
        doc.fontSize(8).fillColor('#9ca3af').text(`${ev.content} (${timeStr})`, { align: 'center' });
        doc.moveDown(0.5);
      } else {
        // Author + Timestamp Header
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#059669').text(ev.actor || 'Unknown', { continued: true });
        doc.font('Helvetica').fillColor('#9ca3af').fontSize(8).text(`  ${timeStr}`);

        // Message Bubble Box
        const startY = doc.y + 2;
        doc.fontSize(9).font('Helvetica').fillColor('#1f2937').text(ev.content, {
          width: 480,
          lineGap: 2,
        });
        doc.moveDown(0.7);
      }
    }
  }
}
