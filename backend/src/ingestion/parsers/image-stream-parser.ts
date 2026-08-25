import { Injectable, Logger } from '@nestjs/common';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';

@Injectable()
export class ImageStreamParser implements IStreamParser {
  private readonly logger = new Logger(ImageStreamParser.name);
  readonly formatId = 'image-media';
  readonly name = 'Image Media Attachment & Metadata Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return (
      ext === 'png' ||
      ext === 'jpg' ||
      ext === 'jpeg' ||
      ext === 'webp' ||
      ext === 'gif' ||
      ext === 'bmp' ||
      mimeType.startsWith('image/')
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (context.signal?.aborted) {
        this.logger.warn(`Image parser aborted for job ${context.jobId}`);
        return;
      }
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const fullBuffer = Buffer.concat(chunks);
    const byteSize = fullBuffer.length;
    const ext = context.filename.split('.').pop()?.toLowerCase() || 'image';

    // Extract basic dimension hints if available in headers
    let width = 0;
    let height = 0;

    // PNG dimension extraction from IHDR chunk
    if (fullBuffer.length > 24 && fullBuffer.toString('ascii', 1, 4) === 'PNG') {
      width = fullBuffer.readUInt32BE(16);
      height = fullBuffer.readUInt32BE(20);
    } else if (fullBuffer.length > 30 && fullBuffer[0] === 0xff && fullBuffer[1] === 0xd8) {
      // JPEG dimension extraction
      for (let i = 2; i < fullBuffer.length - 8; i++) {
        if (fullBuffer[i] === 0xff && (fullBuffer[i + 1] === 0xc0 || fullBuffer[i + 1] === 0xc2)) {
          height = fullBuffer.readUInt16BE(i + 5);
          width = fullBuffer.readUInt16BE(i + 7);
          break;
        }
      }
    }

    const dimStr = width > 0 && height > 0 ? ` (${width}x${height}px)` : '';
    const sizeKb = (byteSize / 1024).toFixed(1);

    yield {
      timestamp: new Date(),
      actor: 'Media Attachment',
      content: `[Photo: ${context.filename}] ${ext.toUpperCase()} image${dimStr}, ${sizeKb} KB`,
      eventType: 'media_attachment',
      metadata: {
        filename: context.filename,
        format: ext,
        byteSize,
        width: width || undefined,
        height: height || undefined,
      },
      urls: [],
      emojis: ['📷'],
      hasMedia: true,
    };

    this.logger.log(`Completed image stream parse for ${context.filename} (${sizeKb} KB)`);
  }
}
