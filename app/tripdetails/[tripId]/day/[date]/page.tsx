'use client';

import { useEffect, useState } from 'react';
import { Container, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import TripDayDetail from '@/components/TripDayDetail';
import { useReservations, reservationsToPlanDays } from '@/hooks/use-reservations';
import { formatTrip, type APITrip } from '@/hooks/use-trips';

export default function TripDayPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const dateParam = typeof params.date === 'string' ? decodeURIComponent(params.date) : '';

  const { reservations, loading: resLoading } = useReservations(tripId);
  const [tripTitle, setTripTitle] = useState('Trip');
  const [tripLoading, setTripLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;

    const loadTrip = async () => {
      setTripLoading(true);
      try {
        const res = await fetch(`/api/trips/${tripId}`);
        if (!res.ok) throw new Error('Failed to load trip');
        const data: APITrip = await res.json();
        if (!cancelled) setTripTitle(formatTrip(data).title);
      } catch {
        // title falls back to "Trip"
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    };

    loadTrip();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const plans = reservationsToPlanDays(reservations);
  const day = plans.find((d) => d.date === dateParam) || null;

  const loading = resLoading || tripLoading;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {loading && (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Loading day…
        </Typography>
      )}
      {!loading && !day && (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Day not found.
        </Typography>
      )}
      {!loading && day && (
        <TripDayDetail tripId={tripId} tripTitle={tripTitle} day={day} />
      )}
    </Container>
  );
}
