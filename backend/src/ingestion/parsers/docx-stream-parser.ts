import { Injectable, Logger } from '@nestjs/common';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import * as mammoth from 'mammoth';
import { extractUrls, extractEmojis } from './parser-utils';

@Injectable()
export class DocxStreamParser implements IStreamParser {
  private readonly logger = new Logger(DocxStreamParser.name);
  readonly formatId = 'docx';
  readonly name = 'Microsoft Word (DOCX) Stream Parser';

  canHandle(mimeType: string, filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return (
      ext === 'docx' ||
      mimeType.includes('wordprocessingml') ||
      mimeType.includes('officedocument')
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (context.signal?.aborted) {
        this.logger.warn(`DOCX parser aborted for job ${context.jobId}`);
        return;
      }
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const fullBuffer = Buffer.concat(chunks);
    let extractedText = '';

    try {
      const result = await mammoth.extractRawText({ buffer: fullBuffer });
      extractedText = result.value;
      if (result.messages && result.messages.length > 0) {
        this.logger.debug(`Mammoth warnings for ${context.filename}: ${JSON.stringify(result.messages)}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to parse DOCX file ${context.filename}: ${err.message}`);
      yield {
        timestamp: new Date(),
        actor: 'Document Engine',
        content: `Error parsing DOCX: ${err.message}`,
        eventType: 'document_error',
        metadata: { filename: context.filename, error: err.message },
      };
      return;
    }

    // Split text into coherent paragraphs
    const paragraphs = extractedText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    let recordsYielded = 0;
    const baseDate = new Date();

    for (let i = 0; i < paragraphs.length; i++) {
      if (context.signal?.aborted) {
        this.logger.warn(`DOCX parser aborted during paragraph emission`);
        break;
      }

      const para = paragraphs[i];
      // Increment timestamp slightly per paragraph to preserve chronological sequence
      const paraTime = new Date(baseDate.getTime() + i * 1000);

      yield {
        timestamp: paraTime,
        actor: context.filename.replace(/\.docx$/i, ''),
        content: para,
        eventType: 'document_paragraph',
        metadata: {
          filename: context.filename,
          paragraphIndex: i + 1,
          totalParagraphs: paragraphs.length,
        },
        urls: extractUrls(para),
        emojis: extractEmojis(para),
        hasMedia: para.toLowerCase().includes('[image]') || para.toLowerCase().includes('figure'),
      };

      recordsYielded++;
      if (recordsYielded % 100 === 0 && context.onProgress) {
        context.onProgress(0, recordsYielded);
      }
    }

    this.logger.log(`Completed DOCX parse: paragraphs=${recordsYielded}`);
  }
}
