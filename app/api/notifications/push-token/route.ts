import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { pushTokens } from '@/db/schema';

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string().max(255).optional(),
});

const unregisterSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { token, platform, deviceId } = parsed.data;

  await db
    .insert(pushTokens)
    .values({ userId: session.user.id, token, platform, deviceId })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId: session.user.id, platform, deviceId, lastSeenAt: new Date() },
    });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = unregisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.token, parsed.data.token), eq(pushTokens.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
