import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';
import { IStreamParser, ParsedRecord, ParserContext } from '../types';
import { ParserRegistryService } from './parser-registry.service';
import { Readable } from 'stream';

@Injectable()
export class ZipStreamParser implements IStreamParser, OnModuleInit {
  private readonly logger = new Logger(ZipStreamParser.name);
  readonly formatId = 'zip-archive-stream';
  readonly name = 'Universal Compressed Archive Stream Parser';

  constructor(private readonly parserRegistry: ParserRegistryService) {}

  onModuleInit() {
    this.parserRegistry.registerParser(this);
  }

  canHandle(mimeType: string, filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.endsWith('.zip') ||
      mimeType === 'application/zip' ||
      mimeType === 'application/x-zip-compressed' ||
      mimeType === 'application/x-zip'
    );
  }

  async *parseStream(
    stream: NodeJS.ReadableStream,
    context: ParserContext,
  ): AsyncIterable<ParsedRecord> {
    this.logger.log(`Starting universal ZIP archive parse for ${context.filename} (Job: ${context.jobId})...`);

    // Spool stream to temp file to allow streaming zip entry inspection
    const tempDir = path.resolve(process.cwd(), '.textboard', 'temp', 'zip_unpack');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempZipPath = path.join(tempDir, `${context.jobId}_${Date.now()}.zip`);
    const writeStream = fs.createWriteStream(tempZipPath);

    await new Promise<void>((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    });

    let totalExtracted = 0;

    try {
      const zip = new AdmZip(tempZipPath);
      const zipEntries = zip.getEntries();
      this.logger.log(`ZIP archive opened: ${zipEntries.length} entries found inside ${context.filename}`);

      // 1. Separate chat documents from media attachments
      const chatEntries: AdmZip.IZipEntry[] = [];
      const mediaEntries: AdmZip.IZipEntry[] = [];

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        const name = entry.entryName.toLowerCase();

        if (
          name.endsWith('.txt') ||
          name.endsWith('.json') ||
          name.endsWith('.jsonl') ||
          name.endsWith('.csv') ||
          name.endsWith('.tsv') ||
          name.endsWith('.xlsx') ||
          name.endsWith('.imessage') ||
          name.endsWith('.signal')
        ) {
          chatEntries.push(entry);
        } else if (
          name.endsWith('.jpg') ||
          name.endsWith('.png') ||
          name.endsWith('.webp') ||
          name.endsWith('.mp4') ||
          name.endsWith('.opus') ||
          name.endsWith('.pdf')
        ) {
          mediaEntries.push(entry);
        }
      }

      this.logger.log(`Found ${chatEntries.length} primary data files and ${mediaEntries.length} media attachments.`);

      // 2. Sort chat entries so primary chats (e.g. _chat.txt, result.json) are parsed first
      chatEntries.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName.includes('_chat') || aName.includes('result') || aName.includes('messages')) return -1;
        if (bName.includes('_chat') || bName.includes('result') || bName.includes('messages')) return 1;
        return 0;
      });

      // 3. Stream parse each chat entry using matching registered parser
      for (const entry of chatEntries) {
        if (context.signal?.aborted) {
          this.logger.warn(`Archive unpack aborted for job ${context.jobId}`);
          break;
        }

        const entryBuffer = entry.getData();
        const entryStream = Readable.from(entryBuffer);
        const parser = this.parserRegistry.getParser('', entry.name);

        // Avoid infinite recursion if parser returned is ZipStreamParser
        if (parser.formatId === this.formatId) continue;

        this.logger.log(`Routing inner archive file "${entry.entryName}" to parser "${parser.name}"`);

        for await (const record of parser.parseStream(entryStream, context)) {
          totalExtracted++;
          // Annotate with archive provenance
          yield {
            ...record,
            metadata: {
              ...record.metadata,
              archiveSource: context.filename,
              innerPath: entry.entryName,
              archiveMediaCount: mediaEntries.length,
            },
          };
        }
      }
    } catch (err: any) {
      this.logger.error(`Failed to unpack and stream ZIP archive: ${err.message}`, err.stack);
      throw err;
    } finally {
      // Clean up temp ZIP file
      if (fs.existsSync(tempZipPath)) {
        try {
          fs.unlinkSync(tempZipPath);
        } catch {}
      }
    }

    this.logger.log(`Completed universal ZIP archive parse: extracted ${totalExtracted} total records.`);
  }
}
