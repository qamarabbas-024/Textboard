import { BehavioralProfilerService } from './behavioral-profiler.service';

describe('BehavioralProfilerService', () => {
  const service = new BehavioralProfilerService();

  it('should calculate nocturnal indices for night messaging', () => {
    const events = [
      { actor: 'NightOwl', timestamp: new Date('2026-08-24T02:00:00Z'), content: 'Working late' },
      { actor: 'NightOwl', timestamp: new Date('2026-08-24T03:30:00Z'), content: 'Still coding' },
      { actor: 'DayWalker', timestamp: new Date('2026-08-24T14:00:00Z'), content: 'Good afternoon' },
      { actor: 'DayWalker', timestamp: new Date('2026-08-24T15:00:00Z'), content: 'In meeting' },
    ];

    const report = service.profileActors(events);
    expect(report.actorProfiles.length).toBe(2);

    const night = report.actorProfiles.find((p) => p.actor === 'NightOwl');
    const day = report.actorProfiles.find((p) => p.actor === 'DayWalker');

    expect(night?.nocturnalIndex).toBe(100);
    expect(day?.nocturnalIndex).toBe(0);
    expect(report.datasetNocturnalAverage).toBe(50);
  });

  it('should compute burstiness and initiation ratios', () => {
    const events = [
      { actor: 'Alice', timestamp: new Date('2026-08-24T10:00:00Z'), content: 'Hey' },
      { actor: 'Alice', timestamp: new Date('2026-08-24T10:00:30Z'), content: 'Look at this' },
      { actor: 'Alice', timestamp: new Date('2026-08-24T10:01:00Z'), content: 'Fast burst' },
      // 5 hour gap
      { actor: 'Bob', timestamp: new Date('2026-08-24T16:00:00Z'), content: 'Starting new thread' },
    ];

    const report = service.profileActors(events);
    expect(report.actorProfiles.length).toBe(2);

    const alice = report.actorProfiles.find((p) => p.actor === 'Alice');
    const bob = report.actorProfiles.find((p) => p.actor === 'Bob');

    expect(alice?.burstinessIndex).toBeGreaterThanOrEqual(0);
    expect(bob?.conversationInitiationRatio).toBeGreaterThan(0);
  });
});
