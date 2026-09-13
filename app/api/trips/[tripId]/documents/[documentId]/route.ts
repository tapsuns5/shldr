import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { deleteFromR2 } from '@/lib/r2';

async function requireTripMember(tripId: string, userId: string) {
  return db.query.tripMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.tripId, tripId), eqOp(t.userId, userId)),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; documentId: string }> }
) {
  const { tripId, documentId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await requireTripMember(tripId, session.user.id);
  if (!member || member.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const doc = await db.query.documents.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.id, documentId), eqOp(t.tripId, tripId)),
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl && doc.fileUrl.startsWith(`${publicUrl}/`)) {
    const key = doc.fileUrl.slice(publicUrl.length + 1);
    try {
      await deleteFromR2(key);
    } catch {
      // File may already be gone from storage; still remove the record.
    }
  }

  await db.delete(documents).where(and(eq(documents.id, doc.id), eq(documents.tripId, tripId)));

  return NextResponse.json({ success: true });
}
