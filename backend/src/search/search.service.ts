import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryParserService } from './query-parser.service';
import { SemanticVectorService } from './semantic-vector.service';
import { SearchParams, SearchResponse, SearchResultItem, ParsedSearchQuery } from './search.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryParser: QueryParserService,
    private readonly semanticVector: SemanticVectorService,
  ) {}

  /**
   * Executes structured full-text & faceted search over normalized SQLite stored events.
   * Supports exact, hybrid, and semantic vector AI similarity modes.
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const startTime = Date.now();
    const parsed = this.queryParser.parseQuery(params);
    const searchMode = params.mode || 'hybrid';

    const limit = Math.min(Math.max(1, params.limit ? Number(params.limit) : 20), 100);
    const page = Math.max(1, params.page ? Number(params.page) : 1);
    const skip = (page - 1) * limit;

    const where: Prisma.TimelineEventWhereInput = {};

    // 1. Dataset scoping
    if (parsed.datasetId) {
      where.datasetId = parsed.datasetId;
    }

    // 2. Actor / Participant filtering
    if (parsed.actors.length === 1) {
      where.actor = parsed.actors[0];
    } else if (parsed.actors.length > 1) {
      where.actor = { in: parsed.actors };
    }

    // 3. Date range filtering (Indexed on timestamp)
    if (parsed.startDate || parsed.endDate) {
      where.timestamp = {};
      if (parsed.startDate) where.timestamp.gte = parsed.startDate;
      if (parsed.endDate) where.timestamp.lte = parsed.endDate;
    }

    // 4. Facet flags
    if (parsed.hasUrls !== undefined) where.hasUrls = parsed.hasUrls;
    if (parsed.hasMedia !== undefined) where.hasMedia = parsed.hasMedia;
    if (parsed.hasEmojis !== undefined) where.hasEmojis = parsed.hasEmojis;

    // 5. Content text & exact phrases matching (for exact or hybrid base filtering)
    const textConditions: Prisma.TimelineEventWhereInput[] = [];

    if (searchMode === 'exact' || searchMode === 'hybrid') {
      if (parsed.text && searchMode === 'exact') {
        const keywords = parsed.text.split(/\s+/).filter((k) => k.length > 0);
        for (const kw of keywords) {
          textConditions.push({ content: { contains: kw } });
        }
      }

      for (const phrase of parsed.exactPhrases) {
        textConditions.push({ content: { contains: phrase } });
      }

      for (const emoji of parsed.emojis) {
        textConditions.push({ content: { contains: emoji } });
      }
    }

    if (textConditions.length > 0) {
      where.AND = textConditions;
    }

    // 6. Ordering strategy
    let orderBy: Prisma.TimelineEventOrderByWithRelationInput = { timestamp: 'desc' };
    if (params.orderBy === 'timestamp_asc') {
      orderBy = { timestamp: 'asc' };
    } else if (params.orderBy === 'timestamp_desc') {
      orderBy = { timestamp: 'desc' };
    }

    // Generate query embedding vector if semantic search is requested
    const queryVector =
      (searchMode === 'semantic' || searchMode === 'hybrid') && (parsed.text || params.q)
        ? this.semanticVector.generateEmbedding(parsed.text || params.q || '')
        : null;

    // Execute count and query in parallel using SQLite compound index
    const [totalMatches, rawEvents] = await Promise.all([
      this.prisma.timelineEvent.count({ where }),
      this.prisma.timelineEvent.findMany({
        where,
        take: searchMode === 'semantic' ? 100 : limit + 1,
        skip: searchMode === 'semantic' ? 0 : skip,
        cursor: params.cursor ? { id: params.cursor } : undefined,
        orderBy,
      }),
    ]);

    const hasMore = rawEvents.length > limit;
    const records = hasMore && searchMode !== 'semantic' ? rawEvents.slice(0, limit) : rawEvents;
    const nextCursor = hasMore && records.length > 0 ? records[records.length - 1].id : null;

    // Build highlighted snippets and relevance scores
    let items: SearchResultItem[] = records.map((ev) => {
      const highlight = this.generateHighlightSnippet(ev.content, parsed);
      const bm25Score = this.calculateRelevanceScore(ev.content, parsed);

      let semanticScore: number | undefined = undefined;
      let combinedScore = bm25Score;

      if (queryVector && ev.content) {
        const docVector = this.semanticVector.generateEmbedding(ev.content);
        semanticScore = Number(this.semanticVector.calculateCosineSimilarity(queryVector, docVector).toFixed(3));
        
        if (searchMode === 'semantic') {
          combinedScore = semanticScore * 100;
        } else if (searchMode === 'hybrid') {
          combinedScore = Number((0.6 * (semanticScore * 50) + 0.4 * bm25Score).toFixed(2));
        }
      }

      let metadata: Record<string, any> | undefined = undefined;
      if (ev.metadata) {
        try {
          metadata = JSON.parse(ev.metadata);
        } catch {
          // Ignore
        }
      }

      // Check for OCR text match in image attachments
      let ocrMatched = false;
      if (metadata && (metadata.ocrText || metadata.originalFilename)) {
        const ocrPayload = `${metadata.ocrText || ''} ${metadata.originalFilename || ''}`.toLowerCase();
        for (const term of (parsed.exactPhrases.concat(parsed.text.split(/\s+/).filter(Boolean)))) {
          if (ocrPayload.includes(term.toLowerCase())) {
            ocrMatched = true;
            combinedScore += 15.0;
            break;
          }
        }
      }

      return {
        id: ev.id,
        datasetId: ev.datasetId,
        actor: ev.actor,
        timestamp: ev.timestamp,
        content: ev.content,
        eventType: ev.eventType,
        charLength: ev.charLength,
        wordCount: ev.wordCount,
        hasUrls: ev.hasUrls,
        hasEmojis: ev.hasEmojis,
        hasMedia: ev.hasMedia,
        metadata: {
          ...metadata,
          ocrMatched,
        },
        highlight: ocrMatched && !highlight.includes('<mark') ? `[OCR Match] ${highlight}` : highlight,
        score: combinedScore,
        semanticScore,
      };
    });

    // If semantic or relevance ordering was requested, sort by score
    if (searchMode === 'semantic' || searchMode === 'hybrid' || params.orderBy === 'relevance') {
      items.sort((a, b) => (b.score || 0) - (a.score || 0));
      if (searchMode === 'semantic') {
        items = items.slice(skip, skip + limit);
      }
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`Search completed in ${elapsed}ms: mode=${searchMode}, matches=${totalMatches}, returned=${items.length}`);

    return {
      query: params.q || '',
      parsedQuery: parsed,
      totalMatches,
      page,
      limit,
      hasMore,
      nextCursor,
      executionTimeMs: elapsed,
      mode: searchMode,
      items,
    };
  }

  /**
   * Generates a concise snippet with <mark> tags around matching terms.
   */
  private generateHighlightSnippet(content: string, query: ParsedSearchQuery): string {
    if (!content) return '';
    const searchTerms = [
      ...query.exactPhrases,
      ...(query.text ? query.text.split(/\s+/) : []),
      ...query.emojis,
    ].filter((t) => t.length > 0);

    if (searchTerms.length === 0) {
      return content.length > 160 ? content.slice(0, 160) + '...' : content;
    }

    // Find first term occurrence
    let firstIdx = -1;
    for (const term of searchTerms) {
      const idx = content.toLowerCase().indexOf(term.toLowerCase());
      if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
        firstIdx = idx;
      }
    }

    let start = 0;
    let end = content.length;

    if (firstIdx !== -1 && content.length > 160) {
      start = Math.max(0, firstIdx - 40);
      end = Math.min(content.length, start + 160);
    }

    let snippet = content.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    // HTML-escape raw text to prevent XSS before injecting highlight tags
    snippet = snippet
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Wrap matches safely in <mark>
    for (const term of searchTerms) {
      const escapedTerm = term
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      snippet = snippet.replace(regex, '<mark class="bg-amber-500/30 text-amber-200 px-0.5 rounded font-medium">$1</mark>');
    }

    return snippet;
  }

  /**
   * Calculates a fast relevance score based on term matches, exact phrases, and position.
   */
  private calculateRelevanceScore(content: string, query: ParsedSearchQuery): number {
    let score = 1.0;
    const lower = content.toLowerCase();

    for (const phrase of query.exactPhrases) {
      if (lower.includes(phrase.toLowerCase())) {
        score += 10.0;
      }
    }

    if (query.text) {
      const words = query.text.toLowerCase().split(/\s+/);
      for (const w of words) {
        if (!w) continue;
        const matches = (lower.match(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (matches > 0) {
          // BM25 term frequency saturation approximation
          score += (matches * 2.5) / (matches + 1.2);
          if (lower.startsWith(w)) score += 3.0;
        }
      }
    }

    return Number(score.toFixed(2));
  }
}
