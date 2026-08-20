export type ExportJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ChatExportOptions {
  type?: 'chat' | 'highlights' | 'summary';
  theme?: 'light' | 'dark' | 'monochrome' | 'matrix';
  pageBgColor?: string;
  sentBubbleColor?: string;
  receivedBubbleColor?: string;
  includeCoverPage?: boolean;
  includeBookmarks?: boolean;
  startDate?: string;
  endDate?: string;
  actor?: string;
  primaryActor?: string;
  includeTimestamps?: boolean;
  includeSenderNames?: boolean;
  includeDateSeparators?: boolean;
  includeMediaPlaceholders?: boolean;
  groupConsecutive?: boolean;
  pageSize?: 'A4' | 'LETTER';
}

export interface ExportManifest {
  datasetId: string;
  exportId: string;
  sourceMessageCount: number;
  renderedMessageCount: number;
  missingCount: number;
  duplicateCount: number;
  failedCount: number;
  firstMessageId: string | null;
  lastMessageId: string | null;
  firstMessageTimestamp: string | null;
  lastMessageTimestamp: string | null;
  contentChecksum: string;
  status: 'VERIFIED' | 'FAILED';
  diagnostics?: string[];
  generatedAt: string;
  executionTimeMs?: number;
}

export interface ExportJobProgress {
  jobId: string;
  datasetId: string;
  type: 'chat' | 'highlights' | 'summary';
  status: ExportJobStatus;
  step?: string;
  progress: number;
  processedMessages: number;
  totalMessages: number;
  pagesCount: number;
  fileSize?: number;
  filename: string;
  downloadUrl?: string;
  error?: string;
  manifest?: ExportManifest;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}
