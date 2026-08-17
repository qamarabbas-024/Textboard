'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PinLockModalProps {
  isLocked: boolean;
  onUnlock: () => void;
  onPinConfigured: () => void;
}

// Simple deterministic hash for local browser security
function hashPin(pin: string, salt: string): string {
  let hash = 0;
  const combined = `${salt}:${pin}:${salt}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

export function PinLockModal({ isLocked, onUnlock, onPinConfigured }: PinLockModalProps) {
  const [hasStoredPin, setHasStoredPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const storedHash = localStorage.getItem('archive_pin_hash');
    setHasStoredPin(Boolean(storedHash));
  }, [isLocked]);

  if (!isLocked) return null;

  const handleKeyClick = (num: string) => {
    setErrorMsg(null);
    if (!hasStoredPin || isSettingUp) {
      if (pinInput.length < 6) {
        setPinInput((prev) => prev + num);
      }
    } else {
      if (pinInput.length < 6) {
        const next = pinInput + num;
        setPinInput(next);

        // Auto verify on 4-6 digits
        if (next.length >= 4) {
          const storedHash = localStorage.getItem('archive_pin_hash');
          const storedSalt = localStorage.getItem('archive_pin_salt') || 'default_salt';
          if (storedHash && hashPin(next, storedSalt) === storedHash) {
            setPinInput('');
            onUnlock();
          } else if (next.length === 6) {
            setErrorMsg('Incorrect PIN. Please try again.');
            setPinInput('');
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setErrorMsg('PIN must be at least 4 digits');
      return;
    }
    if (pinInput !== confirmInput) {
      setErrorMsg('PINs do not match');
      return;
    }

    const salt = Math.random().toString(36).substring(2, 10);
    const hash = hashPin(pinInput, salt);
    localStorage.setItem('archive_pin_hash', hash);
    localStorage.setItem('archive_pin_salt', salt);
    localStorage.setItem('archive_pin_enabled', 'true');

    setHasStoredPin(true);
    setIsSettingUp(false);
    setPinInput('');
    setConfirmInput('');
    onPinConfigured();
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-base/95 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-theme p-6 sm:p-8 shadow-2xl terminal-interactive text-center"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-theme bg-theme-raised border border-theme-border flex items-center justify-center text-xl text-theme-accent mb-3 shadow-theme-glow">
            🔒
          </div>
          <h2 className="text-base font-bold uppercase tracking-wider text-theme-text">
            {hasStoredPin && !isSettingUp ? 'Archive Security Lock' : 'Set Local Security PIN'}
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            {hasStoredPin && !isSettingUp
              ? 'Enter your passcode to decrypt and access local workspace.'
              : 'Protect your local data by creating a 4-6 digit access PIN.'}
          </p>
        </div>

        {hasStoredPin && !isSettingUp ? (
          /* Unlock Keypad */
          <div>
            <div className="flex justify-center gap-3 my-6">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const filled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`h-3.5 w-3.5 rounded-full border transition-all ${
                      filled
                        ? 'bg-theme-accent border-theme-border-hi shadow-theme-glow scale-110'
                        : 'bg-theme-raised border-theme-border'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-400 font-semibold mb-4 bg-rose-950/50 border border-rose-800/80 p-2 rounded-theme"
              >
                {errorMsg}
              </motion.div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => {
                if (k === '') return <div key={i} />;
                if (k === '⌫') {
                  return (
                    <button
                      key={i}
                      onClick={handleBackspace}
                      className="h-12 flex items-center justify-center text-xs font-bold rounded-theme bg-theme-raised hover:bg-theme-active border border-theme-border text-theme-muted hover:text-theme-text transition-all active:scale-95"
                    >
                      ⌫
                    </button>
                  );
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleKeyClick(k)}
                    className="h-12 flex items-center justify-center text-sm font-mono font-bold rounded-theme bg-theme-raised hover:bg-theme-active border border-theme-border text-theme-text hover:text-theme-accent transition-all active:scale-95 shadow-xs"
                  >
                    {k}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                if (confirm('Resetting PIN will clear local authentication tokens. Continue?')) {
                  localStorage.removeItem('archive_pin_hash');
                  localStorage.removeItem('archive_pin_salt');
                  localStorage.removeItem('archive_pin_enabled');
                  setHasStoredPin(false);
                  setIsSettingUp(true);
                  setPinInput('');
                }
              }}
              className="text-[11px] text-theme-dim hover:text-theme-muted underline mt-2"
            >
              Forgot or Reset PIN
            </button>
          </div>
        ) : (
          /* Set Up New PIN */
          <form onSubmit={handleSaveNewPin} className="space-y-4 text-left">
            <div>
              <label className="text-[11px] font-bold text-theme-dim uppercase tracking-wider block mb-1">
                Enter New PIN (4-6 digits)
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-theme-base border border-theme-border rounded-theme px-3 py-2 text-center text-lg tracking-widest text-theme-text focus:outline-none focus:border-theme-border-hi"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-theme-dim uppercase tracking-wider block mb-1">
                Confirm PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-theme-base border border-theme-border rounded-theme px-3 py-2 text-center text-lg tracking-widest text-theme-text focus:outline-none focus:border-theme-border-hi"
              />
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-400 bg-rose-950/50 border border-rose-800 p-2 rounded-theme text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-theme-raised hover:bg-theme-active border border-theme-border-hi/60 text-theme-accent font-bold uppercase tracking-wider text-xs rounded-theme transition-all shadow-theme-glow"
            >
              Activate PIN Lock
            </button>

            <button
              type="button"
              onClick={() => onUnlock()}
              className="w-full py-1.5 text-center text-[11px] text-theme-dim hover:text-theme-muted"
            >
              Skip PIN protection for now
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
