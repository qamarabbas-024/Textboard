import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MessageAnalyticsService, EventSummaryRow } from './services/message-analytics.service';
import { EmojiAnalyticsService } from './services/emoji-analytics.service';
import { ActivityAnalyticsService } from './services/activity-analytics.service';
import { TextAnalyticsService } from './services/text-analytics.service';
import { InsightsGeneratorService } from './services/insights-generator.service';
import { OnThisDayService } from './services/on-this-day.service';
import { RelationshipMatrixService } from './services/relationship-matrix.service';
import { AnomalyDetectorService, AnomalyReport } from './services/anomaly-detector.service';
import { ClusteringEngineService, TopicClusteringReport } from './services/clustering-engine.service';
import { ThreadReconstructorService, ThreadReconstructionReport } from './services/thread-reconstructor.service';
import { FullDatasetAnalytics, OnThisDayMemory, RelationshipPair } from './analytics.types';

@Injectable()
export class AnalyticsEngineService {
  private readonly logger = new Logger(AnalyticsEngineService.name);
  private readonly memoryCache = new Map<string, { data: FullDatasetAnalytics; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly messageAnalytics: MessageAnalyticsService,
    private readonly emojiAnalytics: EmojiAnalyticsService,
    private readonly activityAnalytics: ActivityAnalyticsService,
    private readonly textAnalytics: TextAnalyticsService,
    private readonly insightsGenerator: InsightsGeneratorService,
    private readonly onThisDayService: OnThisDayService,
    private readonly relationshipMatrixService: RelationshipMatrixService,
    private readonly anomalyDetector: AnomalyDetectorService,
    private readonly clusteringEngine: ClusteringEngineService,
    private readonly threadReconstructor: ThreadReconstructorService,
  ) {}

  /**
   * Computes full analytics for a given dataset using normalized SQLite records.
   * Leverages chunked batch fetching (25,000 rows per batch) to keep memory flat.
   */
  async getDatasetAnalytics(datasetId: string, forceRefresh = false): Promise<FullDatasetAnalytics> {
    const cacheKey = `dataset:${datasetId}:full_analytics_v1`;

    // 1. Check Redis / Memory cache
    if (!forceRefresh) {
      const cachedRedis = await this.redis.get(cacheKey);
      if (cachedRedis) {
        try {
          return JSON.parse(cachedRedis);
        } catch {
          // Fall through
        }
      }

      const mem = this.memoryCache.get(cacheKey);
      if (mem && mem.expiresAt > Date.now()) {
        return mem.data;
      }
    }

    const dataset = await this.prisma.dataset.findUnique({
      where: { id: datasetId },
    });
    if (!dataset) {
      throw new NotFoundException(`Dataset ${datasetId} not found`);
    }

    const startTime = Date.now();
    this.logger.log(`Starting full analytics computation for dataset ${datasetId} (${dataset.name})...`);

    // 2. Fetch all normalized events in memory-safe batches
    const events: EventSummaryRow[] = [];
    const batchSize = 25000;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const rows = await this.prisma.timelineEvent.findMany({
        where: { datasetId },
        select: {
          id: true,
          actor: true,
          timestamp: true,
          content: true,
          charLength: true,
          wordCount: true,
          eventType: true,
        },
        orderBy: { timestamp: 'asc' },
        skip,
        take: batchSize,
      });

      if (rows.length === 0) break;
      for (let i = 0; i < rows.length; i++) {
        events.push(rows[i]);
      }

      skip += rows.length;
      if (rows.length < batchSize) {
        hasMore = false;
      }
    }

    this.logger.log(`Loaded ${events.length} events for dataset ${datasetId}. Running analyzers...`);

    // 3. Run individual modular analyzers
    const messageStats = this.messageAnalytics.computeMessageAnalytics(events);
    const emojiStats = this.emojiAnalytics.computeEmojiAnalytics(events);
    const activityStats = this.activityAnalytics.computeActivityAnalytics(events);
    const textStats = this.textAnalytics.computeTextAnalytics(events);
    const onThisDayMemories = this.onThisDayService.computeMemories(events);
    const relationships = this.relationshipMatrixService.computeRelationships(events);
    const anomalies = this.anomalyDetector.detectAnomalies(datasetId, events);

    // 4. Generate deterministic, traceable insights
    const insights = this.insightsGenerator.generateInsights(
      messageStats,
      emojiStats,
      activityStats,
      textStats,
    );

    const elapsed = Date.now() - startTime;
    this.logger.log(`Analytics computation completed for ${datasetId} in ${elapsed}ms`);

    const result: FullDatasetAnalytics = {
      datasetId,
      datasetName: dataset.name,
      sourceType: dataset.sourceType,
      messageAnalytics: messageStats,
      emojiAnalytics: emojiStats,
      activityAnalytics: activityStats,
      textAnalytics: textStats,
      insights,
      anomalies,
      onThisDay: onThisDayMemories,
      relationships,
      computedAt: new Date(),
      executionTimeMs: elapsed,
    };

    // 5. Store in Cache (1 hour TTL)
    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    this.memoryCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + 3600 * 1000,
    });

    // 6. Asynchronously persist top highlights & metrics in DB
    this.persistAggregates(datasetId, result).catch((err) => {
      this.logger.warn(`Failed to persist aggregate metrics for dataset ${datasetId}: ${err.message}`);
    });

    return result;
  }

  /**
   * Directly get forensic anomalies detected in a dataset.
   */
  async getAnomalies(datasetId: string): Promise<AnomalyReport> {
    const full = await this.getDatasetAnalytics(datasetId);
    return (
      full.anomalies || {
        datasetId,
        totalAnomalies: 0,
        criticalCount: 0,
        warningCount: 0,
        noteCount: 0,
        anomalies: [],
        computedAt: new Date().toISOString(),
      }
    );
  }

  /**
   * Directly get thematic topic clusters for a dataset.
   */
  async getTopicClusters(datasetId: string): Promise<TopicClusteringReport> {
    const events = await this.prisma.timelineEvent.findMany({
      where: { datasetId },
      select: {
        id: true,
        actor: true,
        timestamp: true,
        content: true,
        charLength: true,
        wordCount: true,
        eventType: true,
      },
      orderBy: { timestamp: 'asc' },
      take: 20000,
    });

    return this.clusteringEngine.clusterEvents(datasetId, events);
  }

  /**
   * Reconstruct discrete discussion threads from chat stream.
   */
  async getReconstructedThreads(datasetId: string): Promise<ThreadReconstructionReport> {
    const events = await this.prisma.timelineEvent.findMany({
      where: { datasetId },
      select: {
        id: true,
        actor: true,
        timestamp: true,
        content: true,
        charLength: true,
        wordCount: true,
        eventType: true,
      },
      orderBy: { timestamp: 'asc' },
      take: 20000,
    });

    return this.threadReconstructor.reconstructThreads(datasetId, events);
  }

  /**
   * Directly get "On This Day" historical memories for a dataset.
   */
  async getOnThisDay(datasetId: string, targetDate?: Date): Promise<OnThisDayMemory[]> {
    const full = await this.getDatasetAnalytics(datasetId);
    return full.onThisDay || [];
  }

  /**
   * Directly get relationship dynamics for a dataset.
   */
  async getRelationships(datasetId: string): Promise<RelationshipPair[]> {
    const full = await this.getDatasetAnalytics(datasetId);
    return full.relationships || [];
  }

  /**
   * Persists summary metrics to SQLite Metric & Highlight tables.
   */
  private async persistAggregates(datasetId: string, analytics: FullDatasetAnalytics) {
    // Delete existing metrics for clean sync
    await this.prisma.metric.deleteMany({ where: { datasetId } }).catch(() => {});
    await this.prisma.highlight.deleteMany({ where: { datasetId } }).catch(() => {});

    const metricsToCreate = [
      {
        datasetId,
        name: 'total_messages',
        category: 'volume',
        value: analytics.messageAnalytics.totalMessages,
      },
      {
        datasetId,
        name: 'total_words',
        category: 'volume',
        value: analytics.messageAnalytics.totalWords,
      },
      {
        datasetId,
        name: 'total_emojis',
        category: 'emoji',
        value: analytics.emojiAnalytics.totalEmojis,
      },
      {
        datasetId,
        name: 'longest_streak_days',
        category: 'activity',
        value: analytics.activityAnalytics.longestStreak.days,
      },
      {
        datasetId,
        name: 'active_days',
        category: 'activity',
        value: analytics.activityAnalytics.totalActiveDays,
      },
    ];

    await this.prisma.metric.createMany({ data: metricsToCreate }).catch(() => {});

    const highlightsToCreate = analytics.insights.map((ins) => ({
      datasetId,
      title: ins.title,
      description: ins.summary,
      score: ins.confidence,
      metadata: JSON.stringify(ins.supportingData),
    }));

    if (highlightsToCreate.length > 0) {
      await this.prisma.highlight.createMany({ data: highlightsToCreate }).catch(() => {});
    }
  }
}
