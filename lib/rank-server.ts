import dayjs from 'dayjs';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { rankedCities, reservations, trips } from '@/db/schema';

export type RankView = 'trips' | 'restaurants' | 'cities' | 'hotels' | 'activities';
export type RankEntityType = 'trip' | 'reservation' | 'city';

export interface RankItem {
  id: string;
  rankKey: string;
  entityType: RankEntityType;
  category: RankView;
  title: string;
  context: string;
  secondaryContext: string;
  image: string | null;
  rankOrder: number | null;
  tierId: string | null;
  tags: string[];
  href: string | null;
}

export const reservationTypeByView = {
  restaurants: 'restaurant',
  hotels: 'hotel',
  activities: 'activity',
} as const;

export function normalizeLocation(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function cityRankKey(city: string, state: string | null, country: string) {
  return `city:${Buffer.from(JSON.stringify([city, state ?? '', country])).toString('base64url')}`;
}

export function parseCityRankKey(rankKey: string) {
  if (!rankKey.startsWith('city:')) return null;
  try {
    const [city, state, country] = JSON.parse(
      Buffer.from(rankKey.slice(5), 'base64url').toString('utf8'),
    ) as [string, string, string];
    return { city, state, country };
  } catch {
    return null;
  }
}

export async function getAccountTripIds(accountId: string) {
  const rows = await db.query.trips.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
    columns: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function loadRankItems(accountId: string, view: RankView): Promise<RankItem[]> {
  if (view === 'trips') {
    const rows = await db.query.trips.findMany({
      where: (t, { and: andOp, eq: eqOp }) =>
        andOp(eqOp(t.accountId, accountId), eqOp(t.isUncategorized, false)),
      with: { tripDestinations: true },
    });
    return rows.map((trip) => {
      const destinations = [...trip.tripDestinations]
        .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
        .map((destination) => [destination.city, destination.state, destination.country].filter(Boolean).join(', '));
      const location = destinations.length
        ? destinations.join(' → ')
        : [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(', ');
      return {
        id: trip.id,
        rankKey: `trip:${trip.id}`,
        entityType: 'trip',
        category: view,
        title: trip.title,
        context: location || 'Destination not set',
        secondaryContext: `${dayjs(trip.startDate).format('MMM D')} – ${dayjs(trip.endDate).format('MMM D, YYYY')} · ${trip.status}`,
        image: trip.coverImage,
        rankOrder: trip.rankOrder,
        tierId: trip.rankTierId,
        tags: trip.rankLabels,
        href: `/tripdetails/${trip.id}`,
      };
    });
  }

  if (view === 'cities') {
    const accountTrips = await db.query.trips.findMany({
      where: (t, { and: andOp, eq: eqOp }) =>
        andOp(eqOp(t.accountId, accountId), eqOp(t.isUncategorized, false)),
      with: { tripDestinations: true },
    });
    const preferences = await db.query.rankedCities.findMany({
      where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
    });
    const preferenceMap = new Map(
      preferences.map((preference) => [
        [preference.normalizedCity, preference.normalizedState, preference.normalizedCountry].join('|'),
        preference,
      ]),
    );
    const aggregated = new Map<string, {
      city: string;
      state: string;
      country: string;
      visits: { tripTitle: string; date: string }[];
    }>();

    accountTrips.forEach((trip) => {
      trip.tripDestinations.forEach((destination) => {
        const key = [
          normalizeLocation(destination.city),
          normalizeLocation(destination.state),
          normalizeLocation(destination.country),
        ].join('|');
        const current = aggregated.get(key) ?? {
          city: destination.city,
          state: destination.state ?? '',
          country: destination.country,
          visits: [],
        };
        current.visits.push({
          tripTitle: trip.title,
          date: destination.arrivalDate ?? trip.startDate,
        });
        aggregated.set(key, current);
      });
    });

    return [...aggregated.entries()].map(([key, city]) => {
      const preference = preferenceMap.get(key);
      const visits = [...city.visits].sort((a, b) => b.date.localeCompare(a.date));
      return {
        id: preference?.id ?? cityRankKey(city.city, city.state, city.country),
        rankKey: cityRankKey(city.city, city.state, city.country),
        entityType: 'city',
        category: view,
        title: city.city,
        context: [city.state, city.country].filter(Boolean).join(', '),
        secondaryContext: `${visits.length} ${visits.length === 1 ? 'visit' : 'visits'} · ${visits.map((visit) => visit.tripTitle).join(', ')}`,
        image: null,
        rankOrder: preference?.rankOrder ?? null,
        tierId: preference?.rankTierId ?? null,
        tags: preference?.rankLabels ?? [],
        href: null,
      };
    });
  }

  const tripIds = await getAccountTripIds(accountId);
  if (!tripIds.length) return [];
  const type = reservationTypeByView[view];
  const rows = await db.query.reservations.findMany({
    where: (t, { and: andOp, eq: eqOp, inArray: inArrayOp }) =>
      andOp(eqOp(t.type, type), inArrayOp(t.tripId, tripIds)),
    with: { trip: true },
  });
  return rows.map((reservation) => ({
    id: reservation.id,
    rankKey: `reservation:${reservation.id}`,
    entityType: 'reservation',
    category: view,
    title: reservation.title,
    context: [reservation.providerName, reservation.location].filter(Boolean).join(' · ') || reservation.trip.title,
    secondaryContext: `${dayjs(reservation.startDateTime).format('MMM D, YYYY')} · ${reservation.trip.title}`,
    image: reservation.trip.coverImage,
    rankOrder: reservation.rankOrder,
    tierId: reservation.rankTierId,
    tags: reservation.rankLabels,
    href: `/tripdetails/${reservation.tripId}/event/${reservation.id}`,
  }));
}

export async function ensureCityPreference(accountId: string, rankKey: string) {
  const location = parseCityRankKey(rankKey);
  if (!location) return null;
  const normalizedCity = normalizeLocation(location.city);
  const normalizedState = normalizeLocation(location.state);
  const normalizedCountry = normalizeLocation(location.country);
  const [row] = await db
    .insert(rankedCities)
    .values({
      accountId,
      ...location,
      normalizedCity,
      normalizedState,
      normalizedCountry,
    })
    .onConflictDoUpdate({
      target: [
        rankedCities.accountId,
        rankedCities.normalizedCity,
        rankedCities.normalizedState,
        rankedCities.normalizedCountry,
      ],
      set: { updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function validateRankKeys(accountId: string, view: RankView, rankKeys: string[]) {
  const available = await loadRankItems(accountId, view);
  const availableKeys = new Set(available.map((item) => item.rankKey));
  return rankKeys.length === new Set(rankKeys).size && rankKeys.every((key) => availableKeys.has(key));
}
