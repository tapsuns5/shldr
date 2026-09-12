import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { rankedCities, reservations, trips } from '@/db/schema';
import {
  ensureCityPreference,
  loadRankItems,
  validateRankKeys,
  type RankView,
} from '@/lib/rank-server';
import { partitionRankItems } from '@/lib/rank';

const schema = z.object({
  accountId: z.string().uuid(),
  view: z.enum(['trips', 'restaurants', 'cities', 'hotels', 'activities']),
  rankKeys: z.array(z.string()).max(1000),
});

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { accountId, view, rankKeys } = parsed.data;
  const membership = await db.query.accountMembers.findFirst({
    where: (t, { and, eq }) => and(eq(t.accountId, accountId), eq(t.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!(await validateRankKeys(accountId, view, rankKeys))) {
    return NextResponse.json({ error: 'Ranking contains invalid items' }, { status: 400 });
  }

  const cityRows = new Map<string, string>();
  if (view === 'cities') {
    for (const rankKey of rankKeys) {
      const row = await ensureCityPreference(accountId, rankKey);
      if (!row) return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
      cityRows.set(rankKey, row.id);
    }
  }

  await db.transaction(async (tx) => {
    for (const [rankOrder, rankKey] of rankKeys.entries()) {
      if (rankKey.startsWith('trip:')) {
        await tx.update(trips).set({ rankOrder, updatedAt: new Date() }).where(eq(trips.id, rankKey.slice(5)));
      } else if (rankKey.startsWith('reservation:')) {
        await tx
          .update(reservations)
          .set({ rankOrder, updatedAt: new Date() })
          .where(eq(reservations.id, rankKey.slice(12)));
      } else {
        await tx
          .update(rankedCities)
          .set({ rankOrder, updatedAt: new Date() })
          .where(eq(rankedCities.id, cityRows.get(rankKey)!));
      }
    }
  });

  const items = await loadRankItems(accountId, view as RankView);
  const { ranked, unranked } = partitionRankItems(items);
  return NextResponse.json({
    ranked,
    unranked,
    counts: { total: items.length, ranked: ranked.length, unranked: unranked.length },
  });
}
