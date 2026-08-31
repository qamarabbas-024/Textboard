import { Injectable, Logger } from '@nestjs/common';

export interface VelocityAnomaly {
  id: string;
  type: 'VELOCITY_SPIKE' | 'SUDDEN_BLACKOUT';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  messageCount: number;
  expectedMessageCount: number;
  zScore: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  participatingActors: string[];
  description: string;
}

export interface VelocityAnomalyReport {
  anomalies: VelocityAnomaly[];
  totalSpikes: number;
  totalBlackouts: number;
  highestZScore: number;
  baselineHourlyRate: number;
}

@Injectable()
export class VelocityAnomalyService {
  private readonly logger = new Logger(VelocityAnomalyService.name);

  /**
   * Evaluates rolling time windows to detect forensic velocity spikes and uncharacteristic silences
   */
  detectVelocityAnomalies(
    events: Array<{ actor: string | null; timestamp: Date; content: string }>,
    windowMinutes = 60,
  ): VelocityAnomalyReport {
    if (!events.length) {
      return {
        anomalies: [],
        totalSpikes: 0,
        totalBlackouts: 0,
        highestZScore: 0,
        baselineHourlyRate: 0,
      };
    }

    const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstTime = sorted[0].timestamp.getTime();
    const lastTime = sorted[sorted.length - 1].timestamp.getTime();
    const totalDurationHours = Math.max(1, (lastTime - firstTime) / (1000 * 60 * 60));
    const baselineHourlyRate = parseFloat((events.length / totalDurationHours).toFixed(2));

    const windowMs = windowMinutes * 60 * 1000;
    const windowCounts: Array<{ time: number; count: number; actors: Set<string> }> = [];

    // Single-pass O(N) linear binning
    let eventIdx = 0;
    const n = sorted.length;

    for (let t = firstTime; t <= lastTime; t += windowMs) {
      const windowEnd = t + windowMs;
      const actors = new Set<string>();
      let count = 0;

      while (eventIdx < n && sorted[eventIdx].timestamp.getTime() < windowEnd) {
        const actor = sorted[eventIdx].actor;
        if (actor) actors.add(actor);
        count++;
        eventIdx++;
      }

      windowCounts.push({
        time: t,
        count,
        actors,
      });
    }

    if (windowCounts.length < 3) {
      return {
        anomalies: [],
        totalSpikes: 0,
        totalBlackouts: 0,
        highestZScore: 0,
        baselineHourlyRate,
      };
    }

    // Compute mean and standard deviation of window counts
    const counts = windowCounts.map((w) => w.count);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
    const stdDev = Math.max(1, Math.sqrt(variance));

    const anomalies: VelocityAnomaly[] = [];
    let highestZScore = 0;

    // Detect Spikes (Z-Score >= 2.5)
    windowCounts.forEach((w, idx) => {
      const zScore = parseFloat(((w.count - mean) / stdDev).toFixed(2));
      if (zScore >= 2.5 && w.count >= 5) {
        if (zScore > highestZScore) highestZScore = zScore;
        const severity = zScore >= 4.5 ? 'CRITICAL' : zScore >= 3.2 ? 'HIGH' : 'MEDIUM';
        anomalies.push({
          id: `spike_${w.time}`,
          type: 'VELOCITY_SPIKE',
          startTime: new Date(w.time).toISOString(),
          endTime: new Date(w.time + windowMs).toISOString(),
          durationMinutes: windowMinutes,
          messageCount: w.count,
          expectedMessageCount: Math.round(mean),
          zScore,
          severity,
          participatingActors: Array.from(w.actors),
          description: `Abnormal surge: ${w.count} messages in ${windowMinutes}m (${zScore}σ above baseline)`,
        });
      }
    });

    // Detect Sudden Blackouts (Inter-message gaps > 3x mean interval during active periods)
    const expectedGapMs = (lastTime - firstTime) / Math.max(1, events.length);
    for (let i = 1; i < sorted.length; i++) {
      const gapMs = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
      const gapHours = gapMs / (1000 * 60 * 60);

      // Flag sudden silences between 8 AM and 8 PM if gap is unusually long (> 12 hours)
      const prevHour = sorted[i - 1].timestamp.getUTCHours();
      if (gapHours >= 12 && prevHour >= 8 && prevHour <= 20) {
        const gapZ = parseFloat((gapMs / Math.max(1, expectedGapMs)).toFixed(1));
        if (gapZ >= 2.5 || gapHours >= 24) {
          anomalies.push({
            id: `blackout_${sorted[i - 1].timestamp.getTime()}`,
            type: 'SUDDEN_BLACKOUT',
            startTime: sorted[i - 1].timestamp.toISOString(),
            endTime: sorted[i].timestamp.toISOString(),
            durationMinutes: Math.round(gapHours * 60),
            messageCount: 0,
            expectedMessageCount: Math.round(gapHours * baselineHourlyRate),
            zScore: Math.min(10, gapZ),
            severity: gapHours >= 48 ? 'CRITICAL' : gapHours >= 24 ? 'HIGH' : 'MEDIUM',
            participatingActors: [sorted[i - 1].actor || 'Unknown', sorted[i].actor || 'Unknown'],
            description: `Sudden silence: ${Math.round(gapHours)}h gap following activity from ${sorted[i - 1].actor || 'Unknown'}`,
          });
        }
      }
    }

    const totalSpikes = anomalies.filter((a) => a.type === 'VELOCITY_SPIKE').length;
    const totalBlackouts = anomalies.filter((a) => a.type === 'SUDDEN_BLACKOUT').length;

    return {
      anomalies,
      totalSpikes,
      totalBlackouts,
      highestZScore,
      baselineHourlyRate,
    };
  }
}
