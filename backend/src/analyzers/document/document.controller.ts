import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DocumentParserService } from './document-parser.service';

@Controller('analyzers/document')
export class DocumentController {
  constructor(private readonly parserService: DocumentParserService) {}

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
    }),
  )
  async uploadDocuments(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No document files provided');
    }

    return this.parserService.processDocuments(
      files.map((f) => ({
        buffer: f.buffer,
        originalname: f.originalname,
      })),
    );
  }
}
