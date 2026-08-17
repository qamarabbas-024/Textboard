import { Module } from '@nestjs/common';
import { SpreadsheetController } from './spreadsheet.controller';
import { SpreadsheetParserService } from './spreadsheet-parser.service';

@Module({
  controllers: [SpreadsheetController],
  providers: [SpreadsheetParserService],
  exports: [SpreadsheetParserService],
})
export class SpreadsheetModule {}
