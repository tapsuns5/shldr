'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
} from '@mui/material';
import { useParams } from 'next/navigation';
import TripDetail from '../../../components/TripDetail';
import { formatTrip, type APITrip, type UITrip } from '../../../hooks/use-trips';
import type { LocationDisplayMode } from '../../../lib/location-image';

export default function TripDetailsPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const [trip, setTrip] = useState<UITrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<LocationDisplayMode>('map');

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => (res.ok ? res.json() : []))
      .then((accounts) => {
        if (accounts.length > 0) setDisplayMode(accounts[0].locationDisplayMode ?? 'map');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    const loadTrip = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trips/${tripId}`);
        if (!res.ok) throw new Error('Failed to load trip');
        const data: APITrip = await res.json();
        if (!cancelled) setTrip(formatTrip(data));
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTrip();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 }, width: '100%', maxWidth: '100%', minWidth: 0 }}>
      {loading && (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Loading trip…
        </Typography>
      )}
      {!loading && error && (
        <Typography variant="body1" color="error" sx={{ textAlign: 'center', py: 4 }}>
          {error}
        </Typography>
      )}
      {!loading && !error && !trip && (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Trip not found.
        </Typography>
      )}
      {!loading && !error && trip && <TripDetail trip={trip} onTripUpdated={setTrip} displayMode={displayMode} />}
    </Container>
  );
}
