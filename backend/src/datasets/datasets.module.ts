import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { DatasetsAnalyticsService } from './datasets-analytics.service';

@Module({
  controllers: [DatasetsController],
  providers: [DatasetsService, DatasetsAnalyticsService],
  exports: [DatasetsService, DatasetsAnalyticsService],
})
export class DatasetsModule {}
