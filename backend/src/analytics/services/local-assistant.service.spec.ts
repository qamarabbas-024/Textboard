import { LocalAssistantService } from './local-assistant.service';

describe('LocalAssistantService (100% On-Device Natural Language Query Assistant)', () => {
  let service: LocalAssistantService;
  let mockPrisma: any;
  let mockAnalyticsEngine: any;
  let mockAnomalyDetector: any;
  let mockClusteringEngine: any;

  beforeEach(() => {
    mockPrisma = {
      dataset: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ds_test_assistant',
          name: 'Engineering Team Chat',
          sourceType: 'text-chat',
          totalEvents: 10000,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-06-01'),
        }),
      },
      timelineEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'evt_1',
            timestamp: new Date('2025-02-01T10:00:00Z'),
            actor: 'Alice Lead',
            content: 'Let us finalize the distributed streaming architecture design',
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    mockAnalyticsEngine = {
      getDatasetAnalytics: jest.fn().mockResolvedValue({
        messageAnalytics: {
          totalMessages: 10000,
          authorStats: [
            { author: 'Alice Lead', messageCount: 6000, totalCharacters: 180000 },
            { author: 'Bob Architect', messageCount: 4000, totalCharacters: 120000 },
          ],
        },
        activityAnalytics: {
          busiestHour: 14,
          busiestDay: 'Wednesday',
          totalActiveDays: 120,
          averageMessagesPerActiveDay: 83.3,
          longestStreak: { days: 15, startDate: '2025-02-01', endDate: '2025-02-15' },
          longestGap: { days: 4, startDate: '2025-03-10', endDate: '2025-03-14' },
        },
        emojiAnalytics: {
          totalEmojisUsed: 850,
          topEmojis: [{ emoji: '🚀', count: 420, percentage: 49.4 }],
        },
      }),
    };

    mockAnomalyDetector = {
      detectAnomalies: jest.fn().mockReturnValue({
        datasetId: 'ds_test_assistant',
        totalAnomalies: 1,
        anomalies: [
          {
            id: 'anom_1',
            type: 'VELOCITY_BURST',
            severity: 'CRITICAL',
            title: 'Message Surge',
            description: 'Significant message surge on product release day',
            timestamp: '2025-02-14T10:00:00Z',
            metrics: { value: 850, baseline: 100, ratio: 8.5, unit: 'msgs/hour' },
          },
        ],
      }),
    };

    mockClusteringEngine = {
      clusterEvents: jest.fn().mockReturnValue({
        datasetId: 'ds_test_assistant',
        totalClusters: 1,
        clusters: [
          {
            id: 'clust_1',
            name: 'System Architecture',
            category: 'technical',
            icon: '⚙️',
            messageCount: 3500,
            percentage: 35,
            topKeywords: [{ word: 'streaming', weight: 10 }],
            topParticipants: [{ actor: 'Alice Lead', count: 2000 }],
            sampleMessages: [],
          },
        ],
      }),
    };

    service = new LocalAssistantService(
      mockPrisma,
      mockAnalyticsEngine,
      mockAnomalyDetector,
      mockClusteringEngine,
    );
  });

  it('should interpret participant leaderboard queries and return top actors', async () => {
    const res = await service.askQuestion('ds_test_assistant', 'Who sent the most messages in our chat?');

    expect(res.intent).toBe('TOP_ACTORS');
    expect(res.answer).toContain('Alice Lead');
    expect(res.answer).toContain('6,000 messages');
    expect(res.keyStats.find((s) => s.label === 'TOP CONTRIBUTOR')?.value).toBe('Alice Lead');
  });

  it('should interpret peak schedule queries and return circadian stats', async () => {
    const res = await service.askQuestion('ds_test_assistant', 'When is our peak chat time of day?');

    expect(res.intent).toBe('PEAK_TIME');
    expect(res.answer).toContain('2:00 PM');
    expect(res.answer).toContain('Wednesday');
    expect(res.keyStats.find((s) => s.label === 'BUSIEST DAY')?.value).toBe('Wednesday');
  });

  it('should interpret forensic anomaly scan queries and return surges', async () => {
    const res = await service.askQuestion('ds_test_assistant', 'What are the main activity spikes or anomalies?');

    expect(res.intent).toBe('ANOMALY_AUDIT');
    expect(res.answer).toContain('VELOCITY_BURST');
    expect(res.keyStats.find((s) => s.label === 'ANOMALIES FOUND')?.value).toBe('1');
  });

  it('should handle search queries with cited message snippets', async () => {
    const res = await service.askQuestion('ds_test_assistant', 'search for architecture design');

    expect(res.intent).toBe('KEYWORD_SEARCH');
    expect(res.answer).toContain('Semantic Search Results');
    expect(res.citations.length).toBe(1);
    expect(res.citations[0].actor).toBe('Alice Lead');
    expect(res.citations[0].snippet).toContain('distributed streaming architecture');
  });
});
