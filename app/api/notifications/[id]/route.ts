import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = await db.query.notifications.findFirst({
    where: and(eq(notifications.id, id), eq(notifications.userId, session.user.id)),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  const [updated] = await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(eq(notifications.id, id))
    .returning();

  return NextResponse.json(updated);
}
