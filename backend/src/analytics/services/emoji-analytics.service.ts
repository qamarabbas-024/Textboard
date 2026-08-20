import { Injectable } from '@nestjs/common';
import { EmojiAnalytics } from '../analytics.types';
import { EventSummaryRow } from './message-analytics.service';

const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

@Injectable()
export class EmojiAnalyticsService {
  /**
   * Computes emoji usage, distribution across actors, and temporal trends.
   */
  computeEmojiAnalytics(events: EventSummaryRow[]): EmojiAnalytics {
    let totalEmojis = 0;
    const globalEmojiCounts = new Map<string, number>();
    const personEmojiMap = new Map<string, Map<string, number>>();
    const dateEmojiMap = new Map<string, { total: number; counts: Map<string, number> }>();

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const content = ev.content;
      if (!content) continue;

      const emojis = content.match(EMOJI_REGEX);
      if (!emojis || emojis.length === 0) continue;

      const actorName = ev.actor ? ev.actor.trim() : 'Unknown';
      const evDate = ev.timestamp instanceof Date ? ev.timestamp : new Date(ev.timestamp);
      const y = evDate.getUTCFullYear();
      const m = evDate.getUTCMonth() + 1;
      const d = evDate.getUTCDate();
      const dateKey = `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;

      for (let e = 0; e < emojis.length; e++) {
        const emoji = emojis[e];
        totalEmojis++;

        // 1. Global counts
        globalEmojiCounts.set(emoji, (globalEmojiCounts.get(emoji) || 0) + 1);

        // 2. By Person
        let personMap = personEmojiMap.get(actorName);
        if (!personMap) {
          personMap = new Map<string, number>();
          personEmojiMap.set(actorName, personMap);
        }
        personMap.set(emoji, (personMap.get(emoji) || 0) + 1);

        // 3. Over Time
        let dateData = dateEmojiMap.get(dateKey);
        if (!dateData) {
          dateData = { total: 0, counts: new Map<string, number>() };
          dateEmojiMap.set(dateKey, dateData);
        }
        dateData.total++;
        dateData.counts.set(emoji, (dateData.counts.get(emoji) || 0) + 1);
      }
    }

    const uniqueEmojis = globalEmojiCounts.size;

    // Top emojis overall
    const topEmojis = Array.from(globalEmojiCounts.entries())
      .map(([emoji, count]) => ({
        emoji,
        count,
        percentage: totalEmojis > 0 ? Number(((count / totalEmojis) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Emojis by person
    const byPerson = Array.from(personEmojiMap.entries()).map(([actor, map]) => {
      let actorTotal = 0;
      const sorted = Array.from(map.entries())
        .map(([emoji, count]) => {
          actorTotal += count;
          return { emoji, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        actor,
        totalEmojis: actorTotal,
        topEmojis: sorted,
      };
    }).sort((a, b) => b.totalEmojis - a.totalEmojis);

    // Emojis over time
    const overTime = Array.from(dateEmojiMap.entries())
      .map(([date, d]) => {
        let bestEmoji = '';
        let bestCount = 0;
        for (const [em, cnt] of d.counts.entries()) {
          if (cnt > bestCount) {
            bestCount = cnt;
            bestEmoji = em;
          }
        }
        return {
          date,
          count: d.total,
          topEmoji: bestEmoji || undefined,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalEmojis,
      uniqueEmojis,
      topEmojis,
      byPerson,
      overTime,
    };
  }
}
