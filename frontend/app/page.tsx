'use client';

import { useEffect, useState } from 'react';

type ConnectionStatus = 'checking' | 'connected' | 'not connected';

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    fetch(`${apiUrl}/health`)
      .then((res) => {
        if (res.ok) {
          setStatus('connected');
        } else {
          setStatus('not connected');
        }
      })
      .catch(() => {
        setStatus('not connected');
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3">
        <span
          className={`inline-block h-3 w-3 rounded-full ${
            status === 'connected'
              ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
              : status === 'not connected'
              ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
              : 'bg-amber-400 animate-pulse'
          }`}
        />
        <span className="text-lg font-medium tracking-wide">
          {status}
        </span>
      </div>
    </main>
  );
}
