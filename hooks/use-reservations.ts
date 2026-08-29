import { useEffect, useState, useCallback } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { type PlanDay } from './use-trips';

dayjs.extend(utc);

/**
 * Reservation timestamps have two storage conventions:
 *  - `email_import`: naive-UTC — the wall-clock time of the event encoded
 *    via `Date.UTC(...)`.  Must be read with `dayjs.utc()` so no timezone
 *    conversion happens.
 *  - everything else (manual, calendar_import, api_import): real UTC
 *    moments.  Must be read with `dayjs()` so they convert to the viewer's
 *    local timezone.
 */
export function reservationDayjs(
  reservation: { source?: string | null },
  value: string | null | undefined,
): Dayjs {
  if (!value) return dayjs(NaN);
  return reservation.source === 'email_import'
    ? dayjs.utc(value)
    : dayjs(value);
}

/**
 * Determine whether a reservation has an explicit time (vs. defaulting to
 * midnight).  For email_import, midnight UTC means no time was found in the
 * email.  For other sources, midnight in the viewer's timezone is unlikely
 * but we treat it as having no time too.
 */
export function reservationHasTime(
  reservation: { source?: string | null; startDateTime: string },
): boolean {
  const d = reservationDayjs(reservation, reservation.startDateTime);
  return d.hour() !== 0 || d.minute() !== 0;
}

export interface APIReservation {
  id: string;
  tripId: string;
  type: 'flight' | 'hotel' | 'car' | 'rail' | 'cruise' | 'activity' | 'restaurant' | 'transport' | 'other';
  title: string;
  confirmationNumber?: string | null;
  providerName?: string | null;
  providerPhone?: string | null;
  providerWebsite?: string | null;
  startDateTime: string;
  endDateTime?: string | null;
  location?: string | null;
  currency?: string | null;
  totalCost?: string | null;
  notes?: string | null;
  rawEmailHtml?: string | null;
  rawEmailSubject?: string | null;
  source?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  details?: APIReservationDetails | null;
}

export interface APIReservationDetails {
  flight?: {
    airline: string;
    flightNumber: string;
    departureAirport: string;
    arrivalAirport: string;
    departureTerminal?: string | null;
    arrivalTerminal?: string | null;
    departureGate?: string | null;
    arrivalGate?: string | null;
    seat?: string | null;
    ticketNumber?: string | null;
    bookingClass?: string | null;
  };
  car?: {
    vendor: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupDateTime: string;
    dropoffDateTime: string;
    vehicleClass?: string | null;
  };
  hotel?: {
    hotelName: string;
    address1?: string | null;
    address2?: string | null;
    city: string;
    state?: string | null;
    country: string;
    postalCode?: string | null;
    roomType?: string | null;
    checkIn: string;
    checkOut: string;
    guestCount?: string | null;
  };
  activity?: {
    activityName: string;
    venue?: string | null;
    address?: string | null;
    ticketCount?: string | null;
  };
  transport?: {
    transportType: string;
    operator?: string | null;
    departureLocation?: string | null;
    arrivalLocation?: string | null;
  };
}

export type DetailLine = { text: string; address?: string };

export function getReservationDetailLines(reservation: APIReservation): DetailLine[] {
  const details = reservation.details;
  const lines: DetailLine[] = [];

  switch (reservation.type) {
    case 'flight': {
      const f = details?.flight;
      if (f) {
        // Manually entered flight — build structured lines
        lines.push({ text: `Flight Number ${f.airline} ${f.flightNumber}` });
        lines.push({ text: `${f.departureAirport} → ${f.arrivalAirport}` });
        if (reservation.confirmationNumber) lines.push({ text: `Confirmation ${reservation.confirmationNumber}` });
        if (f.departureTerminal) {
          lines.push({ text: `Terminal ${f.departureTerminal}${f.departureGate ? `, Gate ${f.departureGate}` : ''}` });
        }
        if (f.seat) lines.push({ text: `Seat ${f.seat}` });
        if (f.ticketNumber) lines.push({ text: `Ticket: ${f.ticketNumber}` });
      } else if (reservation.notes && !reservation.notes.startsWith('tripit::')) {
        // Imported flight — strip the "Departs ..." line (shown in time column) then return rest
        lines.push({
          text: reservation.notes
            .split('\n')
            .filter(l => !/^Departs\s/i.test(l))
            .join('\n')
            .trim(),
        });
      }
      break;
    }
    case 'car': {
      const c = details?.car;
      if (c) {
        lines.push({ text: `Pick up ${reservationDayjs(reservation, c.pickupDateTime).format('h:mm A')}` });
        lines.push({ text: c.pickupLocation, address: c.pickupLocation });
        lines.push({ text: `Drop off ${reservationDayjs(reservation, c.dropoffDateTime).format('h:mm A')}` });
        lines.push({ text: c.dropoffLocation, address: c.dropoffLocation });
        if (c.vehicleClass) lines.push({ text: `Vehicle: ${c.vehicleClass}` });
      }
      break;
    }
    case 'hotel': {
      const h = details?.hotel;
      if (h) {
        const address = [h.address1, h.city, h.state, h.country].filter(Boolean).join(', ');
        lines.push({ text: address, address });
        lines.push({ text: `Check-in: ${reservationDayjs(reservation, h.checkIn).format('MMM D, h:mm A')}` });
        lines.push({ text: `Check-out: ${reservationDayjs(reservation, h.checkOut).format('MMM D, h:mm A')}` });
        if (h.roomType) lines.push({ text: `Room: ${h.roomType}` });
      }
      break;
    }
    case 'activity':
    case 'restaurant':
    case 'cruise': {
      const a = details?.activity;
      if (a) {
        if (a.venue) lines.push({ text: a.venue });
        if (a.address) lines.push({ text: a.address, address: a.address });
        if (a.ticketCount) lines.push({ text: `Tickets: ${a.ticketCount}` });
      }
      break;
    }
    case 'rail':
    case 'transport':
    case 'other': {
      const t = details?.transport;
      if (t) {
        lines.push({ text: t.transportType });
        if (t.operator) lines.push({ text: t.operator });
        if (t.departureLocation && t.arrivalLocation) {
          lines.push({
            text: `${t.departureLocation} → ${t.arrivalLocation}`,
            address: `${t.departureLocation}, ${t.arrivalLocation}`,
          });
        } else if (t.departureLocation) {
          lines.push({ text: t.departureLocation, address: t.departureLocation });
        }
      }
      break;
    }
    default:
      break;
  }

  if (reservation.type !== 'flight' && reservation.notes && !reservation.notes.startsWith('tripit::')) {
    reservation.notes
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .forEach((noteLine) => lines.push({ text: noteLine }));
  }

  // For imports (TripIt, email) the address is often in notes rather than structured details.
  // Mark any remaining line that contains the reservation location as clickable.
  const location = reservation.location?.trim();
  if (location) {
    const labelPattern = /^(Check-?in|Check-?out|Room:|Vehicle:|Tickets:|Total paid:|Confirmation)/i;
    for (const line of lines) {
      if (line.address) continue;
      if (line.text.length < location.length) continue;
      if (labelPattern.test(line.text)) continue;
      if (line.text.toLowerCase().includes(location.toLowerCase())) {
        line.address = location;
      }
    }
  }

  return lines;
}

export function formatReservationDetails(reservation: APIReservation): string {
  return getReservationDetailLines(reservation).map(l => l.text).join('\n');
}

/**
 * Convert an IANA timezone id (e.g. "America/New_York") or offset string
 * (e.g. "America/New_York") to a short display label like "EDT".
 * Falls back to the raw tzid if Intl resolution fails.
 */
export function tzidToAbbrev(tzid: string | null | undefined, refDate?: Date): string {
  if (!tzid) return 'Local';
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tzid,
      timeZoneName: 'short',
    });
    const parts = fmt.formatToParts(refDate ?? new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value ?? tzid;
  } catch {
    return tzid;
  }
}

/**
 * Given a flight title like "MIA → FRA" return the arrival airport code.
 */
function arrivalAirportFromTitle(title: string): string | null {
  const m = title.match(/→\s*([A-Z]{3})/);
  return m ? m[1] : null;
}

/**
 * Given a flight title like "FRA → OLB" return the departure airport code.
 */
function departureAirportFromTitle(title: string): string | null {
  const m = title.match(/^([A-Z]{3})\s*→/);
  return m ? m[1] : null;
}

/** Format minutes into "X hours, Y minutes" */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} minutes`;
  if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
  return `${h} hour${h !== 1 ? 's' : ''}, ${m} minute${m !== 1 ? 's' : ''}`;
}

export function reservationsToPlanDays(
  reservations: APIReservation[],
  startDate?: string | null,
  endDate?: string | null
): PlanDay[] {
  const grouped = new Map<string, PlanDay>();

  // Function to compute effective sort timestamp for sequential timeline ordering
  const getEffectiveReservationTime = (r: APIReservation): number => {
    const baseTime = reservationDayjs(r, r.startDateTime).valueOf();
    if (r.type !== 'hotel') return baseTime;

    const rDateStr = reservationDayjs(r, r.startDateTime).format('YYYY-MM-DD');
    let maxArrivalOnDay = 0;

    for (const item of reservations) {
      const itemDateStr = reservationDayjs(item, item.startDateTime).format('YYYY-MM-DD');
      if (itemDateStr !== rDateStr) continue;

      if (item.type === 'flight') {
        const arrTime = item.endDateTime ? reservationDayjs(item, item.endDateTime).valueOf() : reservationDayjs(item, item.startDateTime).add(2, 'hour').valueOf();
        if (arrTime > maxArrivalOnDay) maxArrivalOnDay = arrTime;
      } else if (item.type === 'car' || item.type === 'transport') {
        const startTime = reservationDayjs(item, item.startDateTime).valueOf();
        if (startTime > maxArrivalOnDay) maxArrivalOnDay = startTime;
      }
    }

    if (maxArrivalOnDay > 0 && baseTime <= maxArrivalOnDay) {
      return maxArrivalOnDay + 60 * 1000;
    }

    return baseTime;
  };

  // Sort all reservations by effective timestamp first
  const sorted = [...reservations].sort((a, b) =>
    getEffectiveReservationTime(a) - getEffectiveReservationTime(b)
  );

  type FlightTracker = {
    endDateTime: string | null | undefined;
    arrivalAirport: string | null;
    reservationId: string;
  };

  // Keep the most recent flight seen regardless of what came between
  let prevFlight: FlightTracker | null = null;

  for (const reservation of sorted) {
    const start = reservationDayjs(reservation, reservation.startDateTime);
    const dateKey = start.format('ddd, MMM D YYYY');
    const day = grouped.get(dateKey) || { id: dateKey, date: dateKey, items: [] };

    if (reservation.type === 'flight') {
      const depAirport = departureAirportFromTitle(reservation.title);

      if (prevFlight && prevFlight.arrivalAirport && depAirport) {
        const layoverStart = reservationDayjs({ source: reservation.source }, prevFlight.endDateTime);
        const layoverMinutes = start.diff(layoverStart, 'minute');

        // Same connecting airport, gap between 0 and 24 hours → it's a layover
        if (
          depAirport === prevFlight.arrivalAirport &&
          layoverMinutes >= 0 &&
          layoverMinutes <= 24 * 60
        ) {
          const layoverDateKey = start.format('ddd, MMM D YYYY');
          const layoverDay = grouped.get(layoverDateKey) || { id: layoverDateKey, date: layoverDateKey, items: [] };
          layoverDay.items.push({
            id: `layover-${reservation.id}`,
            time: '',
            timezone: '',
            type: 'layover',
            title: `${formatDuration(layoverMinutes)} layover in ${depAirport}`,
            details: '',
          });
          grouped.set(layoverDateKey, layoverDay);
        }
      }

      prevFlight = {
        endDateTime: reservation.endDateTime,
        arrivalAirport: arrivalAirportFromTitle(reservation.title),
        reservationId: reservation.id,
      };
    }
    // Non-flight items don't reset prevFlight — a hotel between two legs is fine

    // For hotels: no time shown (like TripIt). For flights: use local time from notes if available.
    // For events without an explicit time (midnight): show no time.
    const hasTime = reservationHasTime(reservation);
    let displayTime = hasTime ? start.format('h:mm A') : '';
    let displayTz = hasTime ? tzidToAbbrev(reservation.providerPhone, start.toDate()) : '';

    if (reservation.type === 'hotel') {
      displayTime = '';
      displayTz = '';
    } else if (reservation.type === 'flight' && reservation.notes) {
      const depMatch = reservation.notes.match(/^Departs\s+(\d{1,2}:\d{2}\s*[AP]M)\s+([A-Z]{2,5}|[+-]\d{2}(?::\d{2})?)/im);
      if (depMatch) {
        displayTime = depMatch[1];
        displayTz = depMatch[2];
      }
    }

    day.items.push({
      id: reservation.id,
      time: displayTime,
      timezone: displayTz,
      type: reservation.type,
      title: reservation.title,
      details: formatReservationDetails(reservation),
      reservation,
    });

    grouped.set(dateKey, day);
  }

  if (startDate && endDate) {
    let current = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).startOf('day');
    while (current.isValid() && end.isValid() && !current.isAfter(end, 'day')) {
      const dateKey = current.format('ddd, MMM D YYYY');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { id: dateKey, date: dateKey, items: [] });
      }
      current = current.add(1, 'day');
    }
  }

  return Array.from(grouped.values()).sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
}

export function useReservations(tripId: string) {
  const [reservations, setReservations] = useState<APIReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trips/${tripId}/reservations`);
        if (!res.ok) throw new Error('Failed to load plans');
        const data: APIReservation[] = await res.json();
        if (!cancelled) setReservations(data);
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
  }, [tripId, version]);

  return { reservations, loading, error, refetch };
}
