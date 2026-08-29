'use client';

import React, { useState, useEffect, useRef } from 'react';

interface VoiceNotePlayerProps {
  filename?: string;
  durationSeconds?: number;
  seed?: string;
}

export function VoiceNotePlayer({
  filename = 'voice_note.opus',
  durationSeconds = 18,
  seed = 'audio_seed',
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 1
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Generate deterministic 32-bar waveform profile
  const waveformBars = React.useMemo(() => {
    let hash = 0;
    const str = `${filename}_${seed}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const abs = Math.abs(hash);
    const bars: number[] = [];
    for (let i = 0; i < 32; i++) {
      const t = i / 32;
      const env = Math.sin(t * Math.PI);
      const wave = Math.abs(Math.sin(t * 12 + (abs % 7)) * 0.6 + Math.cos(t * 22) * 0.4);
      const height = Math.min(100, Math.max(15, Math.round((wave * env * 0.85 + 0.15) * 100)));
      bars.push(height);
    }
    return bars;
  }, [filename, seed]);

  const effectiveDuration = durationSeconds || 18;

  useEffect(() => {
    if (isPlaying) {
      const startMs = Date.now() - playbackProgress * (effectiveDuration * 1000) / playbackSpeed;
      const update = () => {
        const elapsed = (Date.now() - startMs) * playbackSpeed;
        const prog = Math.min(1, elapsed / (effectiveDuration * 1000));
        setPlaybackProgress(prog);

        if (prog >= 1) {
          setIsPlaying(false);
          setPlaybackProgress(0);
        } else {
          animFrameRef.current = requestAnimationFrame(update);
        }
      };
      animFrameRef.current = requestAnimationFrame(update);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, effectiveDuration]);

  const togglePlay = () => {
    if (playbackProgress >= 1) {
      setPlaybackProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleBarClick = (index: number) => {
    const newProgress = index / (waveformBars.length - 1);
    setPlaybackProgress(newProgress);
  };

  const cycleSpeed = () => {
    if (playbackSpeed === 1) setPlaybackSpeed(1.5);
    else if (playbackSpeed === 1.5) setPlaybackSpeed(2);
    else setPlaybackSpeed(1);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentSeconds = playbackProgress * effectiveDuration;

  return (
    <div className="my-2 p-2.5 rounded-xl bg-black/40 border border-emerald-500/30 backdrop-blur-md shadow-inner flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-bold text-xs shadow-lg shadow-emerald-500/20 transition-transform active:scale-95 shrink-0"
          title={isPlaying ? 'Pause Audio' : 'Play Voice Note'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Dynamic Equalizer Waveform Bars */}
        <div className="flex-1 flex items-center gap-[2.5px] h-8 cursor-pointer group py-1 select-none">
          {waveformBars.map((height, idx) => {
            const barFraction = idx / waveformBars.length;
            const isPlayed = barFraction <= playbackProgress;

            return (
              <div
                key={idx}
                onClick={() => handleBarClick(idx)}
                style={{ height: `${height}%` }}
                className={`flex-1 min-w-[2px] rounded-full transition-all duration-75 ${
                  isPlayed
                    ? 'bg-gradient-to-t from-emerald-400 to-cyan-300 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                    : 'bg-white/15 group-hover:bg-white/25'
                }`}
              />
            );
          })}
        </div>

        {/* Speed Modifier Pill */}
        <button
          onClick={cycleSpeed}
          className="px-2 py-0.5 rounded-md bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-[10px] font-mono text-emerald-300 font-bold shrink-0 transition-colors"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Track info & timer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 px-1">
        <span className="truncate max-w-[140px] opacity-70">🎤 {filename}</span>
        <span className="text-emerald-400 font-semibold">
          {formatSeconds(currentSeconds)} / {formatSeconds(effectiveDuration)}
        </span>
      </div>
    </div>
  );
}
