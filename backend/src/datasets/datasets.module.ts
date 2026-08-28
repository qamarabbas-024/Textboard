import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { DatasetsAnalyticsService } from './datasets-analytics.service';
import { DatasetMergerService } from './dataset-merger.service';

@Module({
  controllers: [DatasetsController],
  providers: [DatasetsService, DatasetsAnalyticsService, DatasetMergerService],
  exports: [DatasetsService, DatasetsAnalyticsService, DatasetMergerService],
})
export class DatasetsModule {}
