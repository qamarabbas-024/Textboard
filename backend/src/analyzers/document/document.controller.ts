import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { DocumentParserService } from './document-parser.service';
import {
  documentMulterOptions,
  UPLOAD_LIMITS,
} from '../../common/upload.config';

@Controller('analyzers/document')
export class DocumentController {
  constructor(private readonly parserService: DocumentParserService) {}

  @Post('upload')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(
    FilesInterceptor(
      'files',
      UPLOAD_LIMITS.DOCUMENT_MAX_FILES,
      documentMulterOptions,
    ),
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
