import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { accountMembers } from '@/db/schema';

const inviteMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(['admin', 'member', 'viewer']),
});

async function requireAccountAdmin(accountId: string, userId: string) {
  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, userId)),
  });
  if (!membership) return null;
  if (!['owner', 'admin'].includes(membership.role)) return null;
  return membership;
}

export async function GET(
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

  const members = await db.query.accountMembers.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
    with: { user: true },
  });

  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = await requireAccountAdmin(accountId, session.user.id);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [member] = await db
    .insert(accountMembers)
    .values({
      accountId,
      userId: parsed.data.userId,
      role: parsed.data.role,
      invitedBy: session.user.id,
      joinedAt: new Date(),
    })
    .returning();

  return NextResponse.json(member, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = await requireAccountAdmin(accountId, session.user.id);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(accountMembers)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(
      and(
        eq(accountMembers.accountId, accountId),
        eq(accountMembers.userId, parsed.data.userId)
      )
    )
    .returning();

  if (!updated) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = await requireAccountAdmin(accountId, session.user.id);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const targetMembership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, userId)),
  });
  if (targetMembership?.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the account owner' }, { status: 400 });
  }

  await db
    .delete(accountMembers)
    .where(
      and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, userId))
    );

  return NextResponse.json({ success: true });
}
