import { Test, TestingModule } from '@nestjs/testing';
import { ClusteringEngineService } from './clustering-engine.service';
import { EventSummaryRow } from './message-analytics.service';

describe('ClusteringEngineService', () => {
  let service: ClusteringEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClusteringEngineService],
    }).compile();

    service = module.get<ClusteringEngineService>(ClusteringEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle empty event lists gracefully', () => {
    const report = service.clusterEvents('dataset_empty', []);
    expect(report.totalClusters).toBe(0);
    expect(report.clusters).toEqual([]);
  });

  it('should cluster financial and scheduling messages accurately', () => {
    const events: EventSummaryRow[] = [
      {
        id: '1',
        actor: 'Accountant',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        content: 'Please send the invoice and payment receipt for the budget USD fee',
        charLength: 68,
        wordCount: 12,
        eventType: 'text',
      },
      {
        id: '2',
        actor: 'Client',
        timestamp: new Date('2025-01-01T10:05:00Z'),
        content: 'Let us schedule a zoom call meeting tomorrow monday to review',
        charLength: 60,
        wordCount: 11,
        eventType: 'text',
      },
      {
        id: '3',
        actor: 'Developer',
        timestamp: new Date('2025-01-01T10:10:00Z'),
        content: 'Fix the bug in server deploy and database api code',
        charLength: 50,
        wordCount: 9,
        eventType: 'text',
      },
      {
        id: '4',
        actor: 'Friend',
        timestamp: new Date('2025-01-01T10:15:00Z'),
        content: 'Hey what is up today',
        charLength: 20,
        wordCount: 5,
        eventType: 'text',
      },
    ];

    const report = service.clusterEvents('dataset_mixed', events);
    expect(report.totalClusters).toBeGreaterThan(0);

    const financialCluster = report.clusters.find((c) => c.category === 'financial');
    expect(financialCluster).toBeDefined();
    expect(financialCluster?.messageCount).toBe(1);

    const technicalCluster = report.clusters.find((c) => c.category === 'technical');
    expect(technicalCluster).toBeDefined();
  });
});
