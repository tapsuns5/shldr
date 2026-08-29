'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import {
  Container,
} from '@mui/material';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import SubTabs from '../../components/SubTabs';
import TripCards from '../../components/TripCards';
import UncategorizedEventCards from '../../components/UncategorizedEventCards';
import { useTrips, filterTrips, formatTrip, type APITrip, type UITrip } from '../../hooks/use-trips';
import type { LocationDisplayMode } from '../../lib/location-image';


function TripsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tabValue, setTabValue] = useState(() => searchParams.get('tab') === 'uncategorized' ? 3 : 0);
  const [accountId, setAccountId] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<LocationDisplayMode>('map');
  const { trips, loading, error, setTrips } = useTrips(accountId);

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => (res.ok ? res.json() : []))
      .then((accounts) => {
        if (accounts.length > 0) {
          setAccountId(accounts[0].id);
          setDisplayMode(accounts[0].locationDisplayMode ?? 'map');
        }
      })
      .catch(() => {});
  }, []);

  const handleTripClick = (trip: UITrip) => {
    router.push(`/tripdetails/${trip.id}`);
  };

  const handleTripCreated = (trip: APITrip) => {
    setTrips((prev) => [...prev, formatTrip(trip)]);
  };

  const handleTripDeleted = (tripId: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const handleTripUpdated = (updatedTrip: UITrip) => {
    setTrips((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)));
  };

  const filteredTrips = useMemo(() => filterTrips(trips, tabValue), [trips, tabValue]);
  const uncategorizedTrip = useMemo(
    () => trips.find((trip) => trip.isUncategorized) ?? null,
    [trips],
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <AnimatePresence mode="wait">
        <motion.div
          key="list"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <SubTabs value={tabValue} onChange={(_, v) => setTabValue(v)} accountId={accountId} onTripCreated={handleTripCreated} />

          {tabValue === 3 ? (
            <UncategorizedEventCards trip={uncategorizedTrip} tripsLoading={loading} />
          ) : (
            <TripCards loading={loading} error={error} trips={filteredTrips} onTripClick={handleTripClick} onTripDeleted={handleTripDeleted} onTripUpdated={handleTripUpdated} displayMode={displayMode} />
          )}
        </motion.div>
      </AnimatePresence>
    </Container>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={null}>
      <TripsPageContent />
    </Suspense>
  );
}
