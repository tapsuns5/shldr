import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { type APIReservation } from './use-reservations';

export interface APIDestination {
  id: string;
  tripId: string;
  city: string;
  state?: string | null;
  country: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  sortOrder: string;
}

export interface APITripMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface APITrip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  originAirport?: string | null;
  destinationCity?: string | null;
  destinationCountry?: string | null;
  coverImage?: string | null;
  status?: string;
  isUncategorized?: boolean;
  createdBy?: string;
  tripDestinations?: APIDestination[];
  tripMembers?: APITripMember[];
}

export interface PlanItem {
  id: string;
  time: string;
  timezone: string;
  type: string;
  title: string;
  details: string;
  reservation?: APIReservation;
}

export interface PlanDay {
  id: string;
  date: string;
  items: PlanItem[];
}

export interface UIDestination {
  city: string;
  state?: string | null;
  country: string;
  location: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
}

export interface UITrip {
  id: string;
  title: string;
  date: string;
  startDate: string;
  endDate: string;
  duration: string;
  location: string;
  originAirport?: string | null;
  destinations: UIDestination[];
  image: string;
  monthYear: string;
  plans: PlanDay[];
  isUncategorized: boolean;
  createdBy: string;
  members: APITripMember[];
}

function formatDestinationLocation(d: { city: string; state?: string | null; country: string }): string {
  return [d.city, d.state, d.country].filter(Boolean).join(', ');
}

export function formatTrip(trip: APITrip): UITrip {
  const start = dayjs(trip.startDate);
  const end = dayjs(trip.endDate);
  const durationDays = end.diff(start, 'day') + 1;
  const date = start.isSame(end, 'day')
    ? start.format('MMM D, YYYY')
    : `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;

  const destinations: UIDestination[] = (trip.tripDestinations || [])
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((d) => ({
      city: d.city,
      state: d.state,
      country: d.country,
      location: formatDestinationLocation(d),
      arrivalDate: d.arrivalDate,
      departureDate: d.departureDate,
    }));

  const location = destinations.length > 0
    ? destinations.map((d) => d.location).join(' → ')
    : [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(', ');

  return {
    id: trip.id,
    title: trip.title,
    date,
    startDate: trip.startDate,
    endDate: trip.endDate,
    duration: `${durationDays} ${durationDays === 1 ? 'day' : 'days'}`,
    location,
    originAirport: trip.originAirport,
    destinations,
    image: trip.coverImage || `https://picsum.photos/seed/${trip.id}/400/300`,
    monthYear: start.format('MMMM YYYY'),
    plans: [],
    isUncategorized: trip.isUncategorized ?? false,
    createdBy: trip.createdBy || '',
    members: trip.tripMembers || [],
  };
}

export function filterTrips(trips: UITrip[], tab: number): UITrip[] {
  const today = dayjs().startOf('day');

  return trips.filter((trip) => {
    const start = dayjs(trip.startDate).startOf('day');
    const end = dayjs(trip.endDate).startOf('day');

    switch (tab) {
      case 0: // Upcoming
        return !trip.isUncategorized && start.isAfter(today);
      case 1: // Active
        return !trip.isUncategorized && !start.isAfter(today) && !end.isBefore(today);
      case 2: // Past
        return !trip.isUncategorized && end.isBefore(today);
      case 3:
        return trip.isUncategorized;
      default:
        return true;
    }
  });
}

export function useTrips(accountId: string) {
  const [trips, setTrips] = useState<UITrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trips?accountId=${accountId}`);
        if (!res.ok) throw new Error('Failed to load trips');
        const data: APITrip[] = await res.json();
        if (!cancelled) setTrips(data.map(formatTrip));
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  return { trips, loading, error, setTrips };
}
