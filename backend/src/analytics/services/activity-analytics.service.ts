import { Injectable } from '@nestjs/common';
import { ActivityAnalytics } from '../analytics.types';
import { EventSummaryRow } from './message-analytics.service';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

@Injectable()
export class ActivityAnalyticsService {
  /**
   * Computes streaks, gaps, peak times, and participant response latency.
   */
  computeActivityAnalytics(events: EventSummaryRow[]): ActivityAnalytics {
    if (events.length === 0) {
      return {
        mostActiveDay: null,
        mostActiveHour: null,
        mostActiveDayOfWeek: null,
        longestStreak: { days: 0, startDate: '', endDate: '' },
        longestGap: { days: 0, startDate: '', endDate: '' },
        totalActiveDays: 0,
        averageMessagesPerActiveDay: 0,
        responseTimes: [],
      };
    }

    const dateCounts = new Map<string, number>();
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);

    const responseTimesByActor: Record<string, number[]> = {};
    let prevActor: string | null = null;
    let prevTime: number | null = null;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const evDate = ev.timestamp instanceof Date ? ev.timestamp : new Date(ev.timestamp);
      const timeMs = evDate.getTime();

      // 1. Fast Date Key
      const y = evDate.getUTCFullYear();
      const m = evDate.getUTCMonth() + 1;
      const d = evDate.getUTCDate();
      const dateKey = `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
      dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);

      // 2. Hourly & Day counts
      hourCounts[evDate.getUTCHours()]++;
      dayCounts[evDate.getUTCDay()]++;

      // 3. Response time between distinct actors (within 12 hours)
      const actor = ev.actor ? ev.actor.trim() : null;
      if (actor && prevActor && prevActor !== actor && prevTime) {
        const diffSecs = (timeMs - prevTime) / 1000;
        if (diffSecs > 0 && diffSecs < 43200) {
          if (!responseTimesByActor[actor]) responseTimesByActor[actor] = [];
          // Cap samples at 5,000 to keep memory flat
          if (responseTimesByActor[actor].length < 5000) {
            responseTimesByActor[actor].push(diffSecs);
          }
        }
      }

      if (actor) {
        prevActor = actor;
        prevTime = timeMs;
      }
    }

    // 1. Peak Day
    let peakDay = '';
    let peakDayCount = 0;
    for (const [d, count] of dateCounts.entries()) {
      if (count > peakDayCount) {
        peakDayCount = count;
        peakDay = d;
      }
    }

    // 2. Peak Hour
    let peakHour = 0;
    let peakHourCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > peakHourCount) {
        peakHourCount = hourCounts[h];
        peakHour = h;
      }
    }

    // 3. Peak Day of Week
    let peakDayOfWeek = 0;
    let peakDayOfWeekCount = 0;
    for (let d = 0; d < 7; d++) {
      if (dayCounts[d] > peakDayOfWeekCount) {
        peakDayOfWeekCount = dayCounts[d];
        peakDayOfWeek = d;
      }
    }

    // 4. Streaks and Gaps
    const sortedDays = Array.from(dateCounts.keys()).sort();
    let maxStreak = 1;
    let currentStreak = 1;
    let streakStart = sortedDays[0];
    let streakEnd = sortedDays[0];
    let bestStreakStart = sortedDays[0];
    let bestStreakEnd = sortedDays[0];

    let maxGapMs = 0;
    let gapStart = sortedDays[0];
    let gapEnd = sortedDays[0];

    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]).getTime();
      const curr = new Date(sortedDays[i]).getTime();
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        streakEnd = sortedDays[i];
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          bestStreakStart = streakStart;
          bestStreakEnd = streakEnd;
        }
      } else {
        const gapMs = curr - prev;
        if (gapMs > maxGapMs) {
          maxGapMs = gapMs;
          gapStart = sortedDays[i - 1];
          gapEnd = sortedDays[i];
        }
        currentStreak = 1;
        streakStart = sortedDays[i];
        streakEnd = sortedDays[i];
      }
    }

    // 5. Response times summary
    const responseTimes = Object.entries(responseTimesByActor).map(([actor, times]) => {
      const sorted = [...times].sort((a, b) => a - b);
      const avg = Math.round(times.reduce((acc, v) => acc + v, 0) / times.length);
      const median = Math.round(sorted[Math.floor(sorted.length / 2)]);
      return {
        actor,
        avgResponseSecs: avg,
        medianResponseSecs: median,
        sampleCount: times.length,
      };
    }).sort((a, b) => b.sampleCount - a.sampleCount);

    const totalActiveDays = sortedDays.length;
    const averageMessagesPerActiveDay =
      totalActiveDays > 0 ? Math.round(events.length / totalActiveDays) : 0;

    return {
      mostActiveDay: peakDay ? { date: peakDay, count: peakDayCount } : null,
      mostActiveHour: {
        hour: peakHour,
        count: peakHourCount,
        label: `${String(peakHour).padStart(2, '0')}:00 - ${String((peakHour + 1) % 24).padStart(2, '0')}:00`,
      },
      mostActiveDayOfWeek: {
        day: peakDayOfWeek,
        dayName: DAY_NAMES[peakDayOfWeek],
        count: peakDayOfWeekCount,
      },
      longestStreak: {
        days: maxStreak,
        startDate: bestStreakStart,
        endDate: bestStreakEnd,
      },
      longestGap: {
        days: Math.round(maxGapMs / (1000 * 60 * 60 * 24)),
        startDate: gapStart,
        endDate: gapEnd,
      },
      totalActiveDays,
      averageMessagesPerActiveDay,
      responseTimes,
    };
  }
}
