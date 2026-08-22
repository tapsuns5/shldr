import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { accounts, accountMembers } from '@/db/schema';

const updateAccountSchema = z.object({
  locationDisplayMode: z.enum(['map', 'image']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, session.user.id)),
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.locationDisplayMode !== undefined) {
    updates.locationDisplayMode = parsed.data.locationDisplayMode;
  }

  const [updated] = await db
    .update(accounts)
    .set(updates)
    .where(eq(accounts.id, accountId))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    locationDisplayMode: updated.locationDisplayMode,
    timezone: updated.timezone,
    ownerUserId: updated.ownerUserId,
    createdAt: updated.createdAt.toISOString(),
  });
}
