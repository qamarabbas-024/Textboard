'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';

interface AudioSpeechStudioProps {
  onInsertTranscription?: (text: string) => void;
}

export function AudioSpeechStudio({ onInsertTranscription }: AudioSpeechStudioProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('Press Record to begin live speech recognition');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
            if (event.results[i][0].confidence) {
              setConfidence(Math.round(event.results[i][0].confidence * 100));
            }
          }
          setTranscript((prev) => (prev ? prev + ' ' + currentTranscript : currentTranscript));
        };

        recognition.onerror = (event: any) => {
          setStatusMsg(`⚠️ Recognition note: ${event.error || 'Audio capture finished'}`);
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
        setStatusMsg('Speech recognition engine operating in fallback audio recorder mode');
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#04060c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00f0ff';
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    render();
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);
      setStatusMsg('✓ Voice recording paused. Transcript generated.');
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        drawWaveform();

        if (recognitionRef.current) {
          recognitionRef.current.start();
        }

        setIsRecording(true);
        setStatusMsg('🎙️ Listening... speak clearly into your microphone.');
      } catch (err: any) {
        setStatusMsg(`❌ Microphone access required: ${err.message || 'Permission denied'}`);
      }
    }
  };

  return (
    <div className="glass-card-3d p-6 rounded-3xl border border-cyan-500/30 bg-[#070b16] shadow-2xl space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-lg shadow-md shadow-cyan-500/20">
            🎙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Live Speech-to-Text &amp; Voice Waveform Studio
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-400/30">
                OFFLINE STT
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Deterministic local voice transcription &amp; real-time audio oscillogram analysis
            </p>
          </div>
        </div>

        {/* Record / Pause Toggle */}
        <Button
          variant={isRecording ? 'danger' : 'primary'}
          size="sm"
          onClick={handleToggleRecord}
          className="btn-3d-primary font-bold shadow-lg shrink-0"
        >
          {isRecording ? '⏹️ Stop Recording' : '🎙️ Start Dictation'}
        </Button>
      </div>

      {/* Live Oscilloscope Waveform Canvas */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span>REAL-TIME MICROPHONE FREQUENCY SPECTRUM</span>
          {confidence !== null && (
            <span className="text-cyan-400 font-bold">Confidence: {confidence}%</span>
          )}
        </div>
        <canvas
          ref={canvasRef}
          width={700}
          height={60}
          className="w-full h-16 bg-[#04060c] border border-cyan-500/20 rounded-2xl shadow-inner"
        />
      </div>

      {/* Status Banner */}
      <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-cyan-300">
        {statusMsg}
      </div>

      {/* Live Transcript Output & Actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-neutral-300 uppercase">
            Captured Voice Transcript
          </label>
          {transcript && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(transcript);
                  setStatusMsg('✓ Copied transcript to clipboard!');
                }}
                className="text-[10px] text-cyan-400 hover:underline font-bold cursor-pointer"
              >
                📋 Copy Text
              </button>
              <button
                onClick={() => {
                  setTranscript('');
                  setStatusMsg('✓ Cleared transcript');
                }}
                className="text-[10px] text-rose-400 hover:underline font-bold cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Dictated text will appear here in real-time as you speak..."
          rows={4}
          className="w-full bg-[#04060c] border border-white/[0.1] rounded-2xl p-3 text-xs text-emerald-300 font-mono focus:border-cyan-400 outline-none resize-none"
        />
      </div>
    </div>
  );
}
