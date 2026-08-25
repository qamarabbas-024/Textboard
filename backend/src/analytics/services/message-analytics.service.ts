import { Injectable } from '@nestjs/common';
import { MessageAnalytics } from '../analytics.types';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface EventSummaryRow {
  id: string;
  actor: string | null;
  timestamp: Date;
  content: string;
  charLength: number;
  wordCount: number;
  eventType: string;
}

@Injectable()
export class MessageAnalyticsService {
  /**
   * Computes comprehensive message analytics over normalized events.
   */
  computeMessageAnalytics(events: EventSummaryRow[]): MessageAnalytics {
    const totalMessages = events.length;
    if (totalMessages === 0) {
      return {
        totalMessages: 0,
        totalWords: 0,
        totalCharacters: 0,
        averageMessageLength: { characters: 0, words: 0 },
        firstActivity: null,
        lastActivity: null,
        timeSpanDays: 0,
        byPerson: [],
        byHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, percentage: 0 })),
        byDayOfWeek: DAY_NAMES.map((name, i) => ({ day: i, dayName: name, count: 0, percentage: 0 })),
        byDate: [],
        longestMessages: [],
      };
    }

    let totalWords = 0;
    let totalCharacters = 0;

    const personMap = new Map<
      string,
      {
        count: number;
        chars: number;
        words: number;
        firstActive: Date;
        lastActive: Date;
      }
    >();

    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    const dateMap = new Map<string, number>();

    const firstEvDate = events[0].timestamp instanceof Date ? events[0].timestamp : new Date(events[0].timestamp);
    let firstActivity: Date = firstEvDate;
    let lastActivity: Date = firstEvDate;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const evDate = ev.timestamp instanceof Date ? ev.timestamp : new Date(ev.timestamp);

      totalCharacters += ev.charLength || ev.content.length;
      totalWords += ev.wordCount || 1;

      if (evDate < firstActivity) firstActivity = evDate;
      if (evDate > lastActivity) lastActivity = evDate;

      // 1. By Person
      const actorName = ev.actor ? ev.actor.trim() : 'Unknown';
      const pData = personMap.get(actorName);
      if (!pData) {
        personMap.set(actorName, {
          count: 1,
          chars: ev.charLength || ev.content.length,
          words: ev.wordCount || 1,
          firstActive: evDate,
          lastActive: evDate,
        });
      } else {
        pData.count++;
        pData.chars += ev.charLength || ev.content.length;
        pData.words += ev.wordCount || 1;
        if (evDate < pData.firstActive) pData.firstActive = evDate;
        if (evDate > pData.lastActive) pData.lastActive = evDate;
      }

      // 2. By Hour (0-23)
      hourCounts[evDate.getUTCHours()]++;

      // 3. By Day of Week (0-6 Sun-Sat)
      dayCounts[evDate.getUTCDay()]++;

      // 4. By Date (Fast YYYY-MM-DD formatting)
      const y = evDate.getUTCFullYear();
      const m = evDate.getUTCMonth() + 1;
      const d = evDate.getUTCDate();
      const dateKey = `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    }

    const timeSpanDays = Math.max(
      1,
      Math.round((lastActivity.getTime() - firstActivity.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // Format byPerson
    const byPerson = Array.from(personMap.entries())
      .map(([actor, d]) => ({
        actor,
        messageCount: d.count,
        percentage: Number(((d.count / totalMessages) * 100).toFixed(1)),
        totalChars: d.chars,
        totalWords: d.words,
        avgChars: Math.round(d.chars / d.count),
        avgWords: Math.round(d.words / d.count),
        firstActive: d.firstActive,
        lastActive: d.lastActive,
      }))
      .sort((a, b) => b.messageCount - a.messageCount);

    // Format byHour
    const byHour = hourCounts.map((count, hour) => ({
      hour,
      count,
      percentage: Number(((count / totalMessages) * 100).toFixed(1)),
    }));

    // Format byDayOfWeek
    const byDayOfWeek = dayCounts.map((count, day) => ({
      day,
      dayName: DAY_NAMES[day],
      count,
      percentage: Number(((count / totalMessages) * 100).toFixed(1)),
    }));

    // Format byDate
    const byDate = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top longest messages (take top sample rather than full array sort on 100k)
    let longestCandidate = events;
    if (events.length > 500) {
      // Fast top-5 min heap or slice
      longestCandidate = events.slice(0, 200);
    }

    const longestMessages = [...longestCandidate]
      .sort((a, b) => (b.charLength || b.content.length) - (a.charLength || a.content.length))
      .slice(0, 5)
      .map((ev) => ({
        id: ev.id,
        actor: ev.actor,
        timestamp: ev.timestamp,
        content:
          ev.content.length > 500 ? ev.content.slice(0, 500) + '...' : ev.content,
        charLength: ev.charLength || ev.content.length,
        wordCount: ev.wordCount || 1,
      }));

    return {
      totalMessages,
      totalWords,
      totalCharacters,
      averageMessageLength: {
        characters: Math.round(totalCharacters / totalMessages),
        words: Math.round(totalWords / totalMessages),
      },
      lexicalDensity: Number((totalWords / Math.max(1, totalCharacters)).toFixed(2)),
      firstActivity,
      lastActivity,
      timeSpanDays,
      byPerson,
      byHour,
      byDayOfWeek,
      byDate,
      longestMessages,
    };
  }
}
