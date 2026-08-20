import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NormalizedEvent } from './types';

@Injectable()
export class BatchedSinkService {
  private readonly logger = new Logger(BatchedSinkService.name);

  constructor(private readonly prisma: PrismaService) {}

  async persistBatch(
    datasetId: string,
    events: NormalizedEvent[],
  ): Promise<{ inserted: number }> {
    if (!events || events.length === 0) {
      return { inserted: 0 };
    }

    const startTime = Date.now();

    // 1. Calculate aggregate stats for this batch
    let batchMinDate = events[0].timestamp;
    let batchMaxDate = events[0].timestamp;
    const entityStats = new Map<
      string,
      { count: number; chars: number; minDate: Date; maxDate: Date }
    >();

    for (const ev of events) {
      if (ev.timestamp < batchMinDate) batchMinDate = ev.timestamp;
      if (ev.timestamp > batchMaxDate) batchMaxDate = ev.timestamp;

      if (ev.entityId) {
        const cur = entityStats.get(ev.entityId) || {
          count: 0,
          chars: 0,
          minDate: ev.timestamp,
          maxDate: ev.timestamp,
        };
        cur.count++;
        cur.chars += ev.charLength;
        if (ev.timestamp < cur.minDate) cur.minDate = ev.timestamp;
        if (ev.timestamp > cur.maxDate) cur.maxDate = ev.timestamp;
        entityStats.set(ev.entityId, cur);
      }
    }

    // 2. Perform bulk insertion and dataset updates
    await this.prisma.$transaction(async (tx) => {
      // A. Bulk insert events
      await tx.timelineEvent.createMany({
        data: events.map((e) => ({
          id: e.id,
          datasetId: e.datasetId,
          sourceFileId: e.sourceFileId,
          entityId: e.entityId,
          actor: e.actor || e.actorName,
          actorName: e.actorName || e.actor,
          timestamp: e.timestamp,
          rawTimestamp: e.rawTimestamp,
          sequenceNum: e.sequenceNum,
          content: e.content,
          eventType: e.eventType,
          charLength: e.charLength,
          wordCount: e.wordCount,
          hasUrls: e.hasUrls,
          hasEmojis: e.hasEmojis,
          hasMedia: e.hasMedia,
          metadata: e.metadata,
        })),
      });

      // B. Update Dataset total count & bounds
      const dataset = await tx.dataset.findUnique({ where: { id: datasetId } });
      if (dataset) {
        const newStartDate =
          !dataset.startDate || batchMinDate < dataset.startDate
            ? batchMinDate
            : dataset.startDate;
        const newEndDate =
          !dataset.endDate || batchMaxDate > dataset.endDate
            ? batchMaxDate
            : dataset.endDate;

        await tx.dataset.update({
          where: { id: datasetId },
          data: {
            totalEvents: dataset.totalEvents + events.length,
            startDate: newStartDate,
            endDate: newEndDate,
          },
        });
      }

      // C. Update or create DatasetEntity links
      for (const [entityId, stats] of entityStats.entries()) {
        const existing = await tx.datasetEntity.findUnique({
          where: {
            datasetId_entityId: {
              datasetId,
              entityId,
            },
          },
        });

        if (existing) {
          const minD =
            !existing.firstActive || stats.minDate < existing.firstActive
              ? stats.minDate
              : existing.firstActive;
          const maxD =
            !existing.lastActive || stats.maxDate > existing.lastActive
              ? stats.maxDate
              : existing.lastActive;

          await tx.datasetEntity.update({
            where: {
              datasetId_entityId: {
                datasetId,
                entityId,
              },
            },
            data: {
              eventCount: existing.eventCount + stats.count,
              totalChars: existing.totalChars + stats.chars,
              firstActive: minD,
              lastActive: maxD,
            },
          });
        } else {
          await tx.datasetEntity.create({
            data: {
              datasetId,
              entityId,
              eventCount: stats.count,
              totalChars: stats.chars,
              firstActive: stats.minDate,
              lastActive: stats.maxDate,
            },
          });
        }
      }
    });

    const elapsed = Date.now() - startTime;
    this.logger.debug(
      `Batch of ${events.length} records written in ${elapsed}ms for dataset ${datasetId}`,
    );

    return { inserted: events.length };
  }
}
