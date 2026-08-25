import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGmailAuthUrl } from '@/lib/gmail';
import { db } from '@/db';
import { accountMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const accountId = searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const platform = searchParams.get('platform');
  const url = getGmailAuthUrl({
    accountId,
    userId: session.user.id,
    nonce: crypto.randomUUID(),
    ...(platform === 'mobile' && { platform: 'mobile' }),
  });

  // The mobile client can't follow this redirect itself (its fetch client
  // would just download Google's consent page) — it needs the target URL to
  // open in an in-app browser instead, so it asks for JSON.
  if (searchParams.get('json') === '1') {
    return NextResponse.json({ url });
  }

  return NextResponse.redirect(url);
}
