import { MessageAnalyticsService, EventSummaryRow } from './services/message-analytics.service';
import { EmojiAnalyticsService } from './services/emoji-analytics.service';
import { ActivityAnalyticsService } from './services/activity-analytics.service';
import { TextAnalyticsService } from './services/text-analytics.service';
import { InsightsGeneratorService } from './services/insights-generator.service';

describe('TextBoard V1 Analytics Engine', () => {
  let messageService: MessageAnalyticsService;
  let emojiService: EmojiAnalyticsService;
  let activityService: ActivityAnalyticsService;
  let textService: TextAnalyticsService;
  let insightsService: InsightsGeneratorService;

  beforeEach(() => {
    messageService = new MessageAnalyticsService();
    emojiService = new EmojiAnalyticsService();
    activityService = new ActivityAnalyticsService();
    textService = new TextAnalyticsService();
    insightsService = new InsightsGeneratorService();
  });

  describe('Message Analytics', () => {
    it('should compute message volume, author distributions, and temporal aggregations', () => {
      const events: EventSummaryRow[] = [
        {
          id: '1',
          actor: 'Alice',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          content: 'Hello everyone! 🌟 Check https://example.com',
          charLength: 42,
          wordCount: 5,
          eventType: 'message',
        },
        {
          id: '2',
          actor: 'Bob',
          timestamp: new Date('2024-01-15T10:05:00Z'),
          content: 'Hi Alice! 🚀 Looks awesome',
          charLength: 26,
          wordCount: 4,
          eventType: 'message',
        },
        {
          id: '3',
          actor: 'Alice',
          timestamp: new Date('2024-01-16T14:30:00Z'),
          content: 'Here is a much longer message explaining our project plan in great detail.',
          charLength: 75,
          wordCount: 12,
          eventType: 'message',
        },
      ];

      const stats = messageService.computeMessageAnalytics(events);

      expect(stats.totalMessages).toBe(3);
      expect(stats.byPerson.length).toBe(2);
      expect(stats.byPerson[0].actor).toBe('Alice');
      expect(stats.byPerson[0].messageCount).toBe(2);
      expect(stats.byPerson[0].percentage).toBe(66.7);
      expect(stats.byPerson[1].actor).toBe('Bob');
      expect(stats.byPerson[1].messageCount).toBe(1);

      expect(stats.longestMessages.length).toBe(3);
      expect(stats.longestMessages[0].actor).toBe('Alice');
      expect(stats.longestMessages[0].charLength).toBe(75);
    });
  });

  describe('Emoji Analytics', () => {
    it('should extract emojis, rank frequencies, and group by participant and date', () => {
      const events: EventSummaryRow[] = [
        {
          id: '1',
          actor: 'Alice',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          content: 'Great job! 😂 😂 🎉',
          charLength: 20,
          wordCount: 4,
          eventType: 'message',
        },
        {
          id: '2',
          actor: 'Bob',
          timestamp: new Date('2024-01-15T10:05:00Z'),
          content: 'Thanks! 😂 🚀',
          charLength: 14,
          wordCount: 3,
          eventType: 'message',
        },
      ];

      const emojiStats = emojiService.computeEmojiAnalytics(events);

      expect(emojiStats.totalEmojis).toBe(5);
      expect(emojiStats.uniqueEmojis).toBe(3);
      expect(emojiStats.topEmojis[0].emoji).toBe('😂');
      expect(emojiStats.topEmojis[0].count).toBe(3);
      expect(emojiStats.topEmojis[0].percentage).toBe(60);

      expect(emojiStats.byPerson[0].actor).toBe('Alice');
      expect(emojiStats.byPerson[0].totalEmojis).toBe(3);
    });
  });

  describe('Activity Analytics', () => {
    it('should calculate active streaks, quiet gaps, and inter-participant response times', () => {
      const events: EventSummaryRow[] = [
        {
          id: '1',
          actor: 'Alice',
          timestamp: new Date('2024-01-10T10:00:00Z'),
          content: 'Hey Bob',
          charLength: 7,
          wordCount: 2,
          eventType: 'message',
        },
        {
          id: '2',
          actor: 'Bob',
          timestamp: new Date('2024-01-10T10:01:00Z'),
          content: 'Hey Alice',
          charLength: 9,
          wordCount: 2,
          eventType: 'message',
        },
        {
          id: '3',
          actor: 'Alice',
          timestamp: new Date('2024-01-11T12:00:00Z'),
          content: 'Update ready',
          charLength: 12,
          wordCount: 2,
          eventType: 'message',
        },
        {
          id: '4',
          actor: 'Bob',
          timestamp: new Date('2024-01-15T09:00:00Z'),
          content: 'Back from vacation',
          charLength: 18,
          wordCount: 3,
          eventType: 'message',
        },
      ];

      const activity = activityService.computeActivityAnalytics(events);

      expect(activity.longestStreak.days).toBe(2);
      expect(activity.longestStreak.startDate).toBe('2024-01-10');
      expect(activity.longestStreak.endDate).toBe('2024-01-11');
      expect(activity.longestGap.days).toBe(4);
      expect(activity.totalActiveDays).toBe(3);

      expect(activity.responseTimes.length).toBeGreaterThan(0);
      const bobReply = activity.responseTimes.find((r) => r.actor === 'Bob');
      expect(bobReply).toBeDefined();
      expect(bobReply?.avgResponseSecs).toBe(60);
    });
  });

  describe('Text Analytics', () => {
    it('should filter stopwords, extract top keywords, bigrams, URLs, domains, and mentions', () => {
      const events: EventSummaryRow[] = [
        {
          id: '1',
          actor: 'Alice',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          content: 'Working on project architecture with @bob. Check documentation at https://github.com/textboard',
          charLength: 95,
          wordCount: 11,
          eventType: 'message',
        },
        {
          id: '2',
          actor: 'Bob',
          timestamp: new Date('2024-01-15T10:05:00Z'),
          content: 'Reviewed project architecture! Looks great on https://github.com/other',
          charLength: 70,
          wordCount: 9,
          eventType: 'message',
        },
      ];

      const textStats = textService.computeTextAnalytics(events);

      expect(textStats.topWords.some((w) => w.word === 'architecture')).toBe(true);
      expect(textStats.topPhrases.some((p) => p.phrase === 'project architecture')).toBe(true);
      expect(textStats.topDomains[0].domain).toBe('github.com');
      expect(textStats.mentions.some((m) => m.mention === '@bob')).toBe(true);
    });
  });

  describe('Deterministic Traceable Insights Generation', () => {
    it('should generate verifiable insights with exact supporting data', () => {
      const events: EventSummaryRow[] = [
        {
          id: '1',
          actor: 'Ali',
          timestamp: new Date('2024-01-20T23:30:00Z'),
          content: 'Hello world 😂 😂',
          charLength: 17,
          wordCount: 3,
          eventType: 'message',
        },
        {
          id: '2',
          actor: 'Ali',
          timestamp: new Date('2024-01-21T01:00:00Z'),
          content: 'Still coding 😂',
          charLength: 15,
          wordCount: 3,
          eventType: 'message',
        },
        {
          id: '3',
          actor: 'Dana',
          timestamp: new Date('2024-01-21T09:00:00Z'),
          content: 'Good morning!',
          charLength: 13,
          wordCount: 2,
          eventType: 'message',
        },
      ];

      const msg = messageService.computeMessageAnalytics(events);
      const emo = emojiService.computeEmojiAnalytics(events);
      const act = activityService.computeActivityAnalytics(events);
      const txt = textService.computeTextAnalytics(events);

      const insights = insightsService.generateInsights(msg, emo, act, txt);

      expect(insights.length).toBeGreaterThan(0);

      // Dominance insight
      const contributorInsight = insights.find((i) => i.category === 'participant');
      expect(contributorInsight).toBeDefined();
      expect(contributorInsight?.summary).toContain('Ali sent 66.7% of all messages');
      expect(contributorInsight?.supportingData.actor).toBe('Ali');
      expect(contributorInsight?.supportingData.percentage).toBe(66.7);

      // Emoji insight
      const emojiInsight = insights.find((i) => i.category === 'emoji');
      expect(emojiInsight).toBeDefined();
      expect(emojiInsight?.summary).toContain('😂 was the most frequently used emoji');
      expect(emojiInsight?.supportingData.emoji).toBe('😂');
    });
  });

  describe('100,000-Message Benchmark Dataset Test', () => {
    it('should process 100,000 realistic messages across all analytics engines in under 10 seconds in Jest', () => {
      const actors = ['Ali', 'Fatima', 'Zayd', 'Sara'];
      const emojis = ['😂', '❤️', '🔥', '🎉', '👍', '🙏', '✨', '🚀'];
      const baseTime = new Date('2024-01-01T00:00:00Z').getTime();

      const events: EventSummaryRow[] = new Array(100000);

      for (let i = 0; i < 100000; i++) {
        const actor = actors[i % actors.length];
        const emoji = emojis[i % emojis.length];
        const timeOffset = i * 60000 + (i % 3600000);
        const time = new Date(baseTime + timeOffset);

        events[i] = {
          id: `ev_${i}`,
          actor,
          timestamp: time,
          content: `Message #${i} discussing system architecture and roadmap with @sarah ${emoji} https://textboard.local`,
          charLength: 95,
          wordCount: 12,
          eventType: 'message',
        };
      }

      const t0 = performance.now();

      const messageStats = messageService.computeMessageAnalytics(events);
      const emojiStats = emojiService.computeEmojiAnalytics(events);
      const activityStats = activityService.computeActivityAnalytics(events);
      const textStats = textService.computeTextAnalytics(events);
      const insights = insightsService.generateInsights(
        messageStats,
        emojiStats,
        activityStats,
        textStats,
      );

      const elapsed = performance.now() - t0;

      // Verifications
      expect(messageStats.totalMessages).toBe(100000);
      expect(messageStats.byPerson.length).toBe(4);
      expect(messageStats.byPerson[0].messageCount).toBe(25000);
      expect(messageStats.byPerson[0].percentage).toBe(25);

      expect(emojiStats.totalEmojis).toBe(100000);
      expect(emojiStats.uniqueEmojis).toBe(8);

      expect(activityStats.totalActiveDays).toBeGreaterThan(60);
      expect(textStats.totalWords).toBeGreaterThan(500000);
      expect(insights.length).toBeGreaterThan(0);

      // Performance assertion: 100,000 messages should complete in < 10000ms
      expect(elapsed).toBeLessThan(10000);
    });
  });
});
