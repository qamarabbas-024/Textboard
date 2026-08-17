import { Injectable, Logger, BadRequestException, RequestTimeoutException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he',
  'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
  'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
  'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
]);

const DATE_REGEX = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi;

interface ParsedDoc {
  filename: string;
  text: string;
  pages: number;
  wordCount: number;
  tokens: Set<string>;
  datesFound: string[];
}

const PARSE_TIMEOUT_MS = 60000;

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processDocuments(
    files: { buffer: Buffer; originalname: string }[],
    datasetName?: string,
    timeoutMs = PARSE_TIMEOUT_MS,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No documents provided for ingestion.');
    }

    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<any>((_, reject) => {
      timer = setTimeout(() => {
        reject(new RequestTimeoutException(`Document processing timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });

    try {
      return await Promise.race([
        this.internalProcessDocuments(files, datasetName),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private async internalProcessDocuments(
    files: { buffer: Buffer; originalname: string }[],
    datasetName?: string,
  ) {
    const startTime = Date.now();
    const parsedDocs: ParsedDoc[] = [];

    let totalWords = 0;
    let totalPages = 0;

    for (const file of files) {
      if (!file.buffer || file.buffer.length === 0) {
        continue;
      }

      const ext = file.originalname.split('.').pop()?.toLowerCase();
      let text = '';
      let pages = 1;

      if (ext === 'pdf') {
        try {
          const pdfData = await pdfParse(file.buffer);
          text = pdfData.text || '';
          pages = pdfData.numpages || 1;
        } catch (e: any) {
          this.logger.warn(`PDF fallback parsing for ${file.originalname}`);
          text = file.buffer.toString('utf8').replace(/[\x00-\x08\x0B-\x1F]/g, ' ');
        }
      } else if (ext === 'docx') {
        try {
          const docxData = await mammoth.extractRawText({ buffer: file.buffer });
          text = docxData.value || '';
        } catch (e: any) {
          this.logger.warn(`DOCX fallback parsing for ${file.originalname}`);
          text = file.buffer.toString('utf8').replace(/[\x00-\x08\x0B-\x1F]/g, ' ');
        }
      } else {
        text = file.buffer.toString('utf8');
      }

      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

      const datesFound = (text.match(DATE_REGEX) || []).slice(0, 20);

      const docInfo: ParsedDoc = {
        filename: file.originalname,
        text,
        pages: Math.max(1, pages),
        wordCount: words.length,
        tokens: new Set(words),
        datesFound,
      };

      totalWords += words.length;
      totalPages += docInfo.pages;
      parsedDocs.push(docInfo);
    }

    if (parsedDocs.length === 0) {
      throw new BadRequestException('No readable text could be extracted from the uploaded files.');
    }

    const title = datasetName || (files.length === 1 ? files[0].originalname : `Document Collection (${files.length} files)`);

    // 2. Compute Global Keyword Frequency & Topics
    const globalWordCounts: Record<string, number> = {};
    for (const doc of parsedDocs) {
      for (const token of doc.tokens) {
        globalWordCounts[token] = (globalWordCounts[token] || 0) + 1;
      }
    }

    const topTopics = Object.entries(globalWordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, docCount]) => ({ word, docCount }));

    // 3. Compute Multi-Document Overlap / Jaccard Similarity Matrix
    const similarityMatrix: { docA: string; docB: string; similarity: number }[] = [];
    if (parsedDocs.length > 1) {
      for (let i = 0; i < parsedDocs.length; i++) {
        for (let j = i + 1; j < parsedDocs.length; j++) {
          const docA = parsedDocs[i];
          const docB = parsedDocs[j];

          const intersection = new Set([...docA.tokens].filter((x) => docB.tokens.has(x)));
          const union = new Set([...docA.tokens, ...docB.tokens]);

          const jaccard = union.size > 0 ? (intersection.size / union.size) : 0;
          similarityMatrix.push({
            docA: docA.filename,
            docB: docB.filename,
            similarity: Math.round(jaccard * 100),
          });
        }
      }
    }

    // 4. Create Dataset
    const dataset = await this.prisma.dataset.create({
      data: {
        name: title,
        sourceType: 'document',
        metadata: {
          fileCount: files.length,
          totalWords,
          totalPages,
          files: parsedDocs.map((d) => ({
            name: d.filename,
            pages: d.pages,
            wordCount: d.wordCount,
          })),
          topTopics,
          similarityMatrix,
        },
      },
    });

    // 5. Build TimelineEvents
    const eventsBatch: any[] = [];
    const actorCounts: Record<string, number> = {};
    let baseDate = new Date('2024-01-01T08:00:00Z');

    for (let docIdx = 0; docIdx < parsedDocs.length; docIdx++) {
      const doc = parsedDocs[docIdx];
      const actor = doc.filename;
      actorCounts[actor] = 0;

      const rawParagraphs = doc.text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 20);

      const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [doc.text.slice(0, 1000) || 'Empty document section'];

      for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
        const paragraph = paragraphs[pIdx];
        actorCounts[actor]++;

        let timestamp = new Date(baseDate.getTime() + (docIdx * 86400000) + (pIdx * 600000));
        const matchedDate = paragraph.match(DATE_REGEX);
        if (matchedDate && matchedDate[0]) {
          const parsed = new Date(matchedDate[0]);
          if (!isNaN(parsed.getTime())) {
            timestamp = parsed;
          }
        }

        eventsBatch.push({
          datasetId: dataset.id,
          timestamp,
          actor,
          content: paragraph,
          eventType: 'message',
          metadata: {
            filename: doc.filename,
            paragraphIndex: pIdx + 1,
          },
        });
      }
    }

    if (eventsBatch.length > 0) {
      await this.prisma.timelineEvent.createMany({ data: eventsBatch });
    }

    // 6. Save Highlights & Metrics
    const highlightsToInsert: any[] = [];
    const metricsToInsert: any[] = [];

    metricsToInsert.push({
      datasetId: dataset.id,
      name: 'total_document_words',
      value: totalWords,
      category: 'document_stats',
    });
    metricsToInsert.push({
      datasetId: dataset.id,
      name: 'total_document_pages',
      value: totalPages,
      category: 'document_stats',
    });

    if (topTopics.length > 0) {
      highlightsToInsert.push({
        datasetId: dataset.id,
        title: `Core Topics: ${topTopics.slice(0, 4).map((t) => t.word).join(', ')}`,
        description: `Primary extracted keywords across ${files.length} document(s).`,
        score: topTopics[0].docCount,
      });
    }

    if (similarityMatrix.length > 0) {
      const topSimilar = [...similarityMatrix].sort((a, b) => b.similarity - a.similarity)[0];
      if (topSimilar) {
        highlightsToInsert.push({
          datasetId: dataset.id,
          title: `Highest Overlap: ${topSimilar.docA} & ${topSimilar.docB}`,
          description: `${topSimilar.similarity}% lexical similarity across content and key terms.`,
          score: topSimilar.similarity,
        });
      }
    }

    if (highlightsToInsert.length > 0) {
      await this.prisma.highlight.createMany({ data: highlightsToInsert });
    }

    if (metricsToInsert.length > 0) {
      await this.prisma.metric.createMany({ data: metricsToInsert });
    }

    const processingTimeMs = Date.now() - startTime;
    // Strict privacy logging: only file count, word count, and duration
    this.logger.log(`Document collection processed successfully: id=${dataset.id}, files=${files.length}, words=${totalWords}, duration=${processingTimeMs}ms`);

    return {
      datasetId: dataset.id,
      name: title,
      totalMessages: eventsBatch.length,
      dateRange: {
        start: null,
        end: null,
      },
      actorCounts,
      processingTimeMs,
      fileCount: files.length,
      totalWords,
      totalPages,
      topTopics,
      similarityMatrix,
    };
  }
}
