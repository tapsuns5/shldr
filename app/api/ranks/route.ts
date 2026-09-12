import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { loadRankItems, type RankView } from '@/lib/rank-server';
import { partitionRankItems } from '@/lib/rank';

const views = new Set<RankView>(['trips', 'restaurants', 'cities', 'hotels', 'activities']);

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const requestedView = searchParams.get('view') as RankView | null;
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  if (!requestedView || !views.has(requestedView)) {
    return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
  }

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.accountId, accountId), eq(t.userId, session.user.id)),
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [items, tiers] = await Promise.all([
    loadRankItems(accountId, requestedView),
    db.query.rankTiers.findMany({
      where: (t, { eq }) => eq(t.accountId, accountId),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.label)],
    }),
  ]);
  const { ranked, unranked } = partitionRankItems(items);

  return NextResponse.json({
    ranked,
    unranked,
    tiers,
    counts: {
      total: items.length,
      ranked: ranked.length,
      unranked: unranked.length,
    },
  });
}
