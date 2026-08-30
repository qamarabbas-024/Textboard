import { EmotionRadarService } from './emotion-radar.service';

describe('EmotionRadarService', () => {
  const service = new EmotionRadarService();

  it('should detect Joy in celebratory and appreciative messages', () => {
    const res = service.analyzeTextEmotion('Congrats everyone! Super awesome win and great job today 🎉🚀');
    expect(res.dominantEmotion).toBe('joy');
    expect(res.scores.joy).toBeGreaterThan(0.5);
    expect(res.overallValence).toBeGreaterThan(0);
  });

  it('should detect Anger in hostile or frustrated messages', () => {
    const res = service.analyzeTextEmotion('This is unacceptable garbage, worst mistake ever and totally ridiculous 😡');
    expect(res.dominantEmotion).toBe('anger');
    expect(res.scores.anger).toBeGreaterThan(0.5);
    expect(res.overallValence).toBeLessThan(0);
  });

  it('should detect Fear in threat and risk messages', () => {
    const res = service.analyzeTextEmotion('Critical security breach warning! Panic and emergency threat detected ⚠️');
    expect(res.dominantEmotion).toBe('fear');
    expect(res.scores.fear).toBeGreaterThan(0.4);
  });

  it('should aggregate emotions across actors and timeline bins', () => {
    const events = [
      { actor: 'Alice', content: 'Awesome job team 🎉', timestamp: new Date('2026-08-24T10:00:00Z') },
      { actor: 'Bob', content: 'This is a terrible disaster 😡', timestamp: new Date('2026-08-24T11:00:00Z') },
      { actor: 'Alice', content: 'We will plan the next launch tomorrow 📅', timestamp: new Date('2026-08-25T09:00:00Z') },
    ];

    const agg = service.aggregateDatasetEmotions(events);
    expect(agg.actorBreakdown.length).toBe(2);
    expect(agg.timelineTrajectory.length).toBe(2);

    const alice = agg.actorBreakdown.find((a) => a.actor === 'Alice');
    const bob = agg.actorBreakdown.find((a) => a.actor === 'Bob');

    expect(alice?.profile.dominantEmotion).toBe('joy');
    expect(bob?.profile.dominantEmotion).toBe('anger');
  });
});
