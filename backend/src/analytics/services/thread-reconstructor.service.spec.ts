import { Test, TestingModule } from '@nestjs/testing';
import { ThreadReconstructorService } from './thread-reconstructor.service';
import { EventSummaryRow } from './message-analytics.service';

describe('ThreadReconstructorService', () => {
  let service: ThreadReconstructorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThreadReconstructorService],
    }).compile();

    service = module.get<ThreadReconstructorService>(ThreadReconstructorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should group conversation bursts into discrete threads', () => {
    const baseTime = new Date('2025-05-10T14:00:00Z').getTime();

    // Thread 1: 4 messages 1 minute apart
    const thread1Events: EventSummaryRow[] = [
      {
        id: 't1_1',
        actor: 'Alice',
        timestamp: new Date(baseTime),
        content: 'Hey are we launching today?',
        charLength: 28,
        wordCount: 5,
        eventType: 'text',
      },
      {
        id: 't1_2',
        actor: 'Bob',
        timestamp: new Date(baseTime + 60000),
        content: 'Yes all tests passed',
        charLength: 20,
        wordCount: 4,
        eventType: 'text',
      },
      {
        id: 't1_3',
        actor: 'Alice',
        timestamp: new Date(baseTime + 120000),
        content: 'Awesome pushing now',
        charLength: 19,
        wordCount: 3,
        eventType: 'text',
      },
      {
        id: 't1_4',
        actor: 'Bob',
        timestamp: new Date(baseTime + 180000),
        content: 'Standing by for logs',
        charLength: 20,
        wordCount: 4,
        eventType: 'text',
      },
    ];

    // Thread 2: 3 hours later, 3 messages
    const thread2Time = baseTime + 3 * 3600 * 1000;
    const thread2Events: EventSummaryRow[] = [
      {
        id: 't2_1',
        actor: 'Charlie',
        timestamp: new Date(thread2Time),
        content: 'Dinner tonight anyone?',
        charLength: 22,
        wordCount: 3,
        eventType: 'text',
      },
      {
        id: 't2_2',
        actor: 'Alice',
        timestamp: new Date(thread2Time + 30000),
        content: 'I am in for ramen',
        charLength: 17,
        wordCount: 5,
        eventType: 'text',
      },
      {
        id: 't2_3',
        actor: 'Bob',
        timestamp: new Date(thread2Time + 60000),
        content: 'Count me in',
        charLength: 11,
        wordCount: 3,
        eventType: 'text',
      },
    ];

    const report = service.reconstructThreads('dataset_threaded', [
      ...thread1Events,
      ...thread2Events,
    ]);

    expect(report.totalThreads).toBe(2);
    expect(report.threads[0].messageCount).toBe(4);
    expect(report.threads[0].topicTitle).toContain('launching');
    expect(report.threads[1].messageCount).toBe(3);
  });
});
