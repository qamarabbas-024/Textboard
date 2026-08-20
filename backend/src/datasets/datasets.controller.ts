import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { DatasetsAnalyticsService } from './datasets-analytics.service';

@Controller('api/v1/datasets')
export class DatasetsController {
  constructor(
    private readonly datasetsService: DatasetsService,
    private readonly analyticsService: DatasetsAnalyticsService,
  ) {}

  @Get()
  async listDatasets() {
    return this.datasetsService.listDatasets();
  }

  @Delete(':id')
  async deleteDataset(@Param('id') id: string) {
    return this.datasetsService.deleteDataset(id);
  }

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

  @Get(':id/highlights')
  async getHighlights(@Param('id') id: string) {
    return this.analyticsService.getHighlights(id);
  }

  @Get(':id/first-occurrence')
  async getFirstOccurrence(
    @Param('id') id: string,
    @Query('keyword') keyword: string,
  ) {
    return this.analyticsService.getFirstOccurrence(id, keyword);
  }

  @Get(':id/people')
  async getPeopleStats(@Param('id') id: string) {
    return this.analyticsService.getPeopleStats(id);
  }

  @Get(':id/streaks')
  async getStreaks(@Param('id') id: string) {
    return this.analyticsService.getStreaks(id);
  }

  @Get(':id/milestones')
  async getMilestones(@Param('id') id: string) {
    return this.analyticsService.getMilestones(id);
  }

  @Get(':id/on-this-day')
  async getOnThisDay(
    @Param('id') id: string,
    @Query('month') month?: string,
    @Query('day') day?: string,
  ) {
    return this.analyticsService.getOnThisDay(
      id,
      month ? parseInt(month, 10) : undefined,
      day ? parseInt(day, 10) : undefined,
    );
  }

  @Get(':id/random-memory')
  async getRandomMemory(@Param('id') id: string) {
    return this.analyticsService.getRandomMemory(id);
  }

  @Get(':id/compare')
  async comparePeople(
    @Param('id') id: string,
    @Query('actorA') actorA: string,
    @Query('actorB') actorB: string,
  ) {
    return this.analyticsService.comparePeople(id, actorA, actorB);
  }
}
