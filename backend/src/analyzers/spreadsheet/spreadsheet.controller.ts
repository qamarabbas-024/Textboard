import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpreadsheetParserService } from './spreadsheet-parser.service';

@Controller('analyzers/spreadsheet')
export class SpreadsheetController {
  constructor(private readonly parserService: SpreadsheetParserService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    }),
  )
  async uploadSpreadsheet(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'tsv'].includes(ext || '')) {
      throw new BadRequestException(
        `Invalid file format .${ext}. Only CSV, XLSX, XLS, and TSV files are accepted.`,
      );
    }

    return this.parserService.processSpreadsheet(
      file.buffer,
      file.originalname,
    );
  }
}
