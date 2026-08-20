export interface ParsedSearchQuery {
  rawQuery: string;
  text: string;
  exactPhrases: string[];
  actors: string[];
  startDate?: Date;
  endDate?: Date;
  emojis: string[];
  hasUrls?: boolean;
  hasMedia?: boolean;
  hasEmojis?: boolean;
  datasetId?: string;
}

export interface SearchParams {
  q?: string;
  datasetId?: string;
  actor?: string;
  startDate?: string;
  endDate?: string;
  emoji?: string;
  cursor?: string;
  page?: number;
  limit?: number;
  orderBy?: 'relevance' | 'timestamp_asc' | 'timestamp_desc';
}

export interface SearchResultItem {
  id: string;
  datasetId: string;
  actor: string | null;
  timestamp: Date;
  content: string;
  eventType: string;
  charLength: number;
  wordCount: number;
  hasUrls: boolean;
  hasEmojis: boolean;
  hasMedia: boolean;
  metadata?: Record<string, any>;
  highlight?: string;
  score?: number;
}

export interface SearchResponse {
  query: string;
  parsedQuery: ParsedSearchQuery;
  totalMatches: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  executionTimeMs: number;
  items: SearchResultItem[];
}
