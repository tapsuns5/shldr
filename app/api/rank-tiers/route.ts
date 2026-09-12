import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { rankTiers } from '@/db/schema';

const createTierSchema = z.object({
  accountId: z.string().uuid(),
  label: z.string().min(1).max(20),
  description: z.string().max(120).optional(),
  sortOrder: z.number().int().default(0),
  color: z.string().max(20).optional(),
});

const patchTierSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(20).optional(),
  description: z.string().max(120).optional().nullable(),
  sortOrder: z.number().int().optional(),
  color: z.string().max(20).optional().nullable(),
});

async function getMembership(accountId: string, userId: string) {
  return db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, userId)),
  });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const membership = await getMembership(accountId, session.user.id);
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tiers = await db.query.rankTiers.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.label)],
  });

  return NextResponse.json(tiers);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = createTierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await getMembership(parsed.data.accountId, session.user.id);
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { accountId, ...data } = parsed.data;
  try {
    const [tier] = await db
      .insert(rankTiers)
      .values({ accountId, ...data, createdBy: session.user.id })
      .returning();
    return NextResponse.json(tier, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Tier label already exists for this account' }, { status: 409 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = patchTierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, ...updates } = parsed.data;

  const tier = await db.query.rankTiers.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, id),
  });
  if (!tier) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await getMembership(tier.accountId, session.user.id);
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const setValues: Partial<typeof rankTiers.$inferInsert> = { updatedAt: new Date() };
  if (updates.label !== undefined) setValues.label = updates.label;
  if (updates.description !== undefined) setValues.description = updates.description ?? null;
  if (updates.sortOrder !== undefined) setValues.sortOrder = updates.sortOrder;
  if (updates.color !== undefined) setValues.color = updates.color ?? null;

  const [updated] = await db
    .update(rankTiers)
    .set(setValues)
    .where(eq(rankTiers.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const tier = await db.query.rankTiers.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, id),
  });
  if (!tier) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await getMembership(tier.accountId, session.user.id);
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.delete(rankTiers).where(eq(rankTiers.id, id));
  return NextResponse.json({ success: true });
}
