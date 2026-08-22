import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { EventSummaryRow } from './message-analytics.service';

describe('AnomalyDetectorService', () => {
  let service: AnomalyDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnomalyDetectorService],
    }).compile();

    service = module.get<AnomalyDetectorService>(AnomalyDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle empty or small event streams gracefully', () => {
    const res = service.detectAnomalies('dataset_empty', []);
    expect(res.totalAnomalies).toBe(0);
    expect(res.anomalies).toEqual([]);
  });

  it('should detect late night surges (00:00 - 05:00)', () => {
    const events: EventSummaryRow[] = [];
    const baseDate = new Date('2025-06-15T02:00:00Z');

    // Create 30 messages within 2 AM
    for (let i = 0; i < 30; i++) {
      events.push({
        id: `ev_late_${i}`,
        actor: 'Nocturnal Actor',
        timestamp: new Date(baseDate.getTime() + i * 30000),
        content: `Late night message ${i}`,
        charLength: 25,
        wordCount: 4,
        eventType: 'text',
      });
    }

    const report = service.detectAnomalies('dataset_latenight', events);
    const lateNightAlerts = report.anomalies.filter((a) => a.type === 'LATE_NIGHT_SURGE');
    expect(lateNightAlerts.length).toBeGreaterThan(0);
    expect(lateNightAlerts[0].actor).toBe('Nocturnal Actor');
  });

  it('should detect velocity bursts (>25 msgs in 5 mins)', () => {
    const events: EventSummaryRow[] = [];
    const baseDate = new Date('2025-06-15T14:00:00Z');

    // 35 messages within 3 minutes
    for (let i = 0; i < 35; i++) {
      events.push({
        id: `ev_burst_${i}`,
        actor: 'Fast Typer',
        timestamp: new Date(baseDate.getTime() + i * 5000),
        content: `Burst message ${i}`,
        charLength: 20,
        wordCount: 3,
        eventType: 'text',
      });
    }

    const report = service.detectAnomalies('dataset_burst', events);
    const burstAlerts = report.anomalies.filter((a) => a.type === 'VELOCITY_BURST');
    expect(burstAlerts.length).toBeGreaterThan(0);
    expect(burstAlerts[0].severity).toBeDefined();
  });

  it('should detect dormancy gaps (>14 days)', () => {
    const events: EventSummaryRow[] = [
      {
        id: 'ev_1',
        actor: 'Alice',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        content: 'See you next month',
        charLength: 20,
        wordCount: 4,
        eventType: 'text',
      },
      {
        id: 'ev_2',
        actor: 'Bob',
        timestamp: new Date('2025-01-01T10:05:00Z'),
        content: 'Bye',
        charLength: 3,
        wordCount: 1,
        eventType: 'text',
      },
      {
        id: 'ev_3',
        actor: 'Alice',
        timestamp: new Date('2025-01-01T10:10:00Z'),
        content: 'Bye',
        charLength: 3,
        wordCount: 1,
        eventType: 'text',
      },
      {
        id: 'ev_4',
        actor: 'Alice',
        timestamp: new Date('2025-01-01T10:15:00Z'),
        content: 'Take care',
        charLength: 9,
        wordCount: 2,
        eventType: 'text',
      },
      {
        id: 'ev_5',
        actor: 'Bob',
        timestamp: new Date('2025-02-15T12:00:00Z'), // 45 days later
        content: 'Hello again! Long time',
        charLength: 23,
        wordCount: 4,
        eventType: 'text',
      },
    ];

    const report = service.detectAnomalies('dataset_dormancy', events);
    const dormancyAlerts = report.anomalies.filter((a) => a.type === 'EXTENDED_DORMANCY');
    expect(dormancyAlerts.length).toBeGreaterThan(0);
    expect(dormancyAlerts[0].metrics.value).toBeGreaterThanOrEqual(44);
  });

  it('should detect urgency / security keywords', () => {
    const events: EventSummaryRow[] = [
      {
        id: 'ev_u1',
        actor: 'Boss',
        timestamp: new Date('2025-03-01T10:00:00Z'),
        content: 'Please help immediately, this is urgent ASAP!',
        charLength: 45,
        wordCount: 8,
        eventType: 'text',
      },
      {
        id: 'ev_u2',
        actor: 'Boss',
        timestamp: new Date('2025-03-01T10:01:00Z'),
        content: 'Normal message',
        charLength: 14,
        wordCount: 2,
        eventType: 'text',
      },
      {
        id: 'ev_u3',
        actor: 'Boss',
        timestamp: new Date('2025-03-01T10:02:00Z'),
        content: 'Normal message 2',
        charLength: 16,
        wordCount: 3,
        eventType: 'text',
      },
      {
        id: 'ev_u4',
        actor: 'Boss',
        timestamp: new Date('2025-03-01T10:03:00Z'),
        content: 'Normal message 3',
        charLength: 16,
        wordCount: 3,
        eventType: 'text',
      },
      {
        id: 'ev_u5',
        actor: 'Boss',
        timestamp: new Date('2025-03-01T10:04:00Z'),
        content: 'Normal message 4',
        charLength: 16,
        wordCount: 3,
        eventType: 'text',
      },
    ];

    const report = service.detectAnomalies('dataset_urgency', events);
    const urgencyAlerts = report.anomalies.filter((a) => a.type === 'URGENCY_SPIKE');
    expect(urgencyAlerts.length).toBeGreaterThan(0);
    expect(urgencyAlerts[0].title).toContain('Urgency');
  });
});
