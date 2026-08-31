import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AnalyticsEngineService } from './analytics-engine.service';
import { CrossCorrelatorService } from './services/cross-correlator.service';
import { LocalAssistantService } from './services/local-assistant.service';
import { EntityIntelligenceService } from './services/entity-intelligence.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsEngine: AnalyticsEngineService,
    private readonly crossCorrelator: CrossCorrelatorService,
    private readonly assistantService: LocalAssistantService,
    private readonly entityIntelligence: EntityIntelligenceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 100% On-Device Natural Language Query Assistant.
   */
  @Post(':datasetId/assistant/ask')
  async askAssistant(
    @Param('datasetId') datasetId: string,
    @Body('prompt') prompt: string,
  ) {
    return this.assistantService.askQuestion(datasetId, prompt || '');
  }

  /**
   * Cross-dataset multi-stream correlation and overlap analysis.
   */
  @Get('correlate/compare')
  async correlateDatasets(
    @Query('datasetA') datasetA: string,
    @Query('datasetB') datasetB: string,
  ) {
    return this.crossCorrelator.correlateDatasets(datasetA, datasetB);
  }

  /**
   * Get complete multi-dimensional analytics report and insights.
   */
  @Get(':datasetId')
  async getFullAnalytics(
    @Param('datasetId') datasetId: string,
    @Query('refresh') refresh?: string,
  ) {
    const forceRefresh = refresh === 'true' || refresh === '1';
    return this.analyticsEngine.getDatasetAnalytics(datasetId, forceRefresh);
  }

  /**
   * Alias endpoint for complete dataset analytics summary.
   */
  @Get(':datasetId/summary')
  async getDatasetSummary(
    @Param('datasetId') datasetId: string,
    @Query('refresh') refresh?: string,
  ) {
    const forceRefresh = refresh === 'true' || refresh === '1';
    return this.analyticsEngine.getDatasetAnalytics(datasetId, forceRefresh);
  }

  /**
   * Get message volume and author distribution metrics.
   */
  @Get(':datasetId/messages')
  async getMessageAnalytics(@Param('datasetId') datasetId: string) {
    const full = await this.analyticsEngine.getDatasetAnalytics(datasetId);
    return full.messageAnalytics;
  }

  /**
   * Get emoji usage, participant breakdown, and timeline trends.
   */
  @Get(':datasetId/emojis')
  async getEmojiAnalytics(@Param('datasetId') datasetId: string) {
    const full = await this.analyticsEngine.getDatasetAnalytics(datasetId);
    return full.emojiAnalytics;
  }

  /**
   * Get streaks, active days, peak hours, and response time metrics.
   */
  @Get(':datasetId/activity')
  async getActivityAnalytics(@Param('datasetId') datasetId: string) {
    const full = await this.analyticsEngine.getDatasetAnalytics(datasetId);
    return full.activityAnalytics;
  }

  /**
   * Get word frequencies, common phrases, URLs, and mentions.
   */
  @Get(':datasetId/text')
  async getTextAnalytics(@Param('datasetId') datasetId: string) {
    const full = await this.analyticsEngine.getDatasetAnalytics(datasetId);
    return full.textAnalytics;
  }

  /**
   * Get deterministic insights with traceable supporting data.
   */
  @Get(':datasetId/insights')
  async getInsights(@Param('datasetId') datasetId: string) {
    const full = await this.analyticsEngine.getDatasetAnalytics(datasetId);
    return {
      datasetId,
      insights: full.insights,
      computedAt: full.computedAt,
    };
  }

  /**
   * Get "On This Day" historical memory retrospective.
   */
  @Get(':datasetId/on-this-day')
  async getOnThisDay(@Param('datasetId') datasetId: string) {
    return this.analyticsEngine.getOnThisDay(datasetId);
  }

  /**
   * Get pairwise relationship dynamics, initiation counts, and response latency.
   */
  @Get(':datasetId/relationships')
  async getRelationships(@Param('datasetId') datasetId: string) {
    return this.analyticsEngine.getRelationships(datasetId);
  }

  /**
   * Get forensic communication anomalies and security alerts.
   */
  @Get(':datasetId/anomalies')
  async getAnomalies(@Param('datasetId') datasetId: string) {
    return this.analyticsEngine.getAnomalies(datasetId);
  }

  /**
   * Get thematic topic clusters and keyword co-occurrences.
   */
  @Get(':datasetId/topics')
  async getTopicClusters(@Param('datasetId') datasetId: string) {
    return this.analyticsEngine.getTopicClusters(datasetId);
  }

  /**
   * Get reconstructed conversational threads from chat stream.
   */
  @Get(':datasetId/threads')
  async getThreads(@Param('datasetId') datasetId: string) {
    return this.analyticsEngine.getReconstructedThreads(datasetId);
  }

  /**
   * Get geographic pinpoint locations, clusters, and movement routes.
   */
  @Get(':datasetId/geo')
  async getGeoIntelligence(@Param('datasetId') datasetId: string) {
    return this.analyticsEngine.getGeoIntelligence(datasetId);
  }

  /**
   * Get extracted forensic entities: crypto wallets, IPs, financial accounts, and telecom prefixes.
   */
  @Get(':datasetId/entities')
  async getEntityIntelligence(@Param('datasetId') datasetId: string) {
    const events = await this.prisma.timelineEvent.findMany({
      where: { datasetId },
      select: { id: true, actor: true, content: true, timestamp: true },
      take: 10000,
    });

    return this.entityIntelligence.scanDatasetEntities(events);
  }

  /**
   * Invalidate cache and force recompute all analytics.
   */
  @Post(':datasetId/refresh')
  async refreshAnalytics(@Param('datasetId') datasetId: string) {
    return this.analyticsEngine.getDatasetAnalytics(datasetId, true);
  }
}


