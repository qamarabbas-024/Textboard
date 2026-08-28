import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MergeDatasetsOptions {
  name: string;
  sourceDatasetIds: string[];
  description?: string;
  tagSources?: boolean;
}

export interface MergeResult {
  mergedDatasetId: string;
  name: string;
  totalEvents: number;
  sourceDatasetsCount: number;
  startDate: Date | null;
  endDate: Date | null;
}

@Injectable()
export class DatasetMergerService {
  private readonly logger = new Logger(DatasetMergerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Merges multiple communication datasets into a unified chronological stream.
   */
  async mergeDatasets(options: MergeDatasetsOptions): Promise<MergeResult> {
    if (!options.sourceDatasetIds || options.sourceDatasetIds.length < 2) {
      throw new BadRequestException('At least 2 source datasets are required for merging.');
    }

    // 1. Verify existence of source datasets
    const sourceDatasets = await this.prisma.dataset.findMany({
      where: { id: { in: options.sourceDatasetIds } },
    });

    if (sourceDatasets.length !== options.sourceDatasetIds.length) {
      throw new NotFoundException('One or more source datasets were not found.');
    }

    this.logger.log(
      `Starting chronological merge of ${sourceDatasets.length} datasets: [${sourceDatasets.map((d) => d.name).join(', ')}]`,
    );

    // 2. Create the unified destination Dataset
    const mergedDataset = await this.prisma.dataset.create({
      data: {
        name: options.name || `Unified Merge (${sourceDatasets.length} Streams)`,
        sourceType: 'federated_merge',
        metadata: JSON.stringify({
          sourceDatasetIds: options.sourceDatasetIds,
          sourceNames: sourceDatasets.map((d) => d.name),
          mergedAt: new Date().toISOString(),
          description: options.description || 'Federated chronological multi-stream merge',
        }),
      },
    });

    // 3. Fetch all events across source datasets in chronological order
    const events = await this.prisma.timelineEvent.findMany({
      where: { datasetId: { in: options.sourceDatasetIds } },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });

    if (events.length === 0) {
      return {
        mergedDatasetId: mergedDataset.id,
        name: mergedDataset.name,
        totalEvents: 0,
        sourceDatasetsCount: sourceDatasets.length,
        startDate: null,
        endDate: null,
      };
    }

    // 4. Batch insert merged timeline events with origin tags
    const chunkSize = 500;
    for (let i = 0; i < events.length; i += chunkSize) {
      const chunk = events.slice(i, i + chunkSize);
      await this.prisma.timelineEvent.createMany({
        data: chunk.map((e, index) => {
          const sourceDs = sourceDatasets.find((d) => d.id === e.datasetId);
          const sourceTag = sourceDs ? sourceDs.name : 'Unknown Stream';
          const newActor = options.tagSources && e.actor
            ? `${e.actor} [${sourceTag}]`
            : e.actor;

          return {
            id: `merged_${mergedDataset.id.slice(0, 8)}_${i + index}`,
            datasetId: mergedDataset.id,
            sourceFileId: e.sourceFileId,
            entityId: e.entityId,
            actor: newActor,
            actorName: newActor,
            timestamp: e.timestamp,
            rawTimestamp: e.rawTimestamp,
            sequenceNum: i + index + 1,
            content: e.content,
            eventType: e.eventType,
            charLength: e.charLength,
            wordCount: e.wordCount,
            hasUrls: e.hasUrls,
            hasEmojis: e.hasEmojis,
            hasMedia: e.hasMedia,
            metadata: JSON.stringify({
              originalDatasetId: e.datasetId,
              originalEventId: e.id,
              sourceStreamName: sourceTag,
            }),
          };
        }),
      });
    }

    const startDate = events[0].timestamp;
    const endDate = events[events.length - 1].timestamp;

    // 5. Update merged dataset bounds
    await this.prisma.dataset.update({
      where: { id: mergedDataset.id },
      data: {
        totalEvents: events.length,
        startDate,
        endDate,
      },
    });

    this.logger.log(
      `✓ Successfully created merged dataset ${mergedDataset.id} with ${events.length.toLocaleString()} events.`,
    );

    return {
      mergedDatasetId: mergedDataset.id,
      name: mergedDataset.name,
      totalEvents: events.length,
      sourceDatasetsCount: sourceDatasets.length,
      startDate,
      endDate,
    };
  }
}
