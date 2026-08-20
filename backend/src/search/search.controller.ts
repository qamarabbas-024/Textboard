import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchParams } from './search.types';

@Controller('api/v1')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Global multi-dataset search endpoint.
   */
  @Get('search')
  async globalSearch(@Query() params: SearchParams) {
    return this.searchService.search(params);
  }

  /**
   * Scoped search within a specific dataset.
   */
  @Get('datasets/:datasetId/search')
  async scopedDatasetSearch(
    @Param('datasetId') datasetId: string,
    @Query() params: SearchParams,
  ) {
    return this.searchService.search({
      ...params,
      datasetId,
    });
  }

  /**
   * Advanced search using JSON query payload.
   */
  @Post('search/query')
  async advancedSearch(@Body() body: SearchParams) {
    return this.searchService.search(body);
  }
}
