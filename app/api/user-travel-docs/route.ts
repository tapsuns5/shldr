import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { userTravelDocs } from '@/db/schema';
import { encryptString, decryptString } from '@/lib/encryption';
import { uploadToR2, deleteFromR2 } from '@/lib/r2';
import { randomUUID } from 'crypto';

const createTextSchema = z.object({
  label: z.string().min(1).max(255),
  fieldType: z.literal('text'),
  value: z.string().max(2000),
  targetUserId: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(255).optional(),
  value: z.string().max(2000).optional(),
});

const DEFAULT_FIELDS = [
  { label: 'Birth Date', fieldType: 'text' as const },
  { label: 'Global Entry Number', fieldType: 'text' as const },
  { label: 'TSA Pre-Check Number', fieldType: 'text' as const },
  { label: 'Known Traveler Number', fieldType: 'text' as const },
  { label: 'Passport Number', fieldType: 'text' as const },
];

async function getPrimaryAccount(userId: string) {
  const memberships = await db.query.accountMembers.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.userId, userId),
    with: { account: true },
  });
  return memberships[0]?.account ?? null;
}

async function verifyAccountMember(accountId: string, userId: string) {
  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, userId)),
  });
  return !!membership;
}

async function seedDefaultFields(accountId: string, targetUserId: string, createdBy: string) {
  const existingDefaults = await db.query.userTravelDocs.findMany({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, targetUserId), eqOp(t.isDefault, true)),
  });

  if (existingDefaults.length > 0) return;

  await db
    .insert(userTravelDocs)
    .values(
      DEFAULT_FIELDS.map((field) => ({
        accountId,
        userId: targetUserId,
        createdBy,
        label: field.label,
        fieldType: field.fieldType,
        isDefault: true,
      }))
    )
    .onConflictDoNothing({
      target: [userTravelDocs.accountId, userTravelDocs.userId, userTravelDocs.label],
    });
}

async function syncCustomFields(accountId: string, targetUserId: string, createdBy: string) {
  const members = await db.query.accountMembers.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
  });
  const memberUserIds = members.map((m) => m.userId);

  const allAccountDocs = await db.query.userTravelDocs.findMany({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.isDefault, false), eqOp(t.fieldType, 'text')),
  });

  const targetLabels = new Set(
    allAccountDocs.filter((d) => d.userId === targetUserId).map((d) => d.label)
  );

  const missing = allAccountDocs.filter(
    (d) => d.userId !== targetUserId && !targetLabels.has(d.label)
  );

  if (missing.length === 0) return;

  const uniqueMissing = [...new Map(missing.map((d) => [d.label, d])).values()];

  await db
    .insert(userTravelDocs)
    .values(
      uniqueMissing.map((d) => ({
        accountId,
        userId: targetUserId,
        createdBy,
        label: d.label,
        fieldType: 'text' as const,
        isDefault: false,
      }))
    )
    .onConflictDoNothing({
      target: [userTravelDocs.accountId, userTravelDocs.userId, userTravelDocs.label],
    });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const account = await getPrimaryAccount(session.user.id);
  if (!account) return NextResponse.json({ error: 'No account found' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get('userId') ?? session.user.id;

  const isMember = await verifyAccountMember(account.id, targetUserId);
  if (!isMember) return NextResponse.json({ error: 'User not in account' }, { status: 403 });

  await seedDefaultFields(account.id, targetUserId, session.user.id);
  await syncCustomFields(account.id, targetUserId, session.user.id);

  const docs = await db.query.userTravelDocs.findMany({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, account.id), eqOp(t.userId, targetUserId)),
    orderBy: (t, { asc, desc }) => [desc(t.isDefault), asc(t.label)],
  });

  const decrypted = docs.map((doc) => ({
    ...doc,
    value: doc.valueEncrypted ? decryptString(doc.valueEncrypted) : null,
    valueEncrypted: undefined,
  }));

  return NextResponse.json(decrypted);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const account = await getPrimaryAccount(session.user.id);
  if (!account) return NextResponse.json({ error: 'No account found' }, { status: 404 });

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const label = formData.get('label') as string | null;
    const targetUserId = (formData.get('targetUserId') as string | null) ?? session.user.id;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!label) return NextResponse.json({ error: 'Label is required' }, { status: 400 });

    const isMember = await verifyAccountMember(account.id, targetUserId);
    if (!isMember) return NextResponse.json({ error: 'User not in account' }, { status: 403 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const key = `user-travel-docs/${targetUserId}/${randomUUID()}-${file.name}`;

    const fileUrl = await uploadToR2(key, buffer, file.type);

    const [doc] = await db
      .insert(userTravelDocs)
      .values({
        accountId: account.id,
        userId: targetUserId,
        createdBy: session.user.id,
        label,
        fieldType: 'file',
        fileUrl,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      })
      .returning();

    return NextResponse.json({ ...doc, value: null }, { status: 201 });
  }

  const body = await request.json();
  const parsed = createTextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { label, value, targetUserId } = parsed.data;
  const resolvedTargetUserId = targetUserId ?? session.user.id;

  const isMember = await verifyAccountMember(account.id, resolvedTargetUserId);
  if (!isMember) return NextResponse.json({ error: 'User not in account' }, { status: 403 });

  const valueEncrypted = encryptString(value);

  const [doc] = await db
    .insert(userTravelDocs)
    .values({
      accountId: account.id,
      userId: resolvedTargetUserId,
      createdBy: session.user.id,
      label,
      fieldType: 'text',
      valueEncrypted,
    })
    .returning();

  return NextResponse.json({ ...doc, value, valueEncrypted: undefined }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const account = await getPrimaryAccount(session.user.id);
  if (!account) return NextResponse.json({ error: 'No account found' }, { status: 404 });

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, label, value } = parsed.data;

  const doc = await db.query.userTravelDocs.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, id),
  });

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isMember = await verifyAccountMember(account.id, doc.userId);
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (label !== undefined) updates.label = label;
  if (value !== undefined) updates.valueEncrypted = encryptString(value);

  const [updated] = await db
    .update(userTravelDocs)
    .set(updates)
    .where(eq(userTravelDocs.id, id))
    .returning();

  return NextResponse.json({
    ...updated,
    value: updated.valueEncrypted ? decryptString(updated.valueEncrypted) : null,
    valueEncrypted: undefined,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const account = await getPrimaryAccount(session.user.id);
  if (!account) return NextResponse.json({ error: 'No account found' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const doc = await db.query.userTravelDocs.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, id),
  });

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isMember = await verifyAccountMember(account.id, doc.userId);
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (doc.fieldType === 'file' && doc.fileUrl) {
    const key = doc.fileUrl.replace(`${process.env.R2_PUBLIC_URL}/`, '');
    try {
      await deleteFromR2(key);
    } catch {
      // best-effort delete
    }
  }

  await db.delete(userTravelDocs).where(eq(userTravelDocs.id, id));

  return NextResponse.json({ success: true });
}
