import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Prisma } from '@prisma/client';

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he',
  'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
  'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
  'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'are', 'was', 'were', 'been', 'has', 'had', 'did', 'does', 'am', 'pm', 'ok', 'okay', 'yes', 'yeah', 'hey', 'hi', 'hello'
]);

const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getDataset(id: string) {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id },
      include: {
        metrics: true,
      },
    });

    if (!dataset) {
      throw new NotFoundException(`Dataset with ID ${id} not found`);
    }

    return dataset;
  }

  async getTimeline(
    datasetId: string,
    interval: 'day' | 'week' | 'month' | 'hour' = 'day',
    filters?: {
      startDate?: string;
      endDate?: string;
      actor?: string;
      search?: string;
    },
  ) {
    const validIntervals = ['day', 'week', 'month', 'hour'];
    const selectedInterval = validIntervals.includes(interval) ? interval : 'day';

    const datasetExists = await this.prisma.dataset.count({ where: { id: datasetId } });
    if (!datasetExists) {
      throw new NotFoundException(`Dataset ${datasetId} not found`);
    }

    const startDate = filters?.startDate ? new Date(filters.startDate) : null;
    const endDate = filters?.endDate ? new Date(filters.endDate) : null;
    const actor = filters?.actor || null;

    const events = await this.prisma.timelineEvent.findMany({
      where: {
        datasetId,
        timestamp: {
          gte: startDate || undefined,
          lte: endDate || undefined,
        },
        actor: actor || undefined,
        content: filters?.search ? { contains: filters.search } : undefined,
      },
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    const bucketMap = new Map<string, number>();
    for (const ev of events) {
      const d = new Date(ev.timestamp);
      let key = d.toISOString().slice(0, 10);
      if (selectedInterval === 'month') {
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      } else if (selectedInterval === 'week') {
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setUTCDate(diff));
        key = monday.toISOString().slice(0, 10);
      } else if (selectedInterval === 'hour') {
        key = `${d.toISOString().slice(0, 13)}:00:00.000Z`;
      }
      bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
    }

    return Array.from(bucketMap.entries()).map(([bucket, count]) => ({
      bucket: new Date(bucket).toISOString(),
      count,
    }));
  }

  async getEvents(
    datasetId: string,
    params: {
      cursor?: string;
      limit?: number;
      startDate?: string;
      endDate?: string;
      search?: string;
      word?: string;
      actor?: string;
      order?: 'asc' | 'desc';
    },
  ) {
    const limit = Math.min(Math.max(1, params.limit ? Number(params.limit) : 50), 100);
    const order = params.order === 'desc' ? 'desc' : 'asc';

    const where: Prisma.TimelineEventWhereInput = {
      datasetId,
    };

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = new Date(params.startDate);
      if (params.endDate) where.timestamp.lte = new Date(params.endDate);
    }

    if (params.actor) {
      where.actor = params.actor;
    }

    const term = params.search || params.word;
    if (term) {
      where.content = {
        contains: term,
      };
    }

    const [totalMatching, rawItems] = await Promise.all([
      this.prisma.timelineEvent.count({ where }),
      this.prisma.timelineEvent.findMany({
        where,
        take: limit + 1,
        cursor: params.cursor ? { id: params.cursor } : undefined,
        skip: params.cursor ? 1 : 0,
        orderBy: { timestamp: order },
      }),
    ]);

    const hasNext = rawItems.length > limit;
    const events = hasNext ? rawItems.slice(0, limit) : rawItems;
    const nextCursor = hasNext ? events[events.length - 1].id : null;

    return {
      events,
      nextCursor,
      totalMatching,
    };
  }

  async getFrequencies(datasetId: string) {
    const cacheKey = `dataset:${datasetId}:frequencies`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const dataset = await this.prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) {
      throw new NotFoundException(`Dataset ${datasetId} not found`);
    }

    this.logger.log(`Computing word & emoji frequencies for dataset ${datasetId}...`);
    const startTime = Date.now();

    const wordCounts: Record<string, number> = {};
    const emojiCounts: Record<string, number> = {};
    let totalWords = 0;
    let totalEmojis = 0;

    let skip = 0;
    const batchSize = 10000;
    let hasMore = true;

    while (hasMore) {
      const rows = await this.prisma.timelineEvent.findMany({
        where: { datasetId },
        select: { content: true },
        skip,
        take: batchSize,
      });

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        if (!row.content) continue;

        // 1. Emojis
        const emojis = row.content.match(EMOJI_REGEX);
        if (emojis) {
          for (const emoji of emojis) {
            totalEmojis++;
            emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
          }
        }

        // 2. Words
        const words = row.content
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/);

        for (const w of words) {
          if (w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w)) {
            totalWords++;
            wordCounts[w] = (wordCounts[w] || 0) + 1;
          }
        }
      }

      skip += rows.length;
      if (rows.length < batchSize) {
        hasMore = false;
      }
    }

    const topWords = Object.entries(wordCounts)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    const topEmojis = Object.entries(emojiCounts)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const result = {
      datasetId,
      totalWords,
      totalEmojis,
      words: topWords,
      emojis: topEmojis,
      computedInMs: Date.now() - startTime,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 86400);

    return result;
  }
}
