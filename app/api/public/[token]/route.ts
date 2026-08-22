import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  publicShares,
  reservations,
  flightReservations,
  hotelReservations,
  carRentalReservations,
  activityReservations,
  transportReservations,
} from '@/db/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const share = await db.query.publicShares.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.token, token),
    with: {
      trip: {
        with: { tripDestinations: true },
      },
    },
  });

  if (!share) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  if (share.revokedAt) {
    return NextResponse.json({ error: 'This link has been revoked' }, { status: 410 });
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This link has expired' }, { status: 410 });
  }

  const trip = share.trip;

  const tripReservations = await db
    .select()
    .from(reservations)
    .where(eq(reservations.tripId, trip.id));

  const reservationIds = tripReservations.map((r) => r.id);

  const [flights, hotels, cars, activities, transports] = await Promise.all([
    reservationIds.length
      ? db.select().from(flightReservations).where(inArray(flightReservations.reservationId, reservationIds))
      : [],
    reservationIds.length
      ? db.select().from(hotelReservations).where(inArray(hotelReservations.reservationId, reservationIds))
      : [],
    reservationIds.length
      ? db.select().from(carRentalReservations).where(inArray(carRentalReservations.reservationId, reservationIds))
      : [],
    reservationIds.length
      ? db.select().from(activityReservations).where(inArray(activityReservations.reservationId, reservationIds))
      : [],
    reservationIds.length
      ? db.select().from(transportReservations).where(inArray(transportReservations.reservationId, reservationIds))
      : [],
  ]);

  const flightMap = new Map(flights.map((f) => [f.reservationId, f]));
  const hotelMap = new Map(hotels.map((h) => [h.reservationId, h]));
  const carMap = new Map(cars.map((c) => [c.reservationId, c]));
  const activityMap = new Map(activities.map((a) => [a.reservationId, a]));
  const transportMap = new Map(transports.map((t) => [t.reservationId, t]));

  const reservationsWithDetails = tripReservations.map((r) => {
    const details: Record<string, unknown> = {};
    const flight = flightMap.get(r.id);
    const hotel = hotelMap.get(r.id);
    const car = carMap.get(r.id);
    const activity = activityMap.get(r.id);
    const transport = transportMap.get(r.id);
    if (flight) details.flight = flight;
    if (hotel) details.hotel = hotel;
    if (car) details.car = car;
    if (activity) details.activity = activity;
    if (transport) details.transport = transport;

    return {
      id: r.id,
      tripId: r.tripId,
      type: r.type,
      title: r.title,
      confirmationNumber: r.confirmationNumber,
      providerName: r.providerName,
      providerPhone: r.providerPhone,
      providerWebsite: r.providerWebsite,
      startDateTime: r.startDateTime.toISOString(),
      endDateTime: r.endDateTime?.toISOString() ?? null,
      location: r.location,
      currency: r.currency,
      totalCost: r.totalCost,
      notes: r.notes,
      rawEmailHtml: null,
      rawEmailSubject: null,
      source: r.source,
      details: Object.keys(details).length > 0 ? details : null,
    };
  });

  const publicTrip = {
    id: trip.id,
    title: trip.title,
    description: trip.description,
    startDate: trip.startDate,
    endDate: trip.endDate,
    status: trip.status,
    destinationCity: trip.destinationCity,
    destinationCountry: trip.destinationCountry,
    coverImage: trip.coverImage,
    tripDestinations: trip.tripDestinations.map((d) => ({
      city: d.city,
      state: d.state,
      country: d.country,
      arrivalDate: d.arrivalDate,
      departureDate: d.departureDate,
      sortOrder: d.sortOrder,
    })),
    reservations: reservationsWithDetails,
    expiresAt: share.expiresAt?.toISOString() ?? null,
  };

  return NextResponse.json(publicTrip);
}
