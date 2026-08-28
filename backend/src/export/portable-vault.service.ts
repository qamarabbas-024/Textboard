import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface PortableTextboardBundle {
  formatVersion: 'textboard/v1';
  exportedAt: string;
  checksum: string;
  dataset: {
    name: string;
    sourceType: string;
    metadata?: string | null;
  };
  events: Array<{
    actor: string | null;
    timestamp: string;
    content: string;
    eventType: string;
    charLength: number;
    wordCount: number;
    hasUrls: boolean;
    hasEmojis: boolean;
    hasMedia: boolean;
    metadata?: string | null;
  }>;
}

@Injectable()
export class PortableVaultService {
  private readonly logger = new Logger(PortableVaultService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Exports a dataset into a sealed portable .textboard bundle.
   */
  async exportPortableBundle(datasetId: string): Promise<{ filename: string; buffer: Buffer }> {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      throw new NotFoundException(`Dataset with ID ${datasetId} not found`);
    }

    const events = await this.prisma.timelineEvent.findMany({
      where: { datasetId },
      orderBy: { timestamp: 'asc' },
    });

    const serializedEvents = events.map((e) => ({
      actor: e.actor,
      timestamp: e.timestamp.toISOString(),
      content: e.content,
      eventType: e.eventType,
      charLength: e.charLength,
      wordCount: e.wordCount,
      hasUrls: e.hasUrls,
      hasEmojis: e.hasEmojis,
      hasMedia: e.hasMedia,
      metadata: e.metadata,
    }));

    const contentForHash = JSON.stringify({ dataset: dataset.name, count: events.length });
    const checksum = crypto.createHash('sha256').update(contentForHash).digest('hex');

    const bundle: PortableTextboardBundle = {
      formatVersion: 'textboard/v1',
      exportedAt: new Date().toISOString(),
      checksum,
      dataset: {
        name: dataset.name,
        sourceType: dataset.sourceType,
        metadata: dataset.metadata,
      },
      events: serializedEvents,
    };

    const sanitizedName = dataset.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const jsonStr = JSON.stringify(bundle, null, 2);

    return {
      filename: `${sanitizedName}.textboard`,
      buffer: Buffer.from(jsonStr, 'utf-8'),
    };
  }

  /**
   * Imports a .textboard bundle and recreates the dataset and timeline events.
   */
  async importPortableBundle(bundleContent: string): Promise<{ datasetId: string; totalEvents: number }> {
    let bundle: PortableTextboardBundle;
    try {
      bundle = JSON.parse(bundleContent);
    } catch {
      throw new BadRequestException('Invalid .textboard bundle file format (Malformed JSON).');
    }

    if (bundle.formatVersion !== 'textboard/v1' || !bundle.dataset || !Array.isArray(bundle.events)) {
      throw new BadRequestException('Unrecognized or incompatible .textboard bundle schema.');
    }

    this.logger.log(`Importing portable .textboard bundle: "${bundle.dataset.name}" with ${bundle.events.length} events.`);

    const newDataset = await this.prisma.dataset.create({
      data: {
        name: `${bundle.dataset.name} [Imported]`,
        sourceType: bundle.dataset.sourceType || 'textboard_vault',
        metadata: JSON.stringify({
          originalExportDate: bundle.exportedAt,
          vaultChecksum: bundle.checksum,
        }),
      },
    });

    const chunkSize = 500;
    for (let i = 0; i < bundle.events.length; i += chunkSize) {
      const chunk = bundle.events.slice(i, i + chunkSize);
      await this.prisma.timelineEvent.createMany({
        data: chunk.map((e, idx) => ({
          id: `imp_${newDataset.id.slice(0, 8)}_${i + idx}`,
          datasetId: newDataset.id,
          actor: e.actor,
          actorName: e.actor,
          timestamp: new Date(e.timestamp),
          rawTimestamp: e.timestamp,
          sequenceNum: i + idx + 1,
          content: e.content,
          eventType: e.eventType || 'message',
          charLength: e.charLength || (e.content ? e.content.length : 0),
          wordCount: e.wordCount || (e.content ? e.content.split(/\s+/).length : 0),
          hasUrls: e.hasUrls || false,
          hasEmojis: e.hasEmojis || false,
          hasMedia: e.hasMedia || false,
          metadata: e.metadata,
        })),
      });
    }

    await this.prisma.dataset.update({
      where: { id: newDataset.id },
      data: {
        totalEvents: bundle.events.length,
        startDate: bundle.events.length > 0 ? new Date(bundle.events[0].timestamp) : null,
        endDate: bundle.events.length > 0 ? new Date(bundle.events[bundle.events.length - 1].timestamp) : null,
      },
    });

    return {
      datasetId: newDataset.id,
      totalEvents: bundle.events.length,
    };
  }
}
