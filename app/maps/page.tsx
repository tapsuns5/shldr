'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@mui/material/styles';
import dynamic from 'next/dynamic';

const TravelMap = dynamic(() => import('@/components/map/TravelMap'), { ssr: false });

export default function MapsPage() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === 'dark';
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/accounts')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load your account.');
        return response.json() as Promise<{ id: string }[]>;
      })
      .then((accounts) => {
        if (cancelled) return;
        if (accounts.length > 0) setAccountId(accounts[0].id);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : 'Unable to load your account.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ height: 'calc(100vh - 64px)', width: '100%', overflow: 'hidden' }}>
      {loading ? (
        <div
          className="flex items-center justify-center w-full h-full"
          style={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: 14 }}
        >
          Loading…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center w-full h-full gap-3 text-center px-6" style={{ color: darkMode ? '#cbd5e1' : '#475569' }}>
          <p>{error}</p>
          <button type="button" className="underline" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      ) : accountId ? (
        <TravelMap accountId={accountId} darkMode={darkMode} />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full gap-3 text-center px-6" style={{ color: darkMode ? '#cbd5e1' : '#475569' }}>
          <p>Create an account to start using your travel map.</p>
          <Link className="underline" href="/onboarding/account?redirect=%2Fmaps">
            Set up account
          </Link>
        </div>
      )}
    </div>
  );
}
