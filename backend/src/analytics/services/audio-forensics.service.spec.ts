import { AudioForensicsService } from './audio-forensics.service';

describe('AudioForensicsService', () => {
  const service = new AudioForensicsService();

  it('should generate consistent 48-point normalized waveform peaks for a seed', () => {
    const peaks1 = service.generateWaveformPeaks('msg_audio_01', 30, 48);
    const peaks2 = service.generateWaveformPeaks('msg_audio_01', 30, 48);

    expect(peaks1.length).toBe(48);
    expect(peaks1).toEqual(peaks2);
    expect(Math.max(...peaks1)).toBeLessThanOrEqual(100);
    expect(Math.min(...peaks1)).toBeGreaterThanOrEqual(8);
  });

  it('should profile voice notes and detect format and silence ratios', () => {
    const profile = service.profileAudioEvent(
      'voice_message_2026.opus',
      'Voice Note: 42s',
      42,
    );

    expect(profile.durationSeconds).toBe(42);
    expect(profile.fileFormat).toBe('opus');
    expect(profile.isVoiceNote).toBe(true);
    expect(profile.waveformPeaks.length).toBe(48);
    expect(profile.pauseRatio).toBeGreaterThanOrEqual(0);
    expect(profile.pauseRatio).toBeLessThanOrEqual(1);
  });
});
