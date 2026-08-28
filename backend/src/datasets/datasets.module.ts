import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { DatasetsAnalyticsService } from './datasets-analytics.service';
import { DatasetMergerService } from './dataset-merger.service';
import { DeduplicationService } from './deduplication.service';

@Module({
  controllers: [DatasetsController],
  providers: [DatasetsService, DatasetsAnalyticsService, DatasetMergerService, DeduplicationService],
  exports: [DatasetsService, DatasetsAnalyticsService, DatasetMergerService, DeduplicationService],
})
export class DatasetsModule {}
