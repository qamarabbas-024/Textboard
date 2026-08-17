import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { DatasetsService } from './datasets.service';

@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Get(':id')
  async getDataset(@Param('id') id: string) {
    return this.datasetsService.getDataset(id);
  }

  @Get(':id/timeline')
  async getTimeline(
    @Param('id') id: string,
    @Query('interval') interval?: 'day' | 'week' | 'month' | 'hour',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('actor') actor?: string,
    @Query('search') search?: string,
  ) {
    return this.datasetsService.getTimeline(id, interval, {
      startDate,
      endDate,
      actor,
      search,
    });
  }

  @Get(':id/events')
  async getEvents(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('word') word?: string,
    @Query('actor') actor?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.datasetsService.getEvents(id, {
      cursor,
      limit: limit ? parseInt(limit, 10) : 50,
      startDate,
      endDate,
      search,
      word,
      actor,
      order,
    });
  }

  @Get(':id/frequencies')
  async getFrequencies(@Param('id') id: string) {
    return this.datasetsService.getFrequencies(id);
  }
}
