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
import { TextChatParserService } from './text-chat-parser.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Readable } from 'stream';

@Controller('analyzers/text-chat')
export class TextChatController {
  constructor(
    private readonly parserService: TextChatParserService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        const isTxt =
          file.originalname.toLowerCase().endsWith('.txt') ||
          file.mimetype === 'text/plain';
        if (!isTxt) {
          return callback(
            new BadRequestException(
              'Invalid file type. Only plain text (.txt) exports are supported.',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
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
