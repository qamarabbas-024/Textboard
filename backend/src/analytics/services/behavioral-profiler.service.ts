import { Injectable, Logger } from '@nestjs/common';

export interface ActorBehaviorProfile {
  actor: string;
  totalMessages: number;
  nocturnalIndex: number; // 0 - 100 percentage
  medianResponseLatencyMinutes: number;
  p90ResponseLatencyMinutes: number;
  burstinessIndex: number; // 0.0 (steady) to 1.0 (highly bursty)
  conversationInitiationRatio: number; // 0 - 100 percentage
  averageWordsPerMessage: number;
  mediaRatio: number; // 0.0 to 1.0
  activeDaysCount: number;
  peakHourUtc: number; // 0 - 23
}

export interface BehavioralReport {
  actorProfiles: ActorBehaviorProfile[];
  datasetNocturnalAverage: number;
  mostBurstyActor: string | null;
  fastestResponder: string | null;
}

@Injectable()
export class BehavioralProfilerService {
  private readonly logger = new Logger(BehavioralProfilerService.name);

  /**
   * Profiles behavioral chronotypes and latency dynamics across all actors in the dataset
   */
  profileActors(
    events: Array<{ actor: string | null; timestamp: Date; content: string; hasMedia?: boolean }>,
  ): BehavioralReport {
    if (!events.length) {
      return {
        actorProfiles: [],
        datasetNocturnalAverage: 0,
        mostBurstyActor: null,
        fastestResponder: null,
      };
    }

    const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const actorMap = new Map<string, {
      timestamps: number[];
      wordCounts: number[];
      mediaCount: number;
      nocturnalCount: number;
      initiationCount: number;
      hourCounts: number[];
      activeDays: Set<string>;
    }>();

    let lastTimestamp = 0;
    const INITIATION_GAP_MS = 4 * 60 * 60 * 1000; // 4 hours

    for (const ev of sorted) {
      const actor = ev.actor || 'Unknown';
      const timeMs = ev.timestamp.getTime();
      const hour = ev.timestamp.getUTCHours();
      const dateKey = ev.timestamp.toISOString().split('T')[0];
      const wordCount = ev.content ? ev.content.trim().split(/\s+/).length : 0;

      if (!actorMap.has(actor)) {
        actorMap.set(actor, {
          timestamps: [],
          wordCounts: [],
          mediaCount: 0,
          nocturnalCount: 0,
          initiationCount: 0,
          hourCounts: new Array(24).fill(0),
          activeDays: new Set(),
        });
      }

      const data = actorMap.get(actor)!;
      data.timestamps.push(timeMs);
      data.wordCounts.push(wordCount);
      data.hourCounts[hour]++;
      data.activeDays.add(dateKey);

      if (ev.hasMedia || ev.content.includes('(file attached)') || ev.content.includes('[Photo:') || ev.content.includes('[Media]')) {
        data.mediaCount++;
      }

      // Nocturnal hours: 23:00 to 06:00
      if (hour >= 23 || hour < 6) {
        data.nocturnalCount++;
      }

      // Conversation initiation detection
      if (lastTimestamp === 0 || timeMs - lastTimestamp >= INITIATION_GAP_MS) {
        data.initiationCount++;
      }
      lastTimestamp = timeMs;
    }

    let totalInitiations = 0;
    actorMap.forEach((v) => { totalInitiations += v.initiationCount; });

    const actorProfiles: ActorBehaviorProfile[] = [];

    for (const [actor, data] of actorMap.entries()) {
      const n = data.timestamps.length;
      const nocturnalIndex = parseFloat(((data.nocturnalCount / n) * 100).toFixed(1));

      // Calculate Inter-Message Intervals (IBI) for burstiness
      const intervals: number[] = [];
      for (let i = 1; i < data.timestamps.length; i++) {
        intervals.push((data.timestamps[i] - data.timestamps[i - 1]) / 60000); // minutes
      }

      let burstinessIndex = 0;
      if (intervals.length > 1) {
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        // Normalized Goh-Barabasi burstiness coefficient B = (std - mean) / (std + mean)
        if (stdDev + mean > 0) {
          const rawB = (stdDev - mean) / (stdDev + mean);
          burstinessIndex = parseFloat((Math.max(0, (rawB + 1) / 2)).toFixed(2));
        }
      }

      // Calculate response latencies (when interval <= 120 minutes)
      const directReplies = intervals.filter((d) => d > 0.05 && d <= 120);
      directReplies.sort((a, b) => a - b);
      const medianResponseLatencyMinutes = directReplies.length
        ? parseFloat((directReplies[Math.floor(directReplies.length * 0.5)]).toFixed(1))
        : 5.0;
      const p90ResponseLatencyMinutes = directReplies.length
        ? parseFloat((directReplies[Math.floor(directReplies.length * 0.9)]).toFixed(1))
        : 25.0;

      const totalWords = data.wordCounts.reduce((a, b) => a + b, 0);
      const averageWordsPerMessage = parseFloat((totalWords / n).toFixed(1));
      const mediaRatio = parseFloat((data.mediaCount / n).toFixed(2));
      const conversationInitiationRatio = totalInitiations
        ? parseFloat(((data.initiationCount / totalInitiations) * 100).toFixed(1))
        : 0;

      // Find peak hour
      let peakHourUtc = 12;
      let maxHourVal = -1;
      for (let h = 0; h < 24; h++) {
        if (data.hourCounts[h] > maxHourVal) {
          maxHourVal = data.hourCounts[h];
          peakHourUtc = h;
        }
      }

      actorProfiles.push({
        actor,
        totalMessages: n,
        nocturnalIndex,
        medianResponseLatencyMinutes,
        p90ResponseLatencyMinutes,
        burstinessIndex,
        conversationInitiationRatio,
        averageWordsPerMessage,
        mediaRatio,
        activeDaysCount: data.activeDays.size,
        peakHourUtc,
      });
    }

    const totalNocturnal = actorProfiles.reduce((acc, p) => acc + p.nocturnalIndex, 0);
    const datasetNocturnalAverage = actorProfiles.length
      ? parseFloat((totalNocturnal / actorProfiles.length).toFixed(1))
      : 0;

    let mostBurstyActor: string | null = null;
    let highestBurst = -1;
    let fastestResponder: string | null = null;
    let lowestLatency = 999999;

    for (const p of actorProfiles) {
      if (p.burstinessIndex > highestBurst) {
        highestBurst = p.burstinessIndex;
        mostBurstyActor = p.actor;
      }
      if (p.medianResponseLatencyMinutes < lowestLatency) {
        lowestLatency = p.medianResponseLatencyMinutes;
        fastestResponder = p.actor;
      }
    }

    return {
      actorProfiles,
      datasetNocturnalAverage,
      mostBurstyActor,
      fastestResponder,
    };
  }
}
