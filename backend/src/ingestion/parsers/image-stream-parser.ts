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
