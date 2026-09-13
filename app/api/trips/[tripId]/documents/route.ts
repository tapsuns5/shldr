import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { uploadToR2 } from '@/lib/r2';
import { randomUUID } from 'crypto';

const documentTypeEnum = z.enum(['passport', 'visa', 'ticket', 'insurance', 'hotel', 'receipt', 'other']);

const EXT_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  html: 'text/html',
  htm: 'text/html',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MIME_MAP[ext] ?? 'application/octet-stream';
}

function fileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '');
    return base || 'Linked file';
  } catch {
    return 'Linked file';
  }
}

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
  const fileUrlField = formData.get('fileUrl') as string | null;
  const fileNameField = formData.get('fileName') as string | null;
  const documentType = formData.get('documentType') as string | null;
  const reservationIdField = formData.get('reservationId') as string | null;

  const typeResult = documentTypeEnum.safeParse(documentType ?? 'other');
  const docType = typeResult.success ? typeResult.data : 'other';

  let reservationId: string | null = null;
  if (reservationIdField) {
    const parsedId = z.string().uuid().safeParse(reservationIdField);
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Invalid reservationId' }, { status: 400 });
    }
    const reservation = await db.query.reservations.findFirst({
      where: (t, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(t.id, parsedId.data), eqOp(t.tripId, tripId)),
    });
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found in this trip' }, { status: 404 });
    }
    reservationId = parsedId.data;
  }

  if (file) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const key = `trips/${tripId}/documents/${randomUUID()}-${file.name}`;

    const fileUrl = await uploadToR2(key, buffer, file.type || 'application/octet-stream');

    const [doc] = await db
      .insert(documents)
      .values({
        tripId,
        reservationId,
        uploadedBy: session.user.id,
        fileName: file.name,
        fileUrl,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        documentType: docType,
      })
      .returning();

    return NextResponse.json(doc, { status: 201 });
  }

  if (fileUrlField) {
    const parsedUrl = z.url().safeParse(fileUrlField);
    if (!parsedUrl.success || !/^https?:\/\//i.test(parsedUrl.data)) {
      return NextResponse.json({ error: 'A valid http(s) file URL is required' }, { status: 400 });
    }
    const fileName = fileNameField?.trim() || fileNameFromUrl(parsedUrl.data);

    const [doc] = await db
      .insert(documents)
      .values({
        tripId,
        reservationId,
        uploadedBy: session.user.id,
        fileName,
        fileUrl: parsedUrl.data,
        mimeType: guessMimeType(fileName),
        size: 0,
        documentType: docType,
      })
      .returning();

    return NextResponse.json(doc, { status: 201 });
  }

  return NextResponse.json({ error: 'No file or file URL provided' }, { status: 400 });
}
