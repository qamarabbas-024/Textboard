export interface ParsedChatEvent {
  timestamp: Date;
  actor: string | null;
  content: string;
  eventType: string;
  metadata?: Record<string, any>;
}

export interface ChatAnalysisSummary {
  datasetId: string;
  name: string;
  totalMessages: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  actorCounts: Record<string, number>;
  processingTimeMs: number;
}
