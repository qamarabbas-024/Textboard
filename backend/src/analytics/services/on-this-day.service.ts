import { Injectable } from '@nestjs/common';
import { OnThisDayMemory } from '../analytics.types';
import { EventSummaryRow } from './message-analytics.service';

const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

@Injectable()
export class OnThisDayService {
  /**
   * Computes "On This Day" historical memory moments from all normalized events.
   */
  computeMemories(
    events: EventSummaryRow[],
    targetDate: Date = new Date(),
  ): OnThisDayMemory[] {
    const targetMonth = targetDate.getUTCMonth();
    const targetDay = targetDate.getUTCDate();
    const targetYear = targetDate.getUTCFullYear();

    const matchesByYear = new Map<number, EventSummaryRow[]>();

    for (const ev of events) {
      const d = ev.timestamp instanceof Date ? ev.timestamp : new Date(ev.timestamp);
      if (d.getUTCMonth() === targetMonth && d.getUTCDate() === targetDay) {
        const year = d.getUTCFullYear();
        if (!matchesByYear.has(year)) {
          matchesByYear.set(year, []);
        }
        matchesByYear.get(year)!.push(ev);
      }
    }

    const results: OnThisDayMemory[] = [];

    for (const [year, yearEvents] of matchesByYear.entries()) {
      const yearsAgo = targetYear - year;
      const participantsSet = new Set<string>();
      const emojiCounts = new Map<string, number>();

      for (const ev of yearEvents) {
        if (ev.actor) participantsSet.add(ev.actor);
        if (ev.content) {
          const emojis = ev.content.match(EMOJI_REGEX);
          if (emojis) {
            for (const em of emojis) {
              emojiCounts.set(em, (emojiCounts.get(em) || 0) + 1);
            }
          }
        }
      }

      let topEmoji: string | undefined;
      let maxEmojiCount = 0;
      for (const [em, count] of emojiCounts.entries()) {
        if (count > maxEmojiCount) {
          maxEmojiCount = count;
          topEmoji = em;
        }
      }

      // Sort sample messages chronologically
      yearEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const sampleMessages = yearEvents.slice(0, 10).map((ev) => ({
        id: ev.id,
        actor: ev.actor || 'System',
        timestamp: ev.timestamp instanceof Date ? ev.timestamp : new Date(ev.timestamp),
        content: ev.content,
      }));

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${monthNames[targetMonth]} ${targetDay}, ${year}`;

      results.push({
        year,
        yearsAgo: yearsAgo > 0 ? yearsAgo : 0,
        dateStr,
        messageCount: yearEvents.length,
        participants: Array.from(participantsSet),
        topEmoji,
        sampleMessages,
      });
    }

    // Sort by most recent historical year first
    results.sort((a, b) => b.year - a.year);
    return results;
  }
}
