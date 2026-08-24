import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { QueryParserService } from './query-parser.service';
import { SemanticVectorService } from './semantic-vector.service';
import { SemanticSearchService } from './semantic-search.service';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService, QueryParserService, SemanticVectorService, SemanticSearchService],
  exports: [SearchService, QueryParserService, SemanticVectorService, SemanticSearchService],
})
export class SearchModule {}
