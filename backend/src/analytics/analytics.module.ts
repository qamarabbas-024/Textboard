import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEngineService } from './analytics-engine.service';
import { MessageAnalyticsService } from './services/message-analytics.service';
import { EmojiAnalyticsService } from './services/emoji-analytics.service';
import { ActivityAnalyticsService } from './services/activity-analytics.service';
import { TextAnalyticsService } from './services/text-analytics.service';
import { InsightsGeneratorService } from './services/insights-generator.service';
import { OnThisDayService } from './services/on-this-day.service';
import { RelationshipMatrixService } from './services/relationship-matrix.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsEngineService,
    MessageAnalyticsService,
    EmojiAnalyticsService,
    ActivityAnalyticsService,
    TextAnalyticsService,
    InsightsGeneratorService,
    OnThisDayService,
    RelationshipMatrixService,
  ],
  exports: [
    AnalyticsEngineService,
    MessageAnalyticsService,
    EmojiAnalyticsService,
    ActivityAnalyticsService,
    TextAnalyticsService,
    InsightsGeneratorService,
    OnThisDayService,
    RelationshipMatrixService,
  ],
})
export class AnalyticsModule {}
