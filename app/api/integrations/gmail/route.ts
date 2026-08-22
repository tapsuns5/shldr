import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { accountMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { stopGmailWatch } from '@/lib/gmail';
import { decryptToken } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountId = new URL(request.url).searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, session.user.id)),
  });
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accounts = await db.query.gmailAccounts.findMany({
    where: eq(gmailAccounts.accountId, accountId),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  return NextResponse.json(
    accounts.map((a) => ({
      id: a.id,
      email: a.email,
      status: a.syncStatus,
      lastSyncAt: a.lastSyncAt?.toISOString() ?? null,
      watchExpiration: a.watchExpiration?.toISOString() ?? null,
    }))
  );
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const gmailAccountId = searchParams.get('gmailAccountId');
  if (!accountId || !gmailAccountId) {
    return NextResponse.json({ error: 'accountId and gmailAccountId required' }, { status: 400 });
  }

  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const account = await db.query.gmailAccounts.findFirst({
    where: and(eq(gmailAccounts.id, gmailAccountId), eq(gmailAccounts.accountId, accountId)),
  });
  if (!account) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const accessToken = decryptToken(account.accessTokenEncrypted);
    const refreshToken = decryptToken(account.refreshTokenEncrypted);
    await stopGmailWatch({ access_token: accessToken, refresh_token: refreshToken });
  } catch (err) {
    console.error('[gmail] Stop watch failed during disconnect:', err);
  }

  await db.delete(gmailAccounts).where(eq(gmailAccounts.id, gmailAccountId));

  return NextResponse.json({ success: true });
}
