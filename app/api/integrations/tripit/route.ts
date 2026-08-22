import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { tripitFeeds, accountMembers } from '@/db/schema';

const saveSchema = z.object({
  accountId: z.string().uuid(),
  icalUrl: z
    .string()
    .url()
    .refine((u) => u.endsWith('.ics'), { message: 'URL must end in .ics' }),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accountId = new URL(request.url).searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, session.user.id)),
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const feed = await db.query.tripitFeeds.findFirst({
    where: eq(tripitFeeds.accountId, accountId),
  });

  return NextResponse.json(feed ?? null);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { accountId, icalUrl } = parsed.data;

  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await db.query.tripitFeeds.findFirst({
    where: eq(tripitFeeds.accountId, accountId),
  });

  let feed;
  if (existing) {
    [feed] = await db
      .update(tripitFeeds)
      .set({ icalUrl, status: 'active', lastError: null, updatedAt: new Date() })
      .where(eq(tripitFeeds.id, existing.id))
      .returning();
  } else {
    [feed] = await db
      .insert(tripitFeeds)
      .values({ accountId, icalUrl })
      .returning();
  }

  return NextResponse.json(feed, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accountId = new URL(request.url).searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.delete(tripitFeeds).where(eq(tripitFeeds.accountId, accountId));

  return NextResponse.json({ success: true });
}
