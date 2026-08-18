import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { TextChatParserService } from './text-chat-parser.service';
import { PrismaService } from '../../prisma/prisma.service';
import { textChatMulterOptions } from '../../common/upload.config';
import { Readable } from 'stream';

@Controller('analyzers/text-chat')
export class TextChatController {
  constructor(
    private readonly parserService: TextChatParserService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('upload')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', textChatMulterOptions))
  async uploadFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const readable = new Readable();
    readable.push(file.buffer);
    readable.push(null);

    const datasetName = file.originalname || `Chat Export ${new Date().toISOString()}`;
    const result = await this.parserService.processChatExport(readable, datasetName);

    return result;
  }

  @Get('dataset/:id')
  async getDatasetSummary(@Param('id') id: string) {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id },
      include: {
        metrics: true,
      },
    });

    if (!dataset) {
      throw new BadRequestException('Dataset not found');
    }

    return dataset;
  }
}
