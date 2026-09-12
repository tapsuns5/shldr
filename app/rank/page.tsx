'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Container, Tab, Tabs, Typography } from '@mui/material';
import RankExperience from '../../components/rank/RankExperience';
import type { RankView } from '../../hooks/use-ranks';

const VIEWS: RankView[] = ['trips', 'restaurants', 'cities', 'hotels', 'activities'];

const VIEW_LABELS: Record<RankView, string> = {
  trips: 'Trips',
  restaurants: 'Restaurants',
  cities: 'Cities',
  hotels: 'Hotels',
  activities: 'Activities',
};

function RankPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountId, setAccountId] = useState<string>('');

  const viewParam = searchParams.get('view') as RankView | null;
  const view: RankView = viewParam && VIEWS.includes(viewParam) ? viewParam : 'trips';
  const tabIndex = VIEWS.indexOf(view);

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => (res.ok ? res.json() : []))
      .then((accounts) => {
        if (accounts.length > 0) setAccountId(accounts[0].id);
      })
      .catch(() => {});
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    const nextView = VIEWS[newValue];
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', nextView);
    router.push(`/rank?${params.toString()}`);
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Typography variant="overline" color="text.secondary">
        Rank
      </Typography>
      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, minHeight: 44 }}
      >
        {VIEWS.map((v) => (
          <Tab key={v} label={VIEW_LABELS[v]} sx={{ textTransform: 'none', fontWeight: 600 }} />
        ))}
      </Tabs>
      {accountId ? (
        <RankExperience key={`${accountId}-${view}`} accountId={accountId} view={view} />
      ) : (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">Loading account…</Typography>
        </Box>
      )}
    </Container>
  );
}

export default function RankPage() {
  return (
    <Suspense fallback={null}>
      <RankPageContent />
    </Suspense>
  );
}
