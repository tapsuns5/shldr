import dayjs from 'dayjs';
import type { APIDestination, APITrip, APITripMember } from './types';

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
  image: string | null;
  monthYear: string;
  isUncategorized: boolean;
  createdBy: string;
  members: APITripMember[];
}

function formatDestinationLocation(d: { city: string; state?: string | null; country: string }): string {
  return [d.city, d.state, d.country].filter(Boolean).join(', ');
}

/**
 * Mirrors the transform in shldr's `hooks/use-trips.ts`. Kept here so both the
 * web app and the mobile app derive the same UI shape from the same API response.
 */
export function formatTrip(trip: APITrip): UITrip {
  const start = dayjs(trip.startDate);
  const end = dayjs(trip.endDate);
  const durationDays = end.diff(start, 'day') + 1;
  const date = start.isSame(end, 'day')
    ? start.format('MMM D, YYYY')
    : `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;

  const destinations: UIDestination[] = (trip.tripDestinations || [])
    .sort((a: APIDestination, b: APIDestination) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((d: APIDestination) => ({
      city: d.city,
      state: d.state,
      country: d.country,
      location: formatDestinationLocation(d),
      arrivalDate: d.arrivalDate,
      departureDate: d.departureDate,
    }));

  const location =
    destinations.length > 0
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
    image: trip.coverImage || null,
    monthYear: start.format('MMMM YYYY'),
    isUncategorized: trip.isUncategorized ?? false,
    createdBy: trip.createdBy || '',
    members: trip.tripMembers || [],
  };
}

export type TripTab = 'upcoming' | 'active' | 'past';

export function filterTrips(trips: UITrip[], tab: TripTab): UITrip[] {
  const today = dayjs().startOf('day');

  return trips.filter((trip) => {
    const start = dayjs(trip.startDate).startOf('day');
    const end = dayjs(trip.endDate).startOf('day');

    switch (tab) {
      case 'upcoming':
        return !trip.isUncategorized && start.isAfter(today);
      case 'active':
        return !trip.isUncategorized && !start.isAfter(today) && !end.isBefore(today);
      case 'past':
        return !trip.isUncategorized && end.isBefore(today);
      default:
        return true;
    }
  });
}
