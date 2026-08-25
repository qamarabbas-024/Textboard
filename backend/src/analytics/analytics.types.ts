export interface MessageAnalytics {
  totalMessages: number;
  totalWords: number;
  totalCharacters: number;
  lexicalDensity?: number;
  averageMessageLength: {
    characters: number;
    words: number;
  };
  firstActivity: Date | null;
  lastActivity: Date | null;
  timeSpanDays: number;
  byPerson: Array<{
    actor: string;
    messageCount: number;
    percentage: number;
    totalChars: number;
    totalWords: number;
    avgChars: number;
    avgWords: number;
    firstActive: Date | null;
    lastActive: Date | null;
  }>;
  byHour: Array<{
    hour: number;
    count: number;
    percentage: number;
  }>;
  byDayOfWeek: Array<{
    day: number;
    dayName: string;
    count: number;
    percentage: number;
  }>;
  byDate: Array<{
    date: string;
    count: number;
  }>;
  longestMessages: Array<{
    id: string;
    actor: string | null;
    timestamp: Date;
    content: string;
    charLength: number;
    wordCount: number;
  }>;
}

export interface EmojiAnalytics {
  totalEmojis: number;
  uniqueEmojis: number;
  topEmojis: Array<{
    emoji: string;
    count: number;
    percentage: number;
  }>;
  byPerson: Array<{
    actor: string;
    totalEmojis: number;
    topEmojis: Array<{ emoji: string; count: number }>;
  }>;
  overTime: Array<{
    date: string;
    count: number;
    topEmoji?: string;
  }>;
}

export interface ActivityAnalytics {
  mostActiveDay: {
    date: string;
    count: number;
  } | null;
  mostActiveHour: {
    hour: number;
    count: number;
    label: string;
  } | null;
  mostActiveDayOfWeek: {
    day: number;
    dayName: string;
    count: number;
  } | null;
  longestStreak: {
    days: number;
    startDate: string;
    endDate: string;
  };
  longestGap: {
    days: number;
    startDate: string;
    endDate: string;
  };
  totalActiveDays: number;
  averageMessagesPerActiveDay: number;
  responseTimes: Array<{
    actor: string;
    avgResponseSecs: number | null;
    medianResponseSecs: number | null;
    sampleCount: number;
  }>;
}

export interface TextAnalytics {
  totalWords: number;
  uniqueWords: number;
  topWords: Array<{
    word: string;
    count: number;
  }>;
  topPhrases: Array<{
    phrase: string;
    count: number;
    length: number;
  }>;
  urls: Array<{
    url: string;
    domain: string;
    count: number;
  }>;
  topDomains: Array<{
    domain: string;
    count: number;
  }>;
  mentions: Array<{
    mention: string;
    count: number;
  }>;
}

export type InsightCategory =
  | 'volume'
  | 'participant'
  | 'activity'
  | 'timing'
  | 'emoji'
  | 'streak';

export interface Insight {
  id: string;
  category: InsightCategory;
  title: string;
  summary: string;
  confidence: number;
  importance: 'high' | 'medium' | 'low';
  supportingData: Record<string, any>;
}

export interface OnThisDayMemory {
  year: number;
  yearsAgo: number;
  dateStr: string;
  messageCount: number;
  participants: string[];
  topEmoji?: string;
  sampleMessages: Array<{
    id: string;
    actor: string;
    timestamp: Date;
    content: string;
  }>;
}

export interface RelationshipPair {
  actorA: string;
  actorB: string;
  totalExchanges: number;
  aToBInitiations: number;
  bToAInitiations: number;
  avgResponseSecsAtoB: number;
  avgResponseSecsBtoA: number;
  balanceRatio: number; // 0.5 is perfectly equal
  reciprocityScore?: number;
}

import { AnomalyReport } from './services/anomaly-detector.service';

export interface FullDatasetAnalytics {
  datasetId: string;
  datasetName: string;
  sourceType: string;
  messageAnalytics: MessageAnalytics;
  emojiAnalytics: EmojiAnalytics;
  activityAnalytics: ActivityAnalytics;
  textAnalytics: TextAnalytics;
  insights: Insight[];
  anomalies?: AnomalyReport;
  onThisDay?: OnThisDayMemory[];
  relationships?: RelationshipPair[];
  computedAt: Date;
  executionTimeMs: number;
}

