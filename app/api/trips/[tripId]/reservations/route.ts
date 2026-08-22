import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  reservations,
  flightReservations,
  carRentalReservations,
  hotelReservations,
  activityReservations,
  transportReservations,
} from '@/db/schema';

const reservationSchema = z.object({
  type: z.enum(['flight', 'hotel', 'car', 'rail', 'cruise', 'activity', 'restaurant', 'transport', 'other']),
  title: z.string().min(1).max(255),
  confirmationNumber: z.string().max(255).nullable().optional(),
  providerName: z.string().max(255).nullable().optional(),
  providerPhone: z.string().max(255).nullable().optional(),
  providerWebsite: z.string().nullable().optional(),
  startDateTime: z.string(),
  endDateTime: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  totalCost: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  source: z.enum(['manual', 'email_import', 'calendar_import', 'api_import']).default('manual'),
  details: z.record(z.string(), z.any()).optional(),
});

async function requireTripAccess(tripId: string, userId: string, requireEditor = false) {
  const member = await db.query.tripMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.tripId, tripId), eqOp(t.userId, userId)),
  });
  if (member) {
    if (requireEditor && member.role === 'viewer') return null;
    return member;
  }

  const trip = await db.query.trips.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, tripId),
  });
  if (!trip) return null;

  const accountMember = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, trip.accountId), eqOp(t.userId, userId)),
  });
  if (!accountMember) return null;
  if (requireEditor && accountMember.role === 'viewer') return null;
  return accountMember;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await requireTripAccess(tripId, session.user.id);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const result = await db.query.reservations.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.tripId, tripId),
    orderBy: (t, { asc }) => [asc(t.startDateTime)],
    with: {
      flightDetails: true,
      hotelDetails: true,
      carRentalDetails: true,
      activityDetails: true,
      transportDetails: true,
    },
  });

  const withDetails = result.map((r) => {
    const details: any = {};
    if (r.flightDetails) details.flight = r.flightDetails;
    if (r.hotelDetails) details.hotel = r.hotelDetails;
    if (r.carRentalDetails) details.car = r.carRentalDetails;
    if (r.activityDetails) details.activity = r.activityDetails;
    if (r.transportDetails) details.transport = r.transportDetails;
    return { ...r, details };
  });

  return NextResponse.json(withDetails);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await requireTripAccess(tripId, session.user.id, true);
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { details, ...reservationData } = parsed.data;

  const [reservation] = await db
    .insert(reservations)
    .values({
      tripId,
      ...reservationData,
      startDateTime: new Date(parsed.data.startDateTime),
      endDateTime: parsed.data.endDateTime ? new Date(parsed.data.endDateTime) : undefined,
      createdBy: session.user.id,
    })
    .returning();

  if (details && reservation) {
    switch (reservation.type) {
      case 'flight': {
        if (details.flight) {
          await db.insert(flightReservations).values({
            reservationId: reservation.id,
            ...details.flight,
          });
        }
        break;
      }
      case 'car': {
        if (details.car) {
          await db.insert(carRentalReservations).values({
            reservationId: reservation.id,
            ...details.car,
            pickupDateTime: new Date(details.car.pickupDateTime),
            dropoffDateTime: new Date(details.car.dropoffDateTime),
          });
        }
        break;
      }
      case 'hotel': {
        if (details.hotel) {
          await db.insert(hotelReservations).values({
            reservationId: reservation.id,
            ...details.hotel,
            checkIn: new Date(details.hotel.checkIn),
            checkOut: new Date(details.hotel.checkOut),
          });
        }
        break;
      }
      case 'activity':
      case 'restaurant':
      case 'cruise': {
        if (details.activity) {
          await db.insert(activityReservations).values({
            reservationId: reservation.id,
            ...details.activity,
          });
        }
        break;
      }
      case 'rail':
      case 'transport':
      case 'other': {
        if (details.transport) {
          await db.insert(transportReservations).values({
            reservationId: reservation.id,
            ...details.transport,
          });
        }
        break;
      }
    }
  }

  return NextResponse.json(reservation, { status: 201 });
}
