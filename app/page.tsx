'use client';

import { useState, useEffect } from 'react';
import { Container, Box, CircularProgress } from '@mui/material';
import { useSession } from '@/lib/auth-client';
import { useTrips } from '@/hooks/use-trips';
import { useTravelMapData } from '@/hooks/useTravelMapData';
import { useTravelStats } from '@/hooks/useTravelStats';
import WelcomeBanner from '@/components/home/WelcomeBanner';
import TripStatsCards from '@/components/home/TripStatsCards';
import HomeMapWidget from '@/components/home/HomeMapWidget';

export default function Home() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [accountId, setAccountId] = useState<string>('');
  const { trips, loading: tripsLoading } = useTrips(accountId);
  const mapData = useTravelMapData(accountId);
  const travelStats = useTravelStats(mapData);

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => (res.ok ? res.json() : []))
      .then((accounts) => {
        if (accounts.length > 0) setAccountId(accounts[0].id);
      })
      .catch(() => {});
  }, []);

  const userName = session?.user?.name || 'Traveler';

  if (sessionLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <WelcomeBanner userName={userName} />

      <HomeMapWidget accountId={accountId} stats={travelStats} />

      {tripsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <TripStatsCards trips={trips} />
      )}
    </Container>
  );
}
