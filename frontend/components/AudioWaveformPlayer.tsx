'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AudioWaveformPlayerProps {
  src?: string;
  durationSec?: number;
  actor?: string;
  timestamp?: string;
  onPlayToggle?: (isPlaying: boolean) => void;
}

export function AudioWaveformPlayer({
  src,
  durationSec = 14,
  actor,
  timestamp,
  onPlayToggle,
}: AudioWaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate deterministic bar heights based on duration
  const bars = Array.from({ length: 28 }, (_, i) => {
    const seed = (i * 37 + durationSec * 13) % 100;
    return Math.max(15, Math.min(90, seed));
  });

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (onPlayToggle) onPlayToggle(nextState);

    if (audioRef.current) {
      if (nextState) audioRef.current.play();
      else audioRef.current.pause();
    }
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= durationSec) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, durationSec]);

  const progressPercent = Math.min(100, (currentTime / (durationSec || 1)) * 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      role="region"
      aria-label={`Voice note audio player from ${actor || 'User'}`}
      className="p-3 rounded-2xl bg-theme-surface/90 border border-theme-border flex flex-col gap-2.5 max-w-sm select-none font-mono text-theme-text shadow-md"
    >
      {/* Header Info */}
      <div className="flex items-center justify-between text-[11px] text-theme-dim">
        <div className="flex items-center gap-1.5 font-bold text-theme-accent">
          <span>🎙️ Voice Note</span>
          {actor && <span className="text-theme-text font-normal">• {actor}</span>}
        </div>
        {timestamp && <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      {/* Main Playback Bar */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause audio note' : 'Play audio note'}
          className="w-10 h-10 rounded-xl bg-theme-raised hover:bg-theme-active border border-theme-border flex items-center justify-center text-theme-accent transition-all active:scale-95 cursor-pointer shadow-xs"
        >
          {isPlaying ? (
            <span className="text-xs">❚❚</span>
          ) : (
            <span className="text-xs pl-0.5">▶</span>
          )}
        </button>

        {/* Waveform Bars Scrubber */}
        <div className="flex-1 flex items-center gap-[3px] h-9 cursor-pointer overflow-hidden py-1">
          {bars.map((height, idx) => {
            const barProgress = (idx / bars.length) * 100;
            const isFilled = barProgress <= progressPercent;

            return (
              <div
                key={idx}
                style={{ height: `${height}%` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-theme-accent shadow-theme-glow'
                    : 'bg-theme-border hover:bg-theme-muted'
                }`}
              />
            );
          })}
        </div>

        {/* Duration Badge */}
        <div className="text-[10px] font-bold text-theme-dim whitespace-nowrap min-w-[36px] text-right">
          {isPlaying ? formatTime(currentTime) : formatTime(durationSec)}
        </div>
      </div>

      {src && <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} className="hidden" />}
    </div>
  );
}
