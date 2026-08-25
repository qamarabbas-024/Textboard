import { Injectable, Logger } from '@nestjs/common';
import { EventSummaryRow } from './message-analytics.service';

export type AnomalySeverity = 'CRITICAL' | 'WARNING' | 'NOTE';
export type AnomalyType =
  | 'LATE_NIGHT_SURGE'
  | 'VELOCITY_BURST'
  | 'EXTENDED_DORMANCY'
  | 'LEXICAL_SHIFT'
  | 'GHOST_PARTICIPANT'
  | 'URGENCY_SPIKE';

export interface ForensicAnomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  timestamp: string;
  endTimestamp?: string;
  actor?: string;
  metrics: {
    value: number;
    baseline: number;
    ratio: number;
    unit: string;
  };
  sampleSnippet?: string;
  metadata?: Record<string, any>;
}

export interface AnomalyReport {
  datasetId: string;
  totalAnomalies: number;
  criticalCount: number;
  warningCount: number;
  noteCount: number;
  anomalies: ForensicAnomaly[];
  computedAt: string;
}

const URGENCY_TERMS = [
  'urgent',
  'asap',
  'emergency',
  'immediately',
  'help',
  'call me',
  'wire',
  'bank',
  'password',
  'secret',
  'confidential',
  'delete this',
  'dont tell',
];

@Injectable()
export class AnomalyDetectorService {
  private readonly logger = new Logger(AnomalyDetectorService.name);

  /**
   * Detects deterministic anomalies across communication timeline events.
   */
  detectAnomalies(datasetId: string, events: EventSummaryRow[]): AnomalyReport {
    const anomalies: ForensicAnomaly[] = [];

    if (!events || events.length < 5) {
      return {
        datasetId,
        totalAnomalies: 0,
        criticalCount: 0,
        warningCount: 0,
        noteCount: 0,
        anomalies: [],
        computedAt: new Date().toISOString(),
      };
    }

    // 1. Detect Late-Night Surges (00:00 - 05:00)
    const lateNightAnomalies = this.detectLateNightSurges(events);
    anomalies.push(...lateNightAnomalies);

    // 2. Detect Rapid Velocity Bursts (>20 msgs in <5 min)
    const velocityAnomalies = this.detectVelocityBursts(events);
    anomalies.push(...velocityAnomalies);

    // 3. Detect Extended Communication Gaps
    const dormancyAnomalies = this.detectDormancyGaps(events);
    anomalies.push(...dormancyAnomalies);

    // 4. Detect Urgency / Sensitivity Keyword Spikes
    const urgencyAnomalies = this.detectUrgencySpikes(events);
    anomalies.push(...urgencyAnomalies);

    // 5. Detect Ghost / Transient Participants
    const ghostAnomalies = this.detectGhostParticipants(events);
    anomalies.push(...ghostAnomalies);

    // 6. Detect Monologue Length Anomaly (>1500 chars)
    const longMsgAnomalies = this.detectMonologues(events);
    anomalies.push(...longMsgAnomalies);

    // Sort by severity (CRITICAL -> WARNING -> NOTE) then timestamp
    const severityWeight: Record<AnomalySeverity, number> = {
      CRITICAL: 3,
      WARNING: 2,
      NOTE: 1,
    };

    anomalies.sort((a, b) => {
      const diff = severityWeight[b.severity] - severityWeight[a.severity];
      if (diff !== 0) return diff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL').length;
    const warningCount = anomalies.filter((a) => a.severity === 'WARNING').length;
    const noteCount = anomalies.filter((a) => a.severity === 'NOTE').length;

    return {
      datasetId,
      totalAnomalies: anomalies.length,
      criticalCount,
      warningCount,
      noteCount,
      anomalies,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Identifies uncharacteristic late-night message clusters (00:00 - 05:00).
   */
  private detectLateNightSurges(events: EventSummaryRow[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    const dateHourBuckets = new Map<string, { count: number; events: EventSummaryRow[] }>();

    // Calculate baseline hourly rate (minimum 24 hours baseline window)
    const totalEvents = events.length;
    const firstTime = new Date(events[0].timestamp).getTime();
    const lastTime = new Date(events[events.length - 1].timestamp).getTime();
    const totalHours = Math.max(24, (lastTime - firstTime) / (1000 * 60 * 60));
    const baselinePerHour = Math.max(1, totalEvents / totalHours);

    for (const ev of events) {
      const date = new Date(ev.timestamp);
      const hour = date.getUTCHours();
      if (hour >= 0 && hour < 5) {
        const key = `${date.toISOString().slice(0, 10)}_${hour}`;
        const bucket = dateHourBuckets.get(key) || { count: 0, events: [] };
        bucket.count++;
        bucket.events.push(ev);
        dateHourBuckets.set(key, bucket);
      }
    }

    for (const [key, bucket] of dateHourBuckets.entries()) {
      const [dayStr, hourStr] = key.split('_');
      // If volume is >= 15 messages in a single late-night hour and > 1.5x baseline
      if (bucket.count >= 15 && bucket.count > baselinePerHour * 1.5) {
        const primaryActor = bucket.events[0]?.actor || 'Unknown';
        const ratio = parseFloat((bucket.count / Math.max(1, baselinePerHour)).toFixed(1));
        const severity: AnomalySeverity = bucket.count >= 40 ? 'CRITICAL' : 'WARNING';

        anomalies.push({
          id: `anomaly_latenight_${key}`,
          type: 'LATE_NIGHT_SURGE',
          severity,
          title: `Uncharacteristic Late-Night Surge (${bucket.count} msgs at ${hourStr}:00)`,
          description: `Abnormal volume burst between 00:00 and 05:00 on ${dayStr}. Activity was ${ratio}x higher than average hourly velocity.`,
          timestamp: new Date(bucket.events[0].timestamp).toISOString(),
          endTimestamp: new Date(bucket.events[bucket.events.length - 1].timestamp).toISOString(),
          actor: primaryActor,
          metrics: {
            value: bucket.count,
            baseline: parseFloat(baselinePerHour.toFixed(1)),
            ratio,
            unit: 'msgs/hour',
          },
          sampleSnippet: bucket.events[0].content?.slice(0, 120),
        });
      }
    }

    return anomalies.slice(0, 15);
  }

  /**
   * Detects rapid message velocity bursts (>25 messages in 5 minutes).
   */
  private detectVelocityBursts(events: EventSummaryRow[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    const windowMs = 5 * 60 * 1000; // 5 mins

    let windowStart = 0;
    for (let i = 0; i < events.length; i++) {
      const curTime = new Date(events[i].timestamp).getTime();

      while (
        windowStart < i &&
        curTime - new Date(events[windowStart].timestamp).getTime() > windowMs
      ) {
        windowStart++;
      }

      const countInWindow = i - windowStart + 1;
      if (countInWindow >= 25) {
        const startEv = events[windowStart];
        const endEv = events[i];
        const primaryActor = endEv.actor || 'Multiple Participants';

        anomalies.push({
          id: `anomaly_velocity_${startEv.id}`,
          type: 'VELOCITY_BURST',
          severity: countInWindow >= 50 ? 'CRITICAL' : 'WARNING',
          title: `Rapid Velocity Burst (${countInWindow} msgs in <5 mins)`,
          description: `Rapid-fire exchange detected from ${startEv.actor || 'User'} with ${countInWindow} messages in a 5-minute window.`,
          timestamp: new Date(startEv.timestamp).toISOString(),
          endTimestamp: new Date(endEv.timestamp).toISOString(),
          actor: primaryActor,
          metrics: {
            value: countInWindow,
            baseline: 5,
            ratio: parseFloat((countInWindow / 5).toFixed(1)),
            unit: 'msgs/5min',
          },
          sampleSnippet: startEv.content?.slice(0, 120),
        });

        // Skip forward to avoid duplicate alerts for the same burst
        windowStart = i + 10;
        i += 10;
      }
    }

    return anomalies.slice(0, 15);
  }

  /**
   * Detects extended silence/dormancy periods (>14 days).
   */
  private detectDormancyGaps(events: EventSummaryRow[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    const minGapMs = 14 * 24 * 60 * 60 * 1000; // 14 days

    for (let i = 1; i < events.length; i++) {
      const prevTime = new Date(events[i - 1].timestamp).getTime();
      const curTime = new Date(events[i].timestamp).getTime();
      const diffMs = curTime - prevTime;

      if (diffMs >= minGapMs) {
        const gapDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        anomalies.push({
          id: `anomaly_dormancy_${events[i - 1].id}`,
          type: 'EXTENDED_DORMANCY',
          severity: gapDays >= 45 ? 'WARNING' : 'NOTE',
          title: `Extended Communication Hiatus (${gapDays} Days Silent)`,
          description: `Channel went completely silent from ${new Date(events[i - 1].timestamp).toLocaleDateString()} to ${new Date(events[i].timestamp).toLocaleDateString()} before conversation resumed.`,
          timestamp: new Date(events[i - 1].timestamp).toISOString(),
          endTimestamp: new Date(events[i].timestamp).toISOString(),
          actor: events[i].actor || undefined,
          metrics: {
            value: gapDays,
            baseline: 1,
            ratio: gapDays,
            unit: 'days',
          },
          sampleSnippet: `Resumed by ${events[i].actor}: "${events[i].content?.slice(0, 80)}"`,
        });
      }
    }

    return anomalies.slice(0, 10);
  }

  /**
   * Detects clusters of high-urgency or sensitive terms.
   */
  private detectUrgencySpikes(events: EventSummaryRow[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const contentLower = (ev.content || '').toLowerCase();

      const matchedTerms = URGENCY_TERMS.filter((term) => contentLower.includes(term));
      if (matchedTerms.length >= 2) {
        anomalies.push({
          id: `anomaly_urgency_${ev.id}`,
          type: 'URGENCY_SPIKE',
          severity: matchedTerms.length >= 3 ? 'CRITICAL' : 'WARNING',
          title: `High Urgency / Sensitive Term Alert (${matchedTerms.join(', ')})`,
          description: `Message sent by ${ev.actor || 'User'} contains multiple high-priority escalation terms: ${matchedTerms.join(', ')}.`,
          timestamp: new Date(ev.timestamp).toISOString(),
          actor: ev.actor || undefined,
          metrics: {
            value: matchedTerms.length,
            baseline: 0,
            ratio: matchedTerms.length,
            unit: 'keywords',
          },
          sampleSnippet: ev.content?.slice(0, 140),
          metadata: { matchedTerms },
        });
      }
    }

    return anomalies.slice(0, 15);
  }

  /**
   * Detects ghost participants who engaged heavily then vanished.
   */
  private detectGhostParticipants(events: EventSummaryRow[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    const actorStats = new Map<
      string,
      { count: number; firstSeen: number; lastSeen: number; sampleSnippet: string }
    >();

    for (const ev of events) {
      if (!ev.actor || ev.actor === 'System') continue;
      const t = new Date(ev.timestamp).getTime();
      const existing = actorStats.get(ev.actor) || {
        count: 0,
        firstSeen: t,
        lastSeen: t,
        sampleSnippet: ev.content || '',
      };
      existing.count++;
      existing.lastSeen = t;
      actorStats.set(ev.actor, existing);
    }

    const totalDatasetSpanDays =
      (new Date(events[events.length - 1].timestamp).getTime() -
        new Date(events[0].timestamp).getTime()) /
      (1000 * 60 * 60 * 24);

    // If dataset spans > 30 days, look for actors active for < 5 days but with > 30 messages
    if (totalDatasetSpanDays > 30) {
      for (const [actor, stat] of actorStats.entries()) {
        const activeSpanDays = (stat.lastSeen - stat.firstSeen) / (1000 * 60 * 60 * 24);
        if (stat.count >= 30 && activeSpanDays <= 5) {
          anomalies.push({
            id: `anomaly_ghost_${actor.replace(/\s+/g, '_')}`,
            type: 'GHOST_PARTICIPANT',
            severity: 'NOTE',
            title: `Transient / Ghost Participant Detected (${actor})`,
            description: `${actor} sent ${stat.count} messages within a brief ${Math.max(1, Math.round(activeSpanDays))} day window and had no further activity across the remainder of the archive.`,
            timestamp: new Date(stat.firstSeen).toISOString(),
            endTimestamp: new Date(stat.lastSeen).toISOString(),
            actor,
            metrics: {
              value: stat.count,
              baseline: 5,
              ratio: parseFloat((stat.count / 5).toFixed(1)),
              unit: 'messages',
            },
            sampleSnippet: stat.sampleSnippet.slice(0, 100),
          });
        }
      }
    }

    return anomalies.slice(0, 10);
  }

  /**
   * Detects abnormal long single-message monologues (>1500 chars).
   */
  private detectMonologues(events: EventSummaryRow[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    for (const ev of events) {
      if (ev.content && ev.content.length > 2000) {
        anomalies.push({
          id: `anomaly_monologue_${ev.id}`,
          type: 'LEXICAL_SHIFT',
          severity: 'NOTE',
          title: `Extended Monologue Detected (${ev.content.length.toLocaleString()} Chars)`,
          description: `${ev.actor || 'User'} sent an unusually extensive long-form transmission (${ev.content.length} characters).`,
          timestamp: new Date(ev.timestamp).toISOString(),
          actor: ev.actor || undefined,
          metrics: {
            value: ev.content.length,
            baseline: 150,
            ratio: parseFloat((ev.content.length / 150).toFixed(1)),
            unit: 'chars',
          },
          sampleSnippet: ev.content.slice(0, 140) + '...',
        });
      }
    }
    return anomalies.slice(0, 8);
  }
}
