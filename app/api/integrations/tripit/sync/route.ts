import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { tripitFeeds, accountMembers } from '@/db/schema';
import { syncTripItFeed } from '@/lib/tripit-sync';

const syncSchema = z.object({
  accountId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { accountId } = parsed.data;

  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, session.user.id)),
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const feed = await db.query.tripitFeeds.findFirst({
    where: eq(tripitFeeds.accountId, accountId),
  });
  if (!feed) return NextResponse.json({ error: 'No TripIt feed configured' }, { status: 404 });

  try {
    const result = await syncTripItFeed(feed.id, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
