import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { uploadToR2, deleteFromR2 } from '@/lib/r2';
import { randomUUID } from 'crypto';

const documentTypeEnum = z.enum(['passport', 'visa', 'ticket', 'insurance', 'hotel', 'receipt', 'other']);

async function requireTripMember(tripId: string, userId: string) {
  return db.query.tripMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.tripId, tripId), eqOp(t.userId, userId)),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await requireTripMember(tripId, session.user.id);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const result = await db.query.documents.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.tripId, tripId),
  });

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await requireTripMember(tripId, session.user.id);
  if (!member || member.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const documentType = formData.get('documentType') as string | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const typeResult = documentTypeEnum.safeParse(documentType ?? 'other');
  const docType = typeResult.success ? typeResult.data : 'other';

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const key = `trips/${tripId}/documents/${randomUUID()}-${file.name}`;

  const fileUrl = await uploadToR2(key, buffer, file.type);

  const [doc] = await db
    .insert(documents)
    .values({
      tripId,
      uploadedBy: session.user.id,
      fileName: file.name,
      fileUrl,
      mimeType: file.type,
      size: file.size,
      documentType: docType,
    })
    .returning();

  return NextResponse.json(doc, { status: 201 });
}
