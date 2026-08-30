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
import { AnomalyDetectorService } from './services/anomaly-detector.service';
import { CrossCorrelatorService } from './services/cross-correlator.service';
import { ClusteringEngineService } from './services/clustering-engine.service';
import { ThreadReconstructorService } from './services/thread-reconstructor.service';
import { LocalAssistantService } from './services/local-assistant.service';
import { AudioForensicsService } from './services/audio-forensics.service';
import { GeoIntelligenceService } from './services/geo-intelligence.service';
import { EmotionRadarService } from './services/emotion-radar.service';
import { BehavioralProfilerService } from './services/behavioral-profiler.service';

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
    AnomalyDetectorService,
    CrossCorrelatorService,
    ClusteringEngineService,
    ThreadReconstructorService,
    LocalAssistantService,
    AudioForensicsService,
    GeoIntelligenceService,
    EmotionRadarService,
    BehavioralProfilerService,
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
    AnomalyDetectorService,
    CrossCorrelatorService,
    ClusteringEngineService,
    ThreadReconstructorService,
    LocalAssistantService,
    AudioForensicsService,
    GeoIntelligenceService,
    EmotionRadarService,
    BehavioralProfilerService,
  ],
})
export class AnalyticsModule {}



