import { VelocityAnomalyService } from './velocity-anomaly.service';

describe('VelocityAnomalyService', () => {
  const service = new VelocityAnomalyService();

  it('should detect velocity spikes when message rate surges', () => {
    const events: Array<{ actor: string; timestamp: Date; content: string }> = [];

    // Steady baseline: 1 message every hour for 24 hours
    for (let h = 0; h < 24; h++) {
      events.push({
        actor: 'Alice',
        timestamp: new Date(`2026-08-24T${h.toString().padStart(2, '0')}:00:00Z`),
        content: 'Regular status check',
      });
    }

    // Add sudden spike: 30 messages within hour 14
    for (let m = 0; m < 30; m++) {
      events.push({
        actor: 'Bob',
        timestamp: new Date(`2026-08-24T14:${m.toString().padStart(2, '0')}:00Z`),
        content: 'Urgent incident alert message',
      });
    }

    const report = service.detectVelocityAnomalies(events, 60);
    expect(report.totalSpikes).toBeGreaterThan(0);
    expect(report.highestZScore).toBeGreaterThan(2.5);

    const spike = report.anomalies.find((a) => a.type === 'VELOCITY_SPIKE');
    expect(spike?.participatingActors).toContain('Bob');
  });

  it('should detect sudden communication blackouts', () => {
    const events = [
      { actor: 'Alice', timestamp: new Date('2026-08-24T10:00:00Z'), content: 'First message' },
      { actor: 'Alice', timestamp: new Date('2026-08-24T11:00:00Z'), content: 'Second message' },
      { actor: 'Alice', timestamp: new Date('2026-08-24T12:00:00Z'), content: 'Third message' },
      // 36-hour sudden gap during active period
      { actor: 'Bob', timestamp: new Date('2026-08-26T00:00:00Z'), content: 'Resuming after long silence' },
    ];

    const report = service.detectVelocityAnomalies(events, 60);
    expect(report.totalBlackouts).toBeGreaterThan(0);
  });
});
