import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { QueryParserService } from './query-parser.service';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService, QueryParserService],
  exports: [SearchService, QueryParserService],
})
export class SearchModule {}
