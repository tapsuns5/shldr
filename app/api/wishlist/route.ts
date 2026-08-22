import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { wishlistDestinations } from '@/db/schema';

const createWishlistSchema = z
  .object({
    accountId: z.string().uuid(),
    type: z.enum(['city', 'country']).default('city'),
    city: z.string().min(1).max(255).optional(),
    country: z.string().min(1).max(255),
    countryCode: z.string().max(2).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'city' && !data.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'city is required when type is "city"',
        path: ['city'],
      });
    }
  });

const patchWishlistSchema = z.object({
  id: z.string().uuid(),
  note: z.string().optional(),
  visited: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, session.user.id)),
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const items = await db.query.wishlistDestinations.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = createWishlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, parsed.data.accountId), eqOp(t.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { accountId, ...data } = parsed.data;
  const [item] = await db
    .insert(wishlistDestinations)
    .values({
      accountId,
      ...data,
      createdBy: session.user.id,
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const item = await db.query.wishlistDestinations.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, id),
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, item.accountId), eqOp(t.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.delete(wishlistDestinations).where(eq(wishlistDestinations.id, id));
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = patchWishlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, note, visited } = parsed.data;

  const item = await db.query.wishlistDestinations.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, id),
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, item.accountId), eqOp(t.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: Partial<typeof wishlistDestinations.$inferInsert> = { updatedAt: new Date() };
  if (note !== undefined) updates.note = note;
  if (visited !== undefined) {
    updates.visitedAt = visited ? (item.visitedAt ?? new Date()) : null;
  }

  const [updated] = await db
    .update(wishlistDestinations)
    .set(updates)
    .where(eq(wishlistDestinations.id, id))
    .returning();

  return NextResponse.json(updated);
}
