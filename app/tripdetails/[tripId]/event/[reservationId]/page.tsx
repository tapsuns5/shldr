'use client';

import { useEffect, useState } from 'react';
import { Container, Typography } from '@mui/material';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import TripEventDetail from '@/components/TripEventDetail';
import { formatTrip, type APITrip } from '@/hooks/use-trips';
import { type APIReservation } from '@/hooks/use-reservations';

export default function TripEventDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tripId = params.tripId as string;
  const reservationId = params.reservationId as string;
  const initialMode = searchParams.get('mode') === 'edit' ? 'edit' : 'view';
  const fromUncategorized = searchParams.get('from') === 'uncategorized';
  const backHref = fromUncategorized ? '/trips?tab=uncategorized' : `/tripdetails/${tripId}`;

  const [tripTitle, setTripTitle] = useState('Trip');
  const [reservation, setReservation] = useState<APIReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId || !reservationId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tripRes, resRes] = await Promise.all([
          fetch(`/api/trips/${tripId}`),
          fetch(`/api/trips/${tripId}/reservations/${reservationId}`),
        ]);
        if (!tripRes.ok) throw new Error('Failed to load trip');
        if (!resRes.ok) throw new Error('Failed to load event');
        const tripData: APITrip = await tripRes.json();
        const resData: APIReservation = await resRes.json();
        if (!cancelled) {
          const ui = formatTrip(tripData);
          setTripTitle(ui.title);
          setReservation(resData);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [tripId, reservationId]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {loading && (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Loading event…
        </Typography>
      )}
      {!loading && error && (
        <Typography variant="body1" color="error" sx={{ textAlign: 'center', py: 4 }}>
          {error}
        </Typography>
      )}
      {!loading && !error && !reservation && (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Event not found.
        </Typography>
      )}
      {!loading && !error && reservation && (
        <TripEventDetail
          tripId={tripId}
          tripTitle={tripTitle}
          reservation={reservation}
          initialMode={initialMode}
          backHref={backHref}
          backLabel={fromUncategorized ? 'Uncategorized' : undefined}
          onDeleted={() => router.push(backHref)}
          onUpdated={(updated) => setReservation(updated)}
        />
      )}
    </Container>
  );
}
