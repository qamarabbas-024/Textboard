import { DeduplicationService } from './deduplication.service';

describe('DeduplicationService', () => {
  let service: DeduplicationService;

  beforeEach(() => {
    service = new DeduplicationService();
  });

  it('should detect and remove exact duplicates within temporal proximity window', () => {
    const baseTime = new Date('2026-08-20T12:00:00Z');
    const events = [
      { id: '1', content: 'Urgent meeting update', actor: 'Alice', timestamp: baseTime },
      { id: '2', content: 'urgent meeting update', actor: 'Alice', timestamp: new Date(baseTime.getTime() + 30000) },
      { id: '3', content: 'Different message', actor: 'Bob', timestamp: new Date(baseTime.getTime() + 60000) },
    ];

    const result = service.deduplicateEvents(events, { timeWindowSeconds: 120 });

    expect(result.unique.length).toBe(2);
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.duplicateIds).toContain('2');
  });

  it('should preserve identical messages if outside the time proximity window', () => {
    const baseTime = new Date('2026-08-20T12:00:00Z');
    const events = [
      { id: '1', content: 'Good morning', actor: 'Alice', timestamp: baseTime },
      { id: '2', content: 'Good morning', actor: 'Alice', timestamp: new Date(baseTime.getTime() + 86400000) }, // 1 day later
    ];

    const result = service.deduplicateEvents(events, { timeWindowSeconds: 60 });
    expect(result.unique.length).toBe(2);
    expect(result.duplicatesRemoved).toBe(0);
  });
});
