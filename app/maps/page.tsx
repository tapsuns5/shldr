'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import dynamic from 'next/dynamic';

const TravelMap = dynamic(() => import('@/components/map/TravelMap'), { ssr: false });

export default function MapsPage() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === 'dark';
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    fetch('/api/accounts')
      .then((r) => (r.ok ? r.json() : []))
      .then((accounts: { id: string }[]) => {
        if (accounts.length > 0) setAccountId(accounts[0].id);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ height: 'calc(100vh - 64px)', width: '100%', overflow: 'hidden' }}>
      {accountId ? (
        <TravelMap accountId={accountId} darkMode={darkMode} />
      ) : (
        <div
          className="flex items-center justify-center w-full h-full"
          style={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: 14 }}
        >
          Loading…
        </div>
      )}
    </div>
  );
}
