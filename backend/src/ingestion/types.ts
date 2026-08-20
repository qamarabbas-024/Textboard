export interface ParsedRecord {
  timestamp: Date;
  rawTimestamp?: string;
  actor?: string;
  content: string;
  eventType?: string;
  metadata?: Record<string, any>;
  urls?: string[];
  emojis?: string[];
  hasMedia?: boolean;
}

export interface NormalizedEvent {
  id: string;
  datasetId: string;
  sourceFileId?: string;
  entityId?: string;
  actor?: string;
  actorName?: string;
  timestamp: Date;
  rawTimestamp?: string;
  sequenceNum: number;
  content: string;
  eventType: string;
  charLength: number;
  wordCount: number;
  hasUrls: boolean;
  hasEmojis: boolean;
  hasMedia: boolean;
  metadata?: string;
}

export interface ParserContext {
  jobId: string;
  datasetId: string;
  sourceFileId?: string;
  filename: string;
  fileSize?: number;
  signal?: AbortSignal;
  onProgress?: (progress: number, rowsParsed: number, failedCount?: number) => void;
}

export interface IStreamParser {
  readonly formatId: string;
  readonly name: string;
  canHandle(mimeType: string, filename: string): boolean;
  parseStream(stream: NodeJS.ReadableStream, context: ParserContext): AsyncIterable<ParsedRecord>;
}

export type ImportJobStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type JobStep =
  | 'spooling'
  | 'parsing'
  | 'normalizing'
  | 'indexing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ImportProgressEvent {
  jobId: string;
  datasetId: string;
  status: ImportJobStatus;
  step: JobStep | string;
  progress: number;
  processedRows: number;
  failedRows: number;
  totalRows?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  executionTimeMs?: number;
}

export interface IngestOptions {
  datasetName?: string;
  sourceType?: string;
  preserveSourceFile?: boolean;
  batchSize?: number;
  signal?: AbortSignal;
}

export interface JobSubmissionResult {
  jobId: string;
  datasetId: string;
  status: ImportJobStatus;
  filename: string;
  fileSize: number;
  eventsUrl: string;
  statusUrl: string;
}

export interface JobSummary {
  id: string;
  datasetId: string;
  datasetName?: string;
  sourceFileId?: string | null;
  filename?: string | null;
  fileSize?: number | null;
  status: ImportJobStatus;
  step: string | null;
  progress: number;
  processedRows: number;
  failedRows: number;
  totalRows: number;
  errorMessage?: string | null;
  errorDetails?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  executionTimeMs?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
