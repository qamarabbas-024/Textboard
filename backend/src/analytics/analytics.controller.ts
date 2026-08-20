import {
  Controller,
  Get,
  Post,
  Param,
  Query,
} from '@nestjs/common';
import { AnalyticsEngineService } from './analytics-engine.service';

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsEngine: AnalyticsEngineService) {}

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
   * Invalidate cache and force recompute all analytics.
   */
  @Post(':datasetId/refresh')
  async refreshAnalytics(@Param('datasetId') datasetId: string) {
    return this.analyticsEngine.getDatasetAnalytics(datasetId, true);
  }
}
