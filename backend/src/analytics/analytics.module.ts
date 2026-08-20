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
  ],
  exports: [
    AnalyticsEngineService,
    MessageAnalyticsService,
    EmojiAnalyticsService,
    ActivityAnalyticsService,
    TextAnalyticsService,
    InsightsGeneratorService,
  ],
})
export class AnalyticsModule {}
