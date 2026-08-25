import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FullDatasetAnalytics } from '../analytics.types';
import { AnalyticsEngineService } from '../analytics-engine.service';

export interface CrossDatasetCorrelation {
  datasetA: {
    id: string;
    name: string;
    sourceType: string;
    totalEvents: number;
    startDate: string | null;
    endDate: string | null;
    participants: string[];
  };
  datasetB: {
    id: string;
    name: string;
    sourceType: string;
    totalEvents: number;
    startDate: string | null;
    endDate: string | null;
    participants: string[];
  };
  temporalCorrelation: {
    overlapDays: number;
    overlapPercentage: number;
    concurrentActiveDays: number;
    hourlySynchronicity: number; // 0 to 1 Pearson correlation
    confidenceScore?: number;
  };
  lexicalCorrelation: {
    sharedKeywords: Array<{ word: string; countA: number; countB: number }>;
    uniqueKeywordsA: string[];
    uniqueKeywordsB: string[];
    sharedEmojis: Array<{ emoji: string; countA: number; countB: number }>;
  };
  participantOverlap: Array<{
    name: string;
    messageCountA: number;
    messageCountB: number;
  }>;
  computedAt: string;
}

@Injectable()
export class CrossCorrelatorService {
  private readonly logger = new Logger(CrossCorrelatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsEngine: AnalyticsEngineService,
  ) {}

  /**
   * Computes multi-stream correlation between two datasets.
   */
  async correlateDatasets(datasetIdA: string, datasetIdB: string): Promise<CrossDatasetCorrelation> {
    const [analyticsA, analyticsB] = await Promise.all([
      this.analyticsEngine.getDatasetAnalytics(datasetIdA),
      this.analyticsEngine.getDatasetAnalytics(datasetIdB),
    ]);

    if (!analyticsA || !analyticsB) {
      throw new NotFoundException('One or both datasets could not be loaded for correlation');
    }

    // 1. Participant Overlap
    const participantsA = analyticsA.messageAnalytics.byPerson.map((p) => p.actor);
    const participantsB = analyticsB.messageAnalytics.byPerson.map((p) => p.actor);

    const participantOverlap: Array<{ name: string; messageCountA: number; messageCountB: number }> = [];
    for (const pA of analyticsA.messageAnalytics.byPerson) {
      const match = analyticsB.messageAnalytics.byPerson.find(
        (pB) => pB.actor.toLowerCase().trim() === pA.actor.toLowerCase().trim(),
      );
      if (match) {
        participantOverlap.push({
          name: pA.actor,
          messageCountA: pA.messageCount,
          messageCountB: match.messageCount,
        });
      }
    }

    // 2. Temporal Overlap Calculation
    const datesA = new Set(analyticsA.messageAnalytics.byDate.map((d) => d.date));
    const datesB = new Set(analyticsB.messageAnalytics.byDate.map((d) => d.date));
    let concurrentDays = 0;
    for (const d of datesA) {
      if (datesB.has(d)) concurrentDays++;
    }

    const startA = analyticsA.messageAnalytics.firstActivity
      ? new Date(analyticsA.messageAnalytics.firstActivity).getTime()
      : 0;
    const endA = analyticsA.messageAnalytics.lastActivity
      ? new Date(analyticsA.messageAnalytics.lastActivity).getTime()
      : 0;
    const startB = analyticsB.messageAnalytics.firstActivity
      ? new Date(analyticsB.messageAnalytics.firstActivity).getTime()
      : 0;
    const endB = analyticsB.messageAnalytics.lastActivity
      ? new Date(analyticsB.messageAnalytics.lastActivity).getTime()
      : 0;

    const overlapStart = Math.max(startA, startB);
    const overlapEnd = Math.min(endA, endB);
    const overlapMs = Math.max(0, overlapEnd - overlapStart);
    const overlapDays = Math.round(overlapMs / (1000 * 60 * 60 * 24));

    const totalSpanMs = Math.max(endA, endB) - Math.min(startA, startB);
    const overlapPercentage =
      totalSpanMs > 0 ? parseFloat(((overlapMs / totalSpanMs) * 100).toFixed(1)) : 0;

    // 3. Hourly Synchronicity (Pearson Correlation between 24-hour distributions)
    const hourlyA = new Array(24).fill(0);
    const hourlyB = new Array(24).fill(0);
    for (const h of analyticsA.messageAnalytics.byHour) {
      hourlyA[h.hour] = h.count;
    }
    for (const h of analyticsB.messageAnalytics.byHour) {
      hourlyB[h.hour] = h.count;
    }
    const hourlySynchronicity = this.calculatePearsonCorrelation(hourlyA, hourlyB);

    // 4. Lexical and Emoji Correlation
    const wordsA = new Map(analyticsA.textAnalytics.topWords.map((w) => [w.word, w.count]));
    const wordsB = new Map(analyticsB.textAnalytics.topWords.map((w) => [w.word, w.count]));

    const sharedKeywords: Array<{ word: string; countA: number; countB: number }> = [];
    const uniqueKeywordsA: string[] = [];
    const uniqueKeywordsB: string[] = [];

    for (const [word, countA] of wordsA.entries()) {
      if (wordsB.has(word)) {
        sharedKeywords.push({ word, countA, countB: wordsB.get(word)! });
      } else {
        uniqueKeywordsA.push(word);
      }
    }
    for (const [word] of wordsB.entries()) {
      if (!wordsA.has(word)) {
        uniqueKeywordsB.push(word);
      }
    }

    sharedKeywords.sort((a, b) => b.countA + b.countB - (a.countA + a.countB));

    const emojisA = new Map(analyticsA.emojiAnalytics.topEmojis.map((e) => [e.emoji, e.count]));
    const emojisB = new Map(analyticsB.emojiAnalytics.topEmojis.map((e) => [e.emoji, e.count]));
    const sharedEmojis: Array<{ emoji: string; countA: number; countB: number }> = [];
    for (const [emoji, countA] of emojisA.entries()) {
      if (emojisB.has(emoji)) {
        sharedEmojis.push({ emoji, countA, countB: emojisB.get(emoji)! });
      }
    }

    return {
      datasetA: {
        id: analyticsA.datasetId,
        name: analyticsA.datasetName,
        sourceType: analyticsA.sourceType,
        totalEvents: analyticsA.messageAnalytics.totalMessages,
        startDate: analyticsA.messageAnalytics.firstActivity
          ? new Date(analyticsA.messageAnalytics.firstActivity).toISOString()
          : null,
        endDate: analyticsA.messageAnalytics.lastActivity
          ? new Date(analyticsA.messageAnalytics.lastActivity).toISOString()
          : null,
        participants: participantsA,
      },
      datasetB: {
        id: analyticsB.datasetId,
        name: analyticsB.datasetName,
        sourceType: analyticsB.sourceType,
        totalEvents: analyticsB.messageAnalytics.totalMessages,
        startDate: analyticsB.messageAnalytics.firstActivity
          ? new Date(analyticsB.messageAnalytics.firstActivity).toISOString()
          : null,
        endDate: analyticsB.messageAnalytics.lastActivity
          ? new Date(analyticsB.messageAnalytics.lastActivity).toISOString()
          : null,
        participants: participantsB,
      },
      temporalCorrelation: {
        overlapDays,
        overlapPercentage,
        concurrentActiveDays: concurrentDays,
        hourlySynchronicity: parseFloat(hourlySynchronicity.toFixed(2)),
        confidenceScore: Math.min(1, parseFloat(((concurrentDays / Math.max(1, overlapDays)) * 0.8 + 0.2).toFixed(2))),
      },
      lexicalCorrelation: {
        sharedKeywords: sharedKeywords.slice(0, 30),
        uniqueKeywordsA: uniqueKeywordsA.slice(0, 20),
        uniqueKeywordsB: uniqueKeywordsB.slice(0, 20),
        sharedEmojis: sharedEmojis.slice(0, 15),
      },
      participantOverlap,
      computedAt: new Date().toISOString(),
    };
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (denominator === 0) return 0;
    return Math.max(-1, Math.min(1, numerator / denominator));
  }
}
