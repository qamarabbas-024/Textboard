import { Injectable, Logger } from '@nestjs/common';
import { EventSummaryRow } from './message-analytics.service';

export interface TopicCluster {
  id: string;
  name: string;
  category: 'financial' | 'technical' | 'scheduling' | 'travel' | 'social' | 'operational' | 'general';
  icon: string;
  messageCount: number;
  percentage: number;
  coherenceScore?: number;
  topKeywords: Array<{ word: string; weight: number }>;
  topParticipants: Array<{ actor: string; count: number }>;
  sampleMessages: Array<{
    id: string;
    actor: string | null;
    timestamp: Date;
    content: string;
  }>;
}

export interface TopicClusteringReport {
  datasetId: string;
  totalClusters: number;
  clusters: TopicCluster[];
  computedAt: string;
}

const CATEGORY_VOCABULARY: Record<string, { category: TopicCluster['category']; icon: string; name: string; terms: string[] }> = {
  financial: {
    category: 'financial',
    icon: '💳',
    name: 'Financial & Invoicing',
    terms: ['money', 'paid', 'payment', 'invoice', 'budget', 'price', 'cost', 'bank', 'transfer', 'dollar', 'usd', 'crypto', 'billing', 'receipt', 'wire', 'fee', 'account', 'contract'],
  },
  technical: {
    category: 'technical',
    icon: '⚙️',
    name: 'Technical & Development',
    terms: ['code', 'bug', 'error', 'server', 'database', 'api', 'deploy', 'github', 'fix', 'test', 'release', 'build', 'issue', 'frontend', 'backend', 'log', 'app', 'system', 'security'],
  },
  scheduling: {
    category: 'scheduling',
    icon: '📅',
    name: 'Scheduling & Meetings',
    terms: ['meet', 'meeting', 'call', 'schedule', 'tomorrow', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'weekend', 'calendar', 'zoom', 'google meet', 'time', 'sync', 'available', 'reschedule'],
  },
  travel: {
    category: 'travel',
    icon: '✈️',
    name: 'Travel & Logistics',
    terms: ['flight', 'hotel', 'trip', 'airport', 'ticket', 'travel', 'car', 'uber', 'train', 'booking', 'arrival', 'depart', 'location', 'drive', 'destination', 'passport', 'visa'],
  },
  operational: {
    category: 'operational',
    icon: '📋',
    name: 'Operations & Tasks',
    terms: ['task', 'project', 'client', 'deadline', 'review', 'approve', 'send', 'document', 'report', 'status', 'update', 'complete', 'action', 'urgent', 'priority', 'checklist', 'team'],
  },
  social: {
    category: 'social',
    icon: '🎉',
    name: 'Social & Celebrations',
    terms: ['happy', 'congrats', 'birthday', 'party', 'dinner', 'lunch', 'weekend', 'coffee', 'fun', 'game', 'movie', 'photo', 'lol', 'haha', 'cool', 'great', 'awesome', 'family', 'friend'],
  },
};

@Injectable()
export class ClusteringEngineService {
  private readonly logger = new Logger(ClusteringEngineService.name);

  /**
   * Performs deterministic thematic topic clustering over communication events.
   */
  clusterEvents(datasetId: string, events: EventSummaryRow[]): TopicClusteringReport {
    if (!events || events.length === 0) {
      return {
        datasetId,
        totalClusters: 0,
        clusters: [],
        computedAt: new Date().toISOString(),
      };
    }

    const clusterBuckets = new Map<
      string,
      {
        categoryInfo: typeof CATEGORY_VOCABULARY[string];
        matchedEvents: EventSummaryRow[];
        wordFreq: Map<string, number>;
        actorFreq: Map<string, number>;
      }
    >();

    for (const [key, info] of Object.entries(CATEGORY_VOCABULARY)) {
      clusterBuckets.set(key, {
        categoryInfo: info,
        matchedEvents: [],
        wordFreq: new Map(),
        actorFreq: new Map(),
      });
    }

    const generalEvents: EventSummaryRow[] = [];

    // Assign events to thematic topic clusters
    for (const ev of events) {
      const text = (ev.content || '').toLowerCase();
      let matchedCategoryKey: string | null = null;
      let maxMatches = 0;

      for (const [key, info] of Object.entries(CATEGORY_VOCABULARY)) {
        let matchCount = 0;
        for (const term of info.terms) {
          if (text.includes(term)) {
            matchCount++;
          }
        }
        if (matchCount > maxMatches) {
          maxMatches = matchCount;
          matchedCategoryKey = key;
        }
      }

      if (matchedCategoryKey && maxMatches > 0) {
        const bucket = clusterBuckets.get(matchedCategoryKey)!;
        bucket.matchedEvents.push(ev);

        // Record participant frequency
        const actor = ev.actor || 'Unknown';
        bucket.actorFreq.set(actor, (bucket.actorFreq.get(actor) || 0) + 1);

        // Record word matches
        for (const term of bucket.categoryInfo.terms) {
          if (text.includes(term)) {
            bucket.wordFreq.set(term, (bucket.wordFreq.get(term) || 0) + 1);
          }
        }
      } else {
        generalEvents.push(ev);
      }
    }

    const clusters: TopicCluster[] = [];

    for (const [key, bucket] of clusterBuckets.entries()) {
      if (bucket.matchedEvents.length > 0) {
        const sortedKeywords = Array.from(bucket.wordFreq.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([word, weight]) => ({ word, weight }));

        const sortedActors = Array.from(bucket.actorFreq.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([actor, count]) => ({ actor, count }))
          .slice(0, 5);

        const sampleMessages = bucket.matchedEvents.slice(0, 5).map((e) => ({
          id: e.id,
          actor: e.actor,
          timestamp: e.timestamp,
          content: e.content,
        }));

        const percentage = parseFloat(
          ((bucket.matchedEvents.length / events.length) * 100).toFixed(1),
        );

        clusters.push({
          id: `cluster_${key}`,
          name: bucket.categoryInfo.name,
          category: bucket.categoryInfo.category,
          icon: bucket.categoryInfo.icon,
          messageCount: bucket.matchedEvents.length,
          percentage,
          topKeywords: sortedKeywords.slice(0, 10),
          topParticipants: sortedActors,
          sampleMessages,
        });
      }
    }

    // Add General Cluster for remaining messages
    if (generalEvents.length > 0) {
      const percentage = parseFloat(
        ((generalEvents.length / events.length) * 100).toFixed(1),
      );
      clusters.push({
        id: 'cluster_general',
        name: 'General & Conversational Exchanges',
        category: 'general',
        icon: '💬',
        messageCount: generalEvents.length,
        percentage,
        topKeywords: [{ word: 'chat', weight: generalEvents.length }],
        topParticipants: [],
        sampleMessages: generalEvents.slice(0, 5).map((e) => ({
          id: e.id,
          actor: e.actor,
          timestamp: e.timestamp,
          content: e.content,
        })),
      });
    }

    clusters.sort((a, b) => b.messageCount - a.messageCount);

    return {
      datasetId,
      totalClusters: clusters.length,
      clusters,
      computedAt: new Date().toISOString(),
    };
  }
}
