/**
 * Trip matching logic.
 *
 * Given a parsed email event (with dates + destination), determines whether it
 * belongs to an existing trip or should create a new one.
 *
 * Matching criteria (all must pass):
 *   1. Date overlap — the event's date range falls within or immediately
 *      adjacent to the trip's date window (±3 day grace period).
 *   2. Location similarity — the destination city/location token-matches the
 *      trip's destinationCity with a normalised comparison.
 *
 * If both pass the trip is considered a match and the event becomes a new
 * reservation on that trip.  If neither condition passes a new trip is created.
 */

import { db } from '@/db';
import { trips, tripMembers, reservations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ParsedEmailEvent } from './email-parser';

/** Milliseconds in one day */
const ONE_DAY_MS = 86_400_000;
/** Grace period in days — an event is considered "within" a trip if it falls
 *  within this many days before the trip start or after the trip end. */
const DATE_GRACE_DAYS = 3;
const DETAIL_EVENT_TYPES = new Set<ParsedEmailEvent['type']>(['restaurant', 'activity', 'transport', 'other']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateMs(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getTime();
}

/** Normalise a location string for loose comparison (lowercase, remove common words). */
function normaliseLocation(loc: string): string {
  return loc
    .toLowerCase()
    .replace(/\b(the|city|of|airport|intl|international|hotel|resort|inn|suites?)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Return true if two location strings share at least one meaningful token. */
function locationsOverlap(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const tokensA = new Set(normaliseLocation(a).split(' ').filter(t => t.length > 2));
  const tokensB = normaliseLocation(b).split(' ').filter(t => t.length > 2);
  return tokensB.some(t => tokensA.has(t));
}

function locationsCloselyMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const normalizedA = normaliseLocation(a);
  const normalizedB = normaliseLocation(b);
  if (!normalizedA || !normalizedB) return false;
  return normalizedA === normalizedB || normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}

function regionalAddressScore(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return 0;
  const postalPrefixesA = new Set([...a.matchAll(/\b(\d{3})\d{1,3}\b/g)].map((match) => match[1]));
  const postalPrefixesB = [...b.matchAll(/\b(\d{3})\d{1,3}\b/g)].map((match) => match[1]);
  if (postalPrefixesB.some((prefix) => postalPrefixesA.has(prefix))) return 3;

  const regionsA = new Set([...a.matchAll(/(?:^|[\s,])([A-Z]{2})(?=$|[\s,])/g)].map((match) => match[1]));
  const regionsB = [...b.matchAll(/(?:^|[\s,])([A-Z]{2})(?=$|[\s,])/g)].map((match) => match[1]);
  return regionsB.some((region) => regionsA.has(region)) ? 1 : 0;
}

function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
  const aliases: Record<string, string> = {
    it: 'italy', italy: 'italy', italia: 'italy', italie: 'italy', italien: 'italy',
    ch: 'switzerland', switzerland: 'switzerland', suisse: 'switzerland', svizzera: 'switzerland', schweiz: 'switzerland',
    fr: 'france', france: 'france', francia: 'france',
    de: 'germany', germany: 'germany', deutschland: 'germany', germania: 'germany',
    es: 'spain', spain: 'spain', espana: 'spain', spagna: 'spain',
    us: 'unitedstates', usa: 'unitedstates', unitedstates: 'unitedstates',
    uk: 'unitedkingdom', gb: 'unitedkingdom', unitedkingdom: 'unitedkingdom',
  };
  return aliases[normalized] ?? normalized;
}

function inferCountryFromLocation(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/\b(IT|Italy|Italia|CH|Switzerland|Svizzera|FR|France|DE|Germany|ES|Spain|US|USA|UK|GB)\b/i);
  return normalizeCountry(match?.[1]);
}

/** Return true if the event date range overlaps with or is adjacent to the trip window. */
function datesOverlap(
  eventStart: Date | null,
  eventEnd: Date | null,
  tripStartStr: string,
  tripEndStr: string
): boolean {
  if (!eventStart) return false;
  const tripStart = toDateMs(tripStartStr) - DATE_GRACE_DAYS * ONE_DAY_MS;
  const tripEnd = toDateMs(tripEndStr) + DATE_GRACE_DAYS * ONE_DAY_MS;
  const evStart = eventStart.getTime();
  const evEnd = (eventEnd ?? eventStart).getTime();
  // Event overlaps trip window if its range intersects [tripStart, tripEnd]
  return evStart <= tripEnd && evEnd >= tripStart;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchResult {
  matched: true;
  tripId: string;
  tripTitle: string;
  isNewTrip: false;
}

export interface NewTripResult {
  matched: false;
  tripId: string;
  tripTitle: string;
  isNewTrip: true;
}

export type TripMatchOutcome = MatchResult | NewTripResult;

export interface TripCandidate {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  destinationCity: string | null;
  destinationCountry?: string | null;
  tripDestinations?: Array<{ city: string; state?: string | null; country: string }>;
  status: string;
  isUncategorized?: boolean;
}

export function isDetailEvent(event: ParsedEmailEvent): boolean {
  return DETAIL_EVENT_TYPES.has(event.type);
}

export function selectTripCandidate(
  event: ParsedEmailEvent,
  candidates: TripCandidate[],
): TripCandidate | null {
  const dateMatches: TripCandidate[] = [];
  for (const candidate of candidates) {
    if (candidate.status === 'cancelled' || candidate.isUncategorized) continue;

    const dateMatch = datesOverlap(event.startDateTime, event.endDateTime, candidate.startDate, candidate.endDate);
    const candidateLocations = [
      candidate.destinationCity,
      ...(candidate.tripDestinations ?? []).flatMap((destination) => [
        destination.city,
        destination.state,
        [destination.city, destination.state, destination.country].filter(Boolean).join(', '),
      ]),
    ];
    const eventCountry = normalizeCountry(event.destinationCountry);
    const candidateCountries = [
      candidate.destinationCountry,
      ...candidateLocations.map(inferCountryFromLocation),
      ...(candidate.tripDestinations ?? []).map((destination) => destination.country),
    ].map(normalizeCountry).filter(Boolean);
    const localityMatch = candidateLocations.some((location) =>
      locationsCloselyMatch(event.destinationCity, location) || locationsCloselyMatch(event.location, location),
    );
    const providerMatch = locationsOverlap(event.providerName, candidate.title);
    const countryMatch = !!eventCountry && candidateCountries.includes(eventCountry);
    const eventAddress = event.address ?? event.location;
    const addressMatch = candidateLocations.some((location) => locationsOverlap(eventAddress, location));
    const regionScore = Math.max(...candidateLocations.map((location) => regionalAddressScore(eventAddress, location)), 0);
    const locationMatch = isDetailEvent(event)
      ? (localityMatch ? 4 : 0) + (providerMatch ? 3 : 0) + (countryMatch ? 2 : 0) +
          (addressMatch ? 1 : 0) + regionScore >= 3
      : candidateLocations.some((location) =>
          locationsOverlap(event.destinationCity, location) || locationsOverlap(event.location, location)
        ) || locationsOverlap(event.destinationCity, candidate.title);

    if (dateMatch) dateMatches.push(candidate);
    if (dateMatch && locationMatch) return candidate;
  }

  return !isDetailEvent(event) && dateMatches.length === 1 ? dateMatches[0] : null;
}

async function getOrCreateUncategorizedTrip(opts: {
  accountId: string;
  userId: string;
  event: ParsedEmailEvent;
}): Promise<MatchResult> {
  const date = (opts.event.startDateTime ?? new Date()).toISOString().slice(0, 10);
  const [trip] = await db
    .insert(trips)
    .values({
      accountId: opts.accountId,
      title: 'Uncategorized',
      startDate: date,
      endDate: date,
      status: 'planning',
      externalUid: 'uncategorized',
      externalSource: 'email_import',
      isUncategorized: true,
      createdBy: opts.userId,
    })
    .onConflictDoUpdate({
      target: [trips.accountId, trips.externalUid],
      set: { isUncategorized: true, updatedAt: new Date() },
    })
    .returning();

  await db
    .insert(tripMembers)
    .values({ tripId: trip.id, userId: opts.userId, role: 'editor' })
    .onConflictDoNothing();

  return {
    matched: true,
    tripId: trip.id,
    tripTitle: trip.title,
    isNewTrip: false,
  };
}

// ─── Core matcher ─────────────────────────────────────────────────────────────

/**
 * Find an existing trip in `accountId` that this event belongs to, or create
 * a new trip and return its id.
 */
export async function matchOrCreateTrip(opts: {
  accountId: string;
  userId: string;
  event: ParsedEmailEvent;
  /** Optional: override the candidate trip title when creating a new trip */
  suggestedTitle?: string;
}): Promise<TripMatchOutcome> {
  const { accountId, userId, event } = opts;

  console.log('[trip-matcher] Matching event to trip:', {
    accountId,
    event: {
      type: event.type,
      title: event.title,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      destinationCity: event.destinationCity,
      location: event.location,
    },
  });

  // ── 1. Load all non-cancelled trips for this account ──────────────────────
  const candidates = await db.query.trips.findMany({
    where: and(eq(trips.accountId, accountId)),
    with: { tripDestinations: true },
  });

  console.log('[trip-matcher] Found candidate trips:', candidates.length);

  // ── 2. Score each candidate ───────────────────────────────────────────────
  const candidate = selectTripCandidate(event, candidates);
  if (candidate) {
    console.log('[trip-matcher] MATCHED to existing trip:', candidate.id);
    return {
      matched: true,
      tripId: candidate.id,
      tripTitle: candidate.title,
      isNewTrip: false,
    };
  }

  if (isDetailEvent(event)) {
    return getOrCreateUncategorizedTrip({ accountId, userId, event });
  }

  // ── 3. No match — create a new trip ───────────────────────────────────────
  const title =
    opts.suggestedTitle ??
    (event.destinationCity
      ? `Trip to ${event.destinationCity}`
      : event.title ?? 'New Trip');

  const startDate = event.startDateTime
    ? event.startDateTime.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const endDate = event.endDateTime
    ? event.endDateTime.toISOString().slice(0, 10)
    : startDate;

  console.log('[trip-matcher] Creating new trip:', { title, startDate, endDate });

  const [newTrip] = await db
    .insert(trips)
    .values({
      accountId,
      title,
      startDate,
      endDate: endDate >= startDate ? endDate : startDate,
      destinationCity: event.destinationCity ?? event.location ?? undefined,
      destinationCountry: event.destinationCountry ?? undefined,
      status: 'confirmed',
      externalSource: 'email_import',
      createdBy: userId,
    })
    .returning();

  await db.insert(tripMembers).values({
    tripId: newTrip.id,
    userId,
    role: 'editor',
  });

  console.log('[trip-matcher] Created new trip:', newTrip.id);

  return {
    matched: false,
    tripId: newTrip.id,
    tripTitle: newTrip.title,
    isNewTrip: true,
  };
}

/**
 * Upsert a reservation on a trip from a parsed email event.
 * Uses (tripId + externalUid) to avoid duplicates.
 */
export async function upsertEmailReservation(opts: {
  tripId: string;
  userId: string;
  event: ParsedEmailEvent;
  /** Unique identifier derived from the email (e.g. message-id) */
  externalUid: string;
  /** Original email HTML body, stored for in-app viewing */
  rawEmailHtml?: string | null;
  /** Original email subject, stored for in-app viewing */
  rawEmailSubject?: string | null;
}): Promise<{ reservationId: string; isNew: boolean }> {
  const { tripId, userId, event, externalUid, rawEmailHtml, rawEmailSubject } = opts;

  console.log('[trip-matcher] Upserting reservation:', {
    tripId,
    externalUid,
    event: {
      type: event.type,
      title: event.title,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
    },
  });

  const existing = await db.query.reservations.findFirst({
    where: and(
      eq(reservations.tripId, tripId),
      eq(reservations.providerWebsite, externalUid)
    ),
  });

  if (existing) {
    console.log('[trip-matcher] Updating existing reservation:', existing.id);
    await db
      .update(reservations)
      .set({
        title: event.title,
        startDateTime: event.startDateTime ?? existing.startDateTime,
        endDateTime: event.endDateTime ?? existing.endDateTime,
        location: event.location ?? existing.location,
        confirmationNumber: event.confirmationNumber ?? existing.confirmationNumber,
        providerName: event.providerName ?? existing.providerName,
        notes: event.notes ?? existing.notes,
        rawEmailHtml: rawEmailHtml ?? existing.rawEmailHtml,
        rawEmailSubject: rawEmailSubject ?? existing.rawEmailSubject,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, existing.id));
    return { reservationId: existing.id, isNew: false };
  }

  console.log('[trip-matcher] Creating new reservation');
  const [created] = await db
    .insert(reservations)
    .values({
      tripId,
      type: event.type,
      title: event.title,
      startDateTime: event.startDateTime ?? new Date(),
      endDateTime: event.endDateTime ?? undefined,
      location: event.location ?? null,
      confirmationNumber: event.confirmationNumber ?? null,
      providerName: event.providerName ?? null,
      notes: event.notes ?? null,
      providerWebsite: externalUid,
      rawEmailHtml: rawEmailHtml ?? null,
      rawEmailSubject: rawEmailSubject ?? null,
      source: 'email_import',
      createdBy: userId,
    })
    .returning();

  console.log('[trip-matcher] Created reservation:', created.id);

  return { reservationId: created.id, isNew: true };
}
