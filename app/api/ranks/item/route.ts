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
  rankKey: z.string(),
  action: z.enum(['add', 'remove', 'update']),
  tierId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { accountId, view, rankKey, action, tierId, tags } = parsed.data;
  const membership = await db.query.accountMembers.findFirst({
    where: (t, { and, eq }) => and(eq(t.accountId, accountId), eq(t.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!(await validateRankKeys(accountId, view, [rankKey]))) {
    return NextResponse.json({ error: 'Invalid ranking item' }, { status: 400 });
  }
  if (tierId) {
    const tier = await db.query.rankTiers.findFirst({
      where: (t, { and, eq }) => and(eq(t.id, tierId), eq(t.accountId, accountId)),
    });
    if (!tier) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const current = await loadRankItems(accountId, view);
  const rankedCount = current.filter((item) => item.rankOrder !== null).length;
  const rankOrder = action === 'add' ? rankedCount : action === 'remove' ? null : undefined;
  const nextTierId = action === 'remove' ? null : tierId;

  if (rankKey.startsWith('trip:')) {
    await db
      .update(trips)
      .set({
        ...(rankOrder !== undefined ? { rankOrder } : {}),
        ...(nextTierId !== undefined ? { rankTierId: nextTierId } : {}),
        ...(tags !== undefined ? { rankLabels: tags } : {}),
        updatedAt: new Date(),
      })
      .where(eq(trips.id, rankKey.slice(5)));
  } else if (rankKey.startsWith('reservation:')) {
    await db
      .update(reservations)
      .set({
        ...(rankOrder !== undefined ? { rankOrder } : {}),
        ...(nextTierId !== undefined ? { rankTierId: nextTierId } : {}),
        ...(tags !== undefined ? { rankLabels: tags } : {}),
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, rankKey.slice(12)));
  } else {
    const city = await ensureCityPreference(accountId, rankKey);
    if (!city) return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
    await db
      .update(rankedCities)
      .set({
        ...(rankOrder !== undefined ? { rankOrder } : {}),
        ...(nextTierId !== undefined ? { rankTierId: nextTierId } : {}),
        ...(tags !== undefined ? { rankLabels: tags } : {}),
        updatedAt: new Date(),
      })
      .where(eq(rankedCities.id, city.id));
  }

  const refreshed = await loadRankItems(accountId, view as RankView);
  const { ranked, unranked } = partitionRankItems(refreshed);
  if (action === 'remove') {
    await db.transaction(async (tx) => {
      for (const [order, item] of ranked.entries()) {
        if (item.rankKey.startsWith('trip:')) {
          await tx.update(trips).set({ rankOrder: order }).where(eq(trips.id, item.rankKey.slice(5)));
        } else if (item.rankKey.startsWith('reservation:')) {
          await tx
            .update(reservations)
            .set({ rankOrder: order })
            .where(eq(reservations.id, item.rankKey.slice(12)));
        } else {
          const city = await ensureCityPreference(accountId, item.rankKey);
          if (city) await tx.update(rankedCities).set({ rankOrder: order }).where(eq(rankedCities.id, city.id));
        }
      }
    });
    ranked.forEach((item, order) => {
      item.rankOrder = order;
    });
  }

  return NextResponse.json({
    ranked,
    unranked,
    counts: { total: refreshed.length, ranked: ranked.length, unranked: unranked.length },
  });
}
