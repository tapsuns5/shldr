import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { travelers } from '@/db/schema';

const updateTravelerSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  birthDate: z.string().optional(),
  passportNumberEncrypted: z.string().optional(),
  passportCountry: z.string().max(100).optional(),
  passportExpiration: z.string().optional(),
  knownTravelerNumber: z.string().max(100).optional(),
  redressNumber: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; travelerId: string }> }
) {
  const { travelerId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = updateTravelerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(travelers)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(travelers.id, travelerId))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; travelerId: string }> }
) {
  const { travelerId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.delete(travelers).where(eq(travelers.id, travelerId));
  return NextResponse.json({ success: true });
}
