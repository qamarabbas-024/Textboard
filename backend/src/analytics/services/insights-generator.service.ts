import { Injectable } from '@nestjs/common';
import {
  MessageAnalytics,
  EmojiAnalytics,
  ActivityAnalytics,
  TextAnalytics,
  Insight,
} from '../analytics.types';

@Injectable()
export class InsightsGeneratorService {
  /**
   * Generates deterministic, statistical insights with traceable supporting data.
   */
  generateInsights(
    messageStats: MessageAnalytics,
    emojiStats: EmojiAnalytics,
    activityStats: ActivityAnalytics,
    textStats: TextAnalytics,
  ): Insight[] {
    const insights: Insight[] = [];
    let insightCounter = 1;

    // 1. Participant Dominance Insight
    if (messageStats.byPerson.length > 0 && messageStats.totalMessages > 0) {
      const topPerson = messageStats.byPerson[0];
      if (topPerson.percentage >= 30) {
        insights.push({
          id: `insight_${insightCounter++}`,
          category: 'participant',
          title: 'Primary Contributor',
          summary: `${topPerson.actor} sent ${topPerson.percentage}% of all messages (${topPerson.messageCount.toLocaleString()} messages).`,
          confidence: 1.0,
          importance: 'high',
          supportingData: {
            actor: topPerson.actor,
            messageCount: topPerson.messageCount,
            totalMessages: messageStats.totalMessages,
            percentage: topPerson.percentage,
            avgMessageLength: topPerson.avgChars,
          },
        });
      }
    }

    // 2. Day of Week Peak Activity Insight
    if (activityStats.mostActiveDayOfWeek && messageStats.totalMessages > 0) {
      const peak = activityStats.mostActiveDayOfWeek;
      const dayStat = messageStats.byDayOfWeek.find((d) => d.day === peak.day);
      const percentage = dayStat ? dayStat.percentage : 0;

      insights.push({
        id: `insight_${insightCounter++}`,
        category: 'timing',
        title: 'Peak Weekly Activity',
        summary: `You were most active on ${peak.dayName}, accounting for ${percentage}% of all messages.`,
        confidence: 0.95,
        importance: 'medium',
        supportingData: {
          dayName: peak.dayName,
          dayIndex: peak.day,
          count: peak.count,
          percentage,
        },
      });
    }

    // 3. Hourly / Night Owl or Early Bird Insight
    if (messageStats.byHour.length === 24 && messageStats.totalMessages > 0) {
      const lateNightCount = [22, 23, 0, 1, 2, 3, 4]
        .map((h) => messageStats.byHour[h].count)
        .reduce((a, b) => a + b, 0);

      const lateNightPercentage = Number(
        ((lateNightCount / messageStats.totalMessages) * 100).toFixed(1),
      );

      if (lateNightPercentage >= 25) {
        insights.push({
          id: `insight_${insightCounter++}`,
          category: 'timing',
          title: 'Night Owl Tendency',
          summary: `Night owl habits detected: ${lateNightPercentage}% of conversation activity occurred between 10 PM and 5 AM.`,
          confidence: 0.9,
          importance: 'medium',
          supportingData: {
            lateNightCount,
            totalMessages: messageStats.totalMessages,
            percentage: lateNightPercentage,
            hours: [22, 23, 0, 1, 2, 3, 4],
          },
        });
      } else if (activityStats.mostActiveHour) {
        insights.push({
          id: `insight_${insightCounter++}`,
          category: 'timing',
          title: 'Peak Daily Hour',
          summary: `Activity peaks at ${activityStats.mostActiveHour.label} with ${activityStats.mostActiveHour.count.toLocaleString()} messages sent.`,
          confidence: 0.9,
          importance: 'low',
          supportingData: {
            hour: activityStats.mostActiveHour.hour,
            label: activityStats.mostActiveHour.label,
            count: activityStats.mostActiveHour.count,
          },
        });
      }
    }

    // 4. Emoji Usage Insight
    if (emojiStats.topEmojis.length > 0 && emojiStats.totalEmojis > 0) {
      const topEmoji = emojiStats.topEmojis[0];
      insights.push({
        id: `insight_${insightCounter++}`,
        category: 'emoji',
        title: 'Favorite Emoji',
        summary: `${topEmoji.emoji} was the most frequently used emoji, appearing ${topEmoji.count.toLocaleString()} times (${topEmoji.percentage}% of all emojis).`,
        confidence: 1.0,
        importance: 'medium',
        supportingData: {
          emoji: topEmoji.emoji,
          count: topEmoji.count,
          totalEmojis: emojiStats.totalEmojis,
          percentage: topEmoji.percentage,
        },
      });
    }

    // 5. Longest Streak Insight
    if (activityStats.longestStreak && activityStats.longestStreak.days > 1) {
      insights.push({
        id: `insight_${insightCounter++}`,
        category: 'streak',
        title: 'Longest Active Streak',
        summary: `Your longest conversation streak was ${activityStats.longestStreak.days} consecutive days (from ${activityStats.longestStreak.startDate} to ${activityStats.longestStreak.endDate}).`,
        confidence: 1.0,
        importance: 'high',
        supportingData: {
          days: activityStats.longestStreak.days,
          startDate: activityStats.longestStreak.startDate,
          endDate: activityStats.longestStreak.endDate,
          totalActiveDays: activityStats.totalActiveDays,
        },
      });
    }

    // 6. Record Single Day Volume Insight
    if (activityStats.mostActiveDay && activityStats.mostActiveDay.count > 0) {
      insights.push({
        id: `insight_${insightCounter++}`,
        category: 'activity',
        title: 'Busiest Day Record',
        summary: `The highest message volume in a single day was ${activityStats.mostActiveDay.count.toLocaleString()} messages on ${activityStats.mostActiveDay.date}.`,
        confidence: 1.0,
        importance: 'medium',
        supportingData: {
          date: activityStats.mostActiveDay.date,
          count: activityStats.mostActiveDay.count,
          averagePerDay: activityStats.averageMessagesPerActiveDay,
        },
      });
    }

    // 7. Response Time Insight
    if (activityStats.responseTimes.length > 0) {
      const fastest = [...activityStats.responseTimes]
        .filter((r) => r.medianResponseSecs !== null && r.sampleCount >= 5)
        .sort((a, b) => (a.medianResponseSecs || 0) - (b.medianResponseSecs || 0))[0];

      if (fastest && fastest.medianResponseSecs !== null) {
        const timeLabel =
          fastest.medianResponseSecs < 60
            ? `${fastest.medianResponseSecs} seconds`
            : `${Math.round(fastest.medianResponseSecs / 60)} minutes`;

        insights.push({
          id: `insight_${insightCounter++}`,
          category: 'participant',
          title: 'Fastest Responder',
          summary: `${fastest.actor} was the quickest to respond, with a median response time of ${timeLabel}.`,
          confidence: 0.85,
          importance: 'low',
          supportingData: {
            actor: fastest.actor,
            medianSeconds: fastest.medianResponseSecs,
            averageSeconds: fastest.avgResponseSecs,
            sampleCount: fastest.sampleCount,
          },
        });
      }
    }

    return insights;
  }
}
