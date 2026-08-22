import ICAL from 'ical.js';
import { db } from '@/db';
import { trips, tripMembers, reservations, tripitFeeds, accountMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function icalTimeToDate(t: ICAL.Time): Date {
  return t.toJSDate();
}

/**
 * TripIt trip-level events have UIDs without the "item-" prefix and
 * TRANSP:TRANSPARENT. Their description contains the canonical trip URL
 * with ?id=TRIPID. Segment events (flights, hotels, etc.) have UIDs
 * starting with "item-" and their description URL uses /id/TRIPID.
 */
function isTripEvent(uid: string, transp: string | null): boolean {
  return !uid.startsWith('item-') && transp === 'TRANSPARENT';
}

/**
 * Extract the TripIt numeric trip ID from a description string.
 * Handles both forms:
 *   trip/show?id=378616663
 *   trip/show/id/378616663
 */
function extractTripItId(description: string): string | null {
  const m = description.match(/trip\/show(?:\/id\/|\?id=)(\d+)/);
  return m ? m[1] : null;
}

function guessReservationType(summary: string, description: string): 'flight' | 'hotel' | 'car' | 'rail' | 'activity' | 'restaurant' | 'other' {
  const d = description.toLowerCase();
  const s = summary.toLowerCase();
  if (d.includes('[flight]') || /\b[a-z]{2,3}\d{1,4}\b/.test(s)) return 'flight';
  if (d.includes('[lodging]') || s.includes('check-in') || s.includes('check-out')) return 'hotel';
  if (d.includes('[car rental]') || s.includes('rental car') || s.includes('pick up') || s.includes('drop off')) return 'car';
  if (d.includes('[restaurant]')) return 'restaurant';
  if (d.includes('[rail]') || s.includes('train') || s.includes('amtrak')) return 'rail';
  return 'activity';
}

interface ParsedSegmentMeta {
  confirmationNumber?: string;
  providerName?: string;
  /** For flights: airline IATA code e.g. "LH" */
  airlineCode?: string;
  /** For flights: flight number only e.g. "463" */
  flightNumber?: string;
  /** For flights: departure IATA e.g. "MIA" */
  departureAirport?: string;
  /** For flights: arrival IATA e.g. "FRA" */
  arrivalAirport?: string;
  /** For flights: arrive time string e.g. "12:06 PM -05" */
  arriveInfo?: string;
  /** Departure local time string extracted from description, e.g. "10:21 AM EDT" */
  depTime?: string;
  /** Timezone display label extracted from description, e.g. "EDT" or "-05" */
  tzDisplay?: string;
  /** For hotels: clean address */
  address?: string;
  notes?: string;
}

/**
 * Parse the human-readable TripIt description block into structured metadata.
 * The description format (after stripping the TripIt URL header) looks like:
 *   Wed, Mar 18\n10:21 AM EDT\n[Flight] FLL to CTG\n\nNK 859, Terminal 4, Gate \n\n12:06 PM -05\nArrive Cartagena (CTG)\nTerminal , Gate
 *   or
 *   [Lodging] Arrive Hotel Casa Lola Deluxe Gallery\nCheck-In: 3:00pm\n<address>
 */
/**
 * Parse an iCal summary like "LH463 MIA to FRA" or "NK 859 FLL to CTG"
 * Returns { airlineCode, flightNumber, departureAirport, arrivalAirport, displayTitle }
 */
function parseFlightSummary(summary: string): {
  airlineCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  displayTitle: string;
} | null {
  // Pattern: optional-carrier-code + flight-number + SPACE + IATA + " to " + IATA
  // e.g. "LH463 MIA to FRA" or "NK 859 FLL to CTG" or "463 MIA to FRA"
  const m = summary.match(/^([A-Z]{2,3})?\s*(\d{1,4})\s+([A-Z]{3})\s+to\s+([A-Z]{3})/i);
  if (!m) return null;
  const airlineCode = (m[1] ?? '').toUpperCase();
  const flightNumber = m[2];
  const dep = m[3].toUpperCase();
  const arr = m[4].toUpperCase();
  return {
    airlineCode,
    flightNumber,
    departureAirport: dep,
    arrivalAirport: arr,
    displayTitle: `${dep} \u2192 ${arr}`,
  };
}

function parseSegmentDescription(description: string, type: string, summary: string): ParsedSegmentMeta {
  const meta: ParsedSegmentMeta = {};

  // Strip the leading TripIt URL and trailing TripIt promo line
  const clean = description
    .replace(/View and\/or edit details in TripIt\s*:.*?\n/gi, '')
    .replace(/TripIt - organize your travel at https?:\/\/.*$/gim, '')
    .replace(/^\s*\n/gm, '')
    .trim();

  if (type === 'flight') {
    // Parse structured fields from summary line
    const flightParsed = parseFlightSummary(summary);
    if (flightParsed) {
      meta.airlineCode = flightParsed.airlineCode;
      meta.flightNumber = flightParsed.flightNumber;
      meta.departureAirport = flightParsed.departureAirport;
      meta.arrivalAirport = flightParsed.arrivalAirport;
    }

    // Confirmation number: look for "Confirmation ABCDEF"
    const confMatch = clean.match(/(?:Confirmation|Conf#?)\s+([A-Z0-9]{4,10})/i);
    if (confMatch) meta.confirmationNumber = confMatch[1];

    // Airline full name from a line like "Lufthansa 463, Terminal 2" or "NK 859, Terminal 4"
    const airlineLineMatch = clean.match(/^([A-Za-z][A-Za-z ]{1,30})\s+\d{1,4}\s*,/m);
    if (airlineLineMatch) {
      meta.providerName = airlineLineMatch[1].trim();
    } else if (flightParsed?.airlineCode) {
      meta.providerName = flightParsed.airlineCode;
    }

    // Departure time + timezone: the line immediately before [Flight]
    // e.g. "10:21 AM EDT" or "3:20 PM EDT" or "1:14 PM -05"
    const depTzMatch = clean.match(/(\d{1,2}:\d{2}\s*[AP]M\s+([A-Z]{2,5}|[+-]\d{2}(?::\d{2})?))\s*\n\[Flight\]/i);
    if (depTzMatch) {
      meta.depTime = depTzMatch[1].trim();   // e.g. "10:21 AM EDT"
      meta.tzDisplay = depTzMatch[2];         // e.g. "EDT"
    }

    // Arrival time + destination: TripIt puts arrival time on its own line, then "Arrive City (IATA)"
    // e.g. "12:06 PM -05\nArrive Cartagena (CTG)" or "5:31 PM EDT\nArrive Raleigh/Durham (RDU)"
    const lines = clean.split('\n').map(l => l.trim());
    for (let i = 0; i < lines.length; i++) {
      if (/^Arrive\s/i.test(lines[i])) {
        const arriveCity = lines[i].replace(/^Arrive\s+/i, '').trim();
        const timeLine = i > 0 ? lines[i - 1] : '';
        if (/\d{1,2}:\d{2}\s*[AP]M/i.test(timeLine)) {
          meta.arriveInfo = `${timeLine} — ${arriveCity}`;
        } else {
          meta.arriveInfo = arriveCity;
        }
        break;
      }
    }

  } else if (type === 'hotel') {
    const confMatch = clean.match(/(?:Confirmation|Conf#?)\s+([A-Z0-9]{4,12})/i);
    if (confMatch) meta.confirmationNumber = confMatch[1];

    // Address: lines after Check-In time
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    const addrLines = lines.filter(l =>
      !/^\[/.test(l) &&
      !/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),/.test(l) &&
      !/^(Check-?in|Check-?out)/i.test(l) &&
      !/^Confirmation/i.test(l) &&
      !/^\d{1,2}:\d{2}/.test(l)
    );
    if (addrLines.length) meta.address = addrLines.slice(0, 3).join(', ');

    const checkInMatch = clean.match(/Check-?[Ii]n:?\s*([\d:APMapm\s]+(?:GMT[+-]\d+)?)/i);
    if (checkInMatch) meta.notes = `Check in ${checkInMatch[1].trim()}`;
    if (meta.address) meta.notes = (meta.notes ? meta.notes + '\n' : '') + meta.address;

  } else if (type === 'car') {
    const confMatch = clean.match(/(?:Confirmation|Conf#?|Booking)\s+([A-Z0-9]{4,12})/i);
    if (confMatch) meta.confirmationNumber = confMatch[1];

    const vendorMatch = clean.match(/(?:Pick Up|Drop Off)\s+(.+?)\s+Car Rental/i);
    if (vendorMatch) meta.providerName = vendorMatch[1].trim();

    const infoLines = clean
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !/^\[/.test(l) && !/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),/.test(l))
      .slice(0, 5);
    if (infoLines.length) meta.notes = infoLines.join('\n');

  } else {
    // Restaurant / activity
    const infoLines = clean
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !/^\[/.test(l) && !/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),/.test(l))
      .slice(0, 4);
    if (infoLines.length) meta.notes = infoLines.join('\n');
  }

  return meta;
}

interface ParsedEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  location: string;
  description: string;
  transp: string | null;
  tripItId: string | null;
  /** IANA timezone id or UTC offset string from DTSTART, e.g. "America/New_York" */
  startTzid: string | null;
}

export async function syncTripItFeed(feedId: string, userId: string): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  const feed = await db.query.tripitFeeds.findFirst({
    where: eq(tripitFeeds.id, feedId),
    with: { account: true },
  });
  if (!feed) throw new Error('Feed not found');

  const accountId = feed.accountId;

  const memberRow = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, userId)),
  });
  if (!memberRow) throw new Error('Unauthorized');

  let icsText: string;
  try {
    const res = await fetch(feed.icalUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icsText = await res.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(tripitFeeds).set({ status: 'error', lastError: msg, updatedAt: new Date() }).where(eq(tripitFeeds.id, feedId));
    throw new Error(`Failed to fetch iCal feed: ${msg}`);
  }

  let cal: ICAL.Component;
  try {
    const parsed = ICAL.parse(icsText);
    cal = new ICAL.Component(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(tripitFeeds).set({ status: 'error', lastError: msg, updatedAt: new Date() }).where(eq(tripitFeeds.id, feedId));
    throw new Error(`Failed to parse iCal data: ${msg}`);
  }

  const vevents = cal.getAllSubcomponents('vevent');

  const allEvents: ParsedEvent[] = [];
  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const uid = event.uid || '';
    if (!uid) { result.skipped++; continue; }
    const description = (vevent.getFirstPropertyValue('description') as string | null) ?? '';
    const dtStartProp = vevent.getFirstProperty('dtstart');
    const startTzid = dtStartProp?.getParameter('tzid') as string | null ?? null;
    allEvents.push({
      uid,
      summary: event.summary || 'Untitled',
      start: icalTimeToDate(event.startDate),
      end: event.endDate ? icalTimeToDate(event.endDate) : icalTimeToDate(event.startDate),
      location: (vevent.getFirstPropertyValue('location') as string | null) ?? '',
      description,
      transp: (vevent.getFirstPropertyValue('transp') as string | null),
      tripItId: extractTripItId(description),
      startTzid,
    });
  }

  // Separate trip-level summary events from segment events
  const tripEvents = allEvents.filter(e => isTripEvent(e.uid, e.transp) && e.tripItId);
  const segmentEvents = allEvents.filter(e => e.uid.startsWith('item-') && e.tripItId);

  // Build a map of tripItId -> trip summary event
  const tripEventMap = new Map<string, ParsedEvent>();
  for (const te of tripEvents) {
    if (te.tripItId) {
      // If multiple trip events share the same tripItId (multi-city), keep the earliest
      const existing = tripEventMap.get(te.tripItId);
      if (!existing || te.start < existing.start) {
        tripEventMap.set(te.tripItId, te);
      }
    }
  }

  // Group segments by tripItId, deduplicating by (summary + startISO) — TripIt emits
  // two near-identical events per segment (one with day-header line, one without).
  // Keep the one whose description has the day-header (longer/richer content).
  const segmentsByTripId = new Map<string, ParsedEvent[]>();
  for (const seg of segmentEvents) {
    if (!seg.tripItId) continue;
    const arr = segmentsByTripId.get(seg.tripItId) ?? [];
    const dedupKey = `${seg.summary}::${seg.start.toISOString()}`;
    const existingIdx = arr.findIndex(
      e => `${e.summary}::${e.start.toISOString()}` === dedupKey
    );
    if (existingIdx === -1) {
      arr.push(seg);
    } else {
      // Keep whichever has the longer (richer) description
      if (seg.description.length > arr[existingIdx].description.length) {
        arr[existingIdx] = seg;
      }
    }
    segmentsByTripId.set(seg.tripItId, arr);
  }

  // Collect all tripItIds present (union of trip events and orphan segments)
  const allTripItIds = new Set([
    ...tripEventMap.keys(),
    ...segmentsByTripId.keys(),
  ]);

  for (const tripItId of allTripItIds) {
    try {
      const tripEvent = tripEventMap.get(tripItId);
      const segments = segmentsByTripId.get(tripItId) ?? [];
      const externalUid = `tripit::trip::${tripItId}`;

      // Determine trip title, dates, location from the trip-level event if available
      const tripTitle = tripEvent?.summary ?? segments[0]?.summary ?? 'TripIt Trip';
      const allDates = [
        ...(tripEvent ? [tripEvent.start, tripEvent.end] : []),
        ...segments.map(s => s.start),
        ...segments.map(s => s.end),
      ].filter(Boolean) as Date[];
      const tripStart = tripEvent?.start ?? (allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date());
      const tripEnd = tripEvent?.end ?? (allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : tripStart);
      const tripLocation = tripEvent?.location ?? segments[0]?.location ?? '';

      // Upsert the trip
      let tripId: string;
      const existingTrip = await db.query.trips.findFirst({
        where: and(eq(trips.accountId, accountId), eq(trips.externalUid, externalUid)),
      });

      if (existingTrip) {
        await db.update(trips)
          .set({
            title: tripTitle,
            startDate: toDateString(tripStart),
            endDate: toDateString(tripEnd > tripStart ? tripEnd : tripStart),
            destinationCity: tripLocation || existingTrip.destinationCity,
            updatedAt: new Date(),
          })
          .where(eq(trips.id, existingTrip.id));
        tripId = existingTrip.id;
        result.updated++;
      } else {
        const [newTrip] = await db.insert(trips).values({
          accountId,
          title: tripTitle,
          startDate: toDateString(tripStart),
          endDate: toDateString(tripEnd > tripStart ? tripEnd : tripStart),
          destinationCity: tripLocation || undefined,
          status: 'confirmed',
          externalUid,
          externalSource: 'tripit',
          createdBy: userId,
        }).returning();

        await db.insert(tripMembers).values({
          tripId: newTrip.id,
          userId,
          role: 'editor',
        });

        tripId = newTrip.id;
        result.created++;
      }

      // Upsert each segment as a reservation under this trip
      for (const seg of segments) {
        const resExternalUid = `tripit::item::${seg.uid}`;
        const resType = guessReservationType(seg.summary, seg.description);
        const mappedType = resType === 'restaurant' ? 'activity' : resType;
        const meta = parseSegmentDescription(seg.description, mappedType, seg.summary);

        // Dedup key stored in providerWebsite — not visible in UI
        const existingRes = await db.query.reservations.findFirst({
          where: and(
            eq(reservations.tripId, tripId),
            eq(reservations.providerWebsite, resExternalUid),
          ),
        });

        // For flights, build display title as "MIA → FRA"; store tz label in providerPhone for timezone display
        const flightParsed = mappedType === 'flight' ? parseFlightSummary(seg.summary) : null;
        const displayTitle = flightParsed ? flightParsed.displayTitle : seg.summary;
        // TripIt iCal has no TZID on DTSTART — use the tz label extracted from the description
        const tzDisplay = meta.tzDisplay ?? seg.startTzid ?? null;
        let structuredNotes = meta.notes ?? null;
        if (mappedType === 'flight') {
          const parts: string[] = [];
          if (meta.depTime) parts.push(`Departs ${meta.depTime}`);
          if (flightParsed) parts.push(`Flight Number ${flightParsed.flightNumber}`);
          if (meta.confirmationNumber) parts.push(`Confirmation ${meta.confirmationNumber}`);
          if (meta.arriveInfo) parts.push(`Arrive ${meta.arriveInfo}`);
          structuredNotes = parts.length ? parts.join('\n') : null;
        }

        if (existingRes) {
          await db.update(reservations)
            .set({
              title: displayTitle,
              startDateTime: seg.start,
              endDateTime: seg.end,
              location: seg.location || null,
              confirmationNumber: meta.confirmationNumber ?? existingRes.confirmationNumber,
              providerName: meta.providerName ?? existingRes.providerName,
              notes: structuredNotes ?? existingRes.notes,
              providerPhone: tzDisplay ?? existingRes.providerPhone,
              updatedAt: new Date(),
            })
            .where(eq(reservations.id, existingRes.id));
        } else {
          await db.insert(reservations).values({
            tripId,
            type: mappedType,
            title: displayTitle,
            startDateTime: seg.start,
            endDateTime: seg.end,
            location: seg.location || null,
            confirmationNumber: meta.confirmationNumber ?? null,
            providerName: meta.providerName ?? null,
            notes: structuredNotes,
            providerPhone: tzDisplay ?? null,
            providerWebsite: resExternalUid,
            source: 'calendar_import',
            createdBy: userId,
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`TripIt trip ${tripItId}: ${msg}`);
    }
  }

  await db.update(tripitFeeds)
    .set({ lastSyncAt: new Date(), status: 'active', lastError: null, updatedAt: new Date() })
    .where(eq(tripitFeeds.id, feedId));

  return result;
}
