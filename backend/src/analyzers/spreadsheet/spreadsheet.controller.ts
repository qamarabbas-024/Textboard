import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { SpreadsheetParserService } from './spreadsheet-parser.service';
import { spreadsheetMulterOptions } from '../../common/upload.config';

@Controller('analyzers/spreadsheet')
export class SpreadsheetController {
  constructor(private readonly parserService: SpreadsheetParserService) {}

  @Post('upload')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', spreadsheetMulterOptions))
  async uploadSpreadsheet(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.parserService.processSpreadsheet(
      file.buffer,
      file.originalname,
    );
  }
}
