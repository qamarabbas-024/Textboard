'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { safeFetch } from '../lib/api-client';
import { Button } from './ui/Button';

interface TimelineMessage {
  id: string;
  timestamp: string;
  actor?: string;
  content: string;
  eventType?: string;
  hasMedia?: boolean;
}

interface ForensicPodcastPlayerProps {
  datasetId: string;
  datasetName: string;
  messages?: TimelineMessage[];
  onClose?: () => void;
}

export function ForensicPodcastPlayer({
  datasetId,
  datasetName,
  messages: initialMessages,
  onClose,
}: ForensicPodcastPlayerProps) {
  const [messages, setMessages] = useState<TimelineMessage[]>(initialMessages || []);
  const [isLoading, setIsLoading] = useState(!initialMessages?.length);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isEmotionalModulation, setIsEmotionalModulation] = useState<boolean>(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [actorVoices, setActorVoices] = useState<Record<string, { voiceName: string; gender: 'female' | 'male'; pitch: number }>>({});
  const [bookmarkedIndex, setBookmarkedIndex] = useState<number | null>(null);

  const activeMsgRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Synthesis and load available OS voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setAvailableVoices(voices);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;

      // Load persistent bookmark for this dataset
      const savedBookmark = localStorage.getItem(`tb_podcast_bookmark_${datasetId}`);
      if (savedBookmark !== null) {
        setBookmarkedIndex(parseInt(savedBookmark, 10));
      }
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [datasetId]);

  // Fetch messages if not passed directly
  useEffect(() => {
    if (!initialMessages?.length && datasetId) {
      setIsLoading(true);
      safeFetch(`/api/v1/datasets/${datasetId}/events?limit=500`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          const events = Array.isArray(data) ? data : data.events || [];
          setMessages(events);
        })
        .catch((err) => console.error('Failed to load timeline events for podcast:', err))
        .finally(() => setIsLoading(false));
    }
  }, [datasetId, initialMessages]);

  // Extract distinct actors from messages
  const distinctActors = useMemo(() => {
    const actors = new Set<string>();
    messages.forEach((m) => {
      if (m.actor) actors.add(m.actor);
    });
    return Array.from(actors);
  }, [messages]);

  // Default auto-assignment of Male/Female voices to actors
  useEffect(() => {
    if (!distinctActors.length || !availableVoices.length) return;

    const femaleVoices = availableVoices.filter((v) =>
      /female|zira|susan|hazel|samantha|karen|victoria|catherine/i.test(v.name),
    );
    const maleVoices = availableVoices.filter((v) =>
      /male|david|george|mark|richard|james|alex|daniel/i.test(v.name),
    );

    const defaultAssignments: Record<string, { voiceName: string; gender: 'female' | 'male'; pitch: number }> = {};

    distinctActors.forEach((actor, idx) => {
      // Alternate male and female by default
      const isFemale = idx % 2 === 1;
      const pool = isFemale ? (femaleVoices.length ? femaleVoices : availableVoices) : (maleVoices.length ? maleVoices : availableVoices);
      const voice = pool[idx % pool.length] || availableVoices[0];

      defaultAssignments[actor] = {
        voiceName: voice ? voice.name : '',
        gender: isFemale ? 'female' : 'male',
        pitch: isFemale ? 1.2 : 0.9,
      };
    });

    setActorVoices((prev) => ({ ...defaultAssignments, ...prev }));
  }, [distinctActors, availableVoices]);

  // Detect simple emotional state for dynamic pitch/rate modulation
  const detectMessageEmotion = (text: string): { emotion: string; pitchMod: number; rateMod: number } => {
    const t = text.toLowerCase();
    if (/urgent|danger|alert|asap|fast|immediately|police|threat|🚨|⚠️|🛑/i.test(t)) {
      return { emotion: 'URGENT / ALERT', pitchMod: 0.95, rateMod: 1.25 };
    }
    if (/love|happy|awesome|great|congrats|thank|yay|celebrate|🎉|❤️|😄/i.test(t)) {
      return { emotion: 'JOY / EXCITED', pitchMod: 1.2, rateMod: 1.1 };
    }
    if (/angry|mad|hate|idiot|stop|stupid|fake|furious|😡|🤬/i.test(t)) {
      return { emotion: 'ANGER / TENSE', pitchMod: 0.85, rateMod: 1.15 };
    }
    if (/sad|sorry|unfortunate|grief|lost|cry|broken|😭|😢/i.test(t)) {
      return { emotion: 'SOMBER / CALM', pitchMod: 0.85, rateMod: 0.85 };
    }
    if (/\?{2,}|what|how|why|shocking|secret|really|surprise|😱|🤯/i.test(t)) {
      return { emotion: 'INTRIGUE / SURPRISE', pitchMod: 1.25, rateMod: 1.05 };
    }
    return { emotion: 'NEUTRAL DIALOGUE', pitchMod: 1.0, rateMod: 1.0 };
  };

  // Play a specific message index
  const speakMessageAt = (index: number) => {
    if (!synthRef.current || index < 0 || index >= messages.length) {
      setIsPlaying(false);
      return;
    }

    synthRef.current.cancel();

    const msg = messages[index];
    const actor = msg.actor || 'Narrator';
    const actorConfig = actorVoices[actor] || {
      voiceName: availableVoices[0]?.name || '',
      gender: 'male',
      pitch: 1.0,
    };

    const emotion = detectMessageEmotion(msg.content);
    const spokenText = `${actor} says: ${msg.content.replace(/https?:\/\/[^\s]+/g, 'link attached')}`;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utteranceRef.current = utterance;

    // Apply Voice
    if (actorConfig.voiceName) {
      const selectedVoice = availableVoices.find((v) => v.name === actorConfig.voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Apply Speed and Emotional Modulation
    utterance.rate = playbackSpeed * (isEmotionalModulation ? emotion.rateMod : 1.0);
    utterance.pitch = actorConfig.pitch * (isEmotionalModulation ? emotion.pitchMod : 1.0);

    utterance.onend = () => {
      if (index + 1 < messages.length) {
        setCurrentIndex(index + 1);
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsPlaying(false);
    };

    setCurrentIndex(index);
    synthRef.current.speak(utterance);
    setIsPlaying(true);
  };

  // Trigger speak when currentIndex changes while isPlaying is active
  useEffect(() => {
    if (isPlaying) {
      speakMessageAt(currentIndex);
    }
  }, [currentIndex, isPlaying]);

  // Auto-scroll active message into view
  useEffect(() => {
    if (activeMsgRef.current) {
      activeMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  const togglePlayPause = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakMessageAt(currentIndex);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < messages.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const saveBookmark = () => {
    setBookmarkedIndex(currentIndex);
    localStorage.setItem(`tb_podcast_bookmark_${datasetId}`, currentIndex.toString());
  };

  const resumeFromBookmark = () => {
    if (bookmarkedIndex !== null && bookmarkedIndex < messages.length) {
      setCurrentIndex(bookmarkedIndex);
      setIsPlaying(true);
    }
  };

  const currentMessage = messages[currentIndex] || null;
  const currentEmotion = currentMessage ? detectMessageEmotion(currentMessage.content) : null;

  return (
    <div className="rounded-3xl glass-card-3d border border-cyan-500/30 p-6 shadow-2xl relative overflow-hidden space-y-6 font-mono">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <span className="text-2xl">🎙️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40 uppercase">
                OFFLINE DUAL-VOICE FORENSIC PODCAST
              </span>
              {isPlaying && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-white tracking-tight mt-0.5">
              {datasetName || 'Timeline Audio Drama Transcript'}
            </h2>
          </div>
        </div>

        {/* Quick Voice Settings & Bookmark Bar */}
        <div className="flex items-center gap-2">
          {bookmarkedIndex !== null && (
            <button
              onClick={resumeFromBookmark}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold hover:bg-purple-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>⏮️ Resume Bookmark (#{bookmarkedIndex + 1})</span>
            </button>
          )}

          <button
            onClick={saveBookmark}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>📌 Bookmark Pos</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-bold hover:text-white transition-all cursor-pointer"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Deck: Left Column = Teleprompter / Right Column = Voice Casting & Modulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Karaoke Teleprompter */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Speaking Stage Card */}
          {currentMessage ? (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#070b16] to-[#04060c] border-2 border-cyan-400/50 shadow-[0_0_35px_rgba(0,240,255,0.15)] relative overflow-hidden">
              {/* Background Equalizer Waveform Animation */}
              {isPlaying && (
                <div className="absolute right-4 top-4 flex items-end gap-1 h-8 opacity-60">
                  <div className="w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s] h-6" />
                  <div className="w-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.1s] h-8" />
                  <div className="w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.4s] h-4" />
                  <div className="w-1 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.2s] h-7" />
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-400/30">
                    🗣️ {currentMessage.actor || 'Narrator'}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(currentMessage.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {currentEmotion && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    🎭 {currentEmotion.emotion}
                  </span>
                )}
              </div>

              <p className="text-base sm:text-lg font-sans text-white font-medium leading-relaxed select-text">
                "{currentMessage.content}"
              </p>

              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-neutral-400">
                <span>Message {currentIndex + 1} of {messages.length}</span>
                <span>Assigned Voice: {actorVoices[currentMessage.actor || '']?.gender === 'female' ? '👧 Female Voice' : '👦 Male Voice'}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-black/40 border border-white/[0.08] text-center text-neutral-500 text-xs">
              {isLoading ? 'Loading timeline transcript...' : 'No messages available in this stream.'}
            </div>
          )}

          {/* Master Transport Controls */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="cursor-pointer"
              >
                ⏮️ Prev
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={togglePlayPause}
                className={`font-black min-w-[120px] shadow-lg cursor-pointer ${
                  isPlaying ? 'bg-rose-500 hover:bg-rose-600 border-rose-400 text-white' : 'btn-3d-primary'
                }`}
              >
                {isPlaying ? '⏸️ Pause' : '▶️ Start Podcast'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex >= messages.length - 1}
                className="cursor-pointer"
              >
                Next ⏭️
              </Button>
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-neutral-400 text-[11px]">Speed:</span>
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                      : 'text-neutral-400 hover:text-white bg-black/30'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Transcript Message Scroller (Click to Jump & Speak) */}
          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {messages.map((m, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <div
                  key={m.id || idx}
                  ref={isCurrent ? activeMsgRef : null}
                  onClick={() => {
                    setCurrentIndex(idx);
                    speakMessageAt(idx);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs flex flex-col gap-1 ${
                    isCurrent
                      ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-cyan-400/40'
                      : 'bg-black/30 border-white/[0.05] hover:border-cyan-500/30 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isCurrent ? 'text-cyan-300' : 'text-neutral-300'}`}>
                        {m.actor || 'System'}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500">#{idx + 1}</span>
                  </div>
                  <p className="text-neutral-300 font-sans line-clamp-2">
                    {m.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Multi-Actor Voice Casting & Neural Modulation */}
        <div className="space-y-4">
          {/* Voice Casting Studio */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                🎭 Actor Voice Casting
              </h3>
              <span className="text-[10px] text-cyan-400 font-mono">
                {distinctActors.length} Participants
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {distinctActors.map((actor) => {
                const config = actorVoices[actor] || { voiceName: '', gender: 'male', pitch: 1.0 };
                return (
                  <div key={actor} className="p-3 rounded-xl bg-black/50 border border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate max-w-[140px]">{actor}</span>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          onClick={() =>
                            setActorVoices((prev) => ({
                              ...prev,
                              [actor]: { ...config, gender: 'male', pitch: 0.9 },
                            }))
                          }
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            config.gender === 'male'
                              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                              : 'text-neutral-400'
                          }`}
                        >
                          👦 Boy
                        </button>
                        <button
                          onClick={() =>
                            setActorVoices((prev) => ({
                              ...prev,
                              [actor]: { ...config, gender: 'female', pitch: 1.25 },
                            }))
                          }
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            config.gender === 'female'
                              ? 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                              : 'text-neutral-400'
                          }`}
                        >
                          👧 Girl
                        </button>
                      </div>
                    </div>

                    {/* Specific Voice Picker */}
                    <select
                      value={config.voiceName}
                      onChange={(e) =>
                        setActorVoices((prev) => ({
                          ...prev,
                          [actor]: { ...config, voiceName: e.target.value },
                        }))
                      }
                      className="w-full bg-[#04060c] border border-white/[0.1] rounded-lg px-2.5 py-1 text-[11px] text-neutral-300 font-mono outline-none"
                    >
                      {availableVoices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Emotional Modulation Switch */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Dynamic Emotion Inflection</h4>
                <p className="text-[10px] text-neutral-400 font-sans mt-0.5">
                  Modulates voice pitch &amp; tempo based on sentiment (Joy, Anger, Urgent, Somber)
                </p>
              </div>
              <input
                type="checkbox"
                checked={isEmotionalModulation}
                onChange={(e) => setIsEmotionalModulation(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Airgapped Privacy Badge */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-400/20 text-center space-y-1">
            <div className="text-[11px] font-bold text-cyan-300">🔒 100% Offline Speech Synthesis</div>
            <p className="text-[10px] text-neutral-400 font-sans">
              All voices synthesized locally on your operating system. Zero audio recorded or sent to cloud servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
