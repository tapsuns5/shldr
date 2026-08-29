import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { reservations, flightReservations, hotelReservations } from '@/db/schema';

const updateReservationSchema = z.object({
  tripId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  confirmationNumber: z.string().max(255).nullable().optional(),
  providerName: z.string().max(255).nullable().optional(),
  providerPhone: z.string().max(255).nullable().optional(),
  providerWebsite: z.string().nullable().optional(),
  startDateTime: z.string().nullable().optional(),
  endDateTime: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  totalCost: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const flightDetailsSchema = z.object({
  airline: z.string().max(255),
  flightNumber: z.string().max(50),
  departureAirport: z.string().max(10),
  arrivalAirport: z.string().max(10),
  departureTerminal: z.string().max(50).optional(),
  arrivalTerminal: z.string().max(50).optional(),
  departureGate: z.string().max(50).optional(),
  arrivalGate: z.string().max(50).optional(),
  seat: z.string().max(20).optional(),
  ticketNumber: z.string().max(255).optional(),
  bookingClass: z.string().max(50).optional(),
});

const hotelDetailsSchema = z.object({
  hotelName: z.string().max(255),
  address1: z.string().max(255).optional(),
  address2: z.string().max(255).optional(),
  city: z.string().max(255),
  state: z.string().max(255).optional(),
  country: z.string().max(255),
  postalCode: z.string().max(50).optional(),
  roomType: z.string().max(255).optional(),
  checkIn: z.string(),
  checkOut: z.string(),
  guestCount: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; reservationId: string }> }
) {
  const { reservationId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reservation = await db.query.reservations.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, reservationId),
  });
  if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(reservation);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; reservationId: string }> }
) {
  const { reservationId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = updateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.startDateTime) updateData.startDateTime = new Date(parsed.data.startDateTime);
  if (parsed.data.endDateTime) updateData.endDateTime = new Date(parsed.data.endDateTime);

  const [updated] = await db
    .update(reservations)
    .set(updateData)
    .where(eq(reservations.id, reservationId))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; reservationId: string }> }
) {
  const { reservationId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.delete(reservations).where(eq(reservations.id, reservationId));
  return NextResponse.json({ success: true });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; reservationId: string }> }
) {
  const { reservationId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { detailType, ...details } = body;

  if (detailType === 'flight') {
    const parsed = flightDetailsSchema.safeParse(details);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const [result] = await db
      .insert(flightReservations)
      .values({ reservationId, ...parsed.data })
      .onConflictDoUpdate({
        target: flightReservations.reservationId,
        set: { ...parsed.data, updatedAt: new Date() },
      })
      .returning();
    return NextResponse.json(result);
  }

  if (detailType === 'hotel') {
    const parsed = hotelDetailsSchema.safeParse(details);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const [result] = await db
      .insert(hotelReservations)
      .values({
        reservationId,
        ...parsed.data,
        checkIn: new Date(parsed.data.checkIn),
        checkOut: new Date(parsed.data.checkOut),
      })
      .onConflictDoUpdate({
        target: hotelReservations.reservationId,
        set: {
          ...parsed.data,
          checkIn: new Date(parsed.data.checkIn),
          checkOut: new Date(parsed.data.checkOut),
          updatedAt: new Date(),
        },
      })
      .returning();
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown detailType' }, { status: 400 });
}
