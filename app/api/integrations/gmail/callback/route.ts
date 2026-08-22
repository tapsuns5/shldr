import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { accountMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  verifyGmailState,
  exchangeCodeForTokens,
  getGmailProfile,
  registerGmailWatch,
} from '@/lib/gmail';
import { encryptToken } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectBase = `${appUrl.replace(/\/$/, '')}/settings/integrations`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}?gmail=error&message=${encodeURIComponent(error)}`);
  }
  if (!code || !stateParam) {
    return NextResponse.redirect(`${redirectBase}?gmail=error&message=missing-code`);
  }

  let state: ReturnType<typeof verifyGmailState>;
  try {
    state = verifyGmailState(stateParam);
  } catch {
    return NextResponse.redirect(`${redirectBase}?gmail=error&message=invalid-state`);
  }

  const { accountId, userId } = state;

  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, userId)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.redirect(`${redirectBase}?gmail=error&message=unauthorized`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${redirectBase}?gmail=error&message=no-refresh-token`);
    }

    const profile = await getGmailProfile({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    const email = profile.emailAddress ?? 'unknown';

    const watch = await registerGmailWatch({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const existing = await db.query.gmailAccounts.findFirst({
      where: and(eq(gmailAccounts.userId, userId), eq(gmailAccounts.email, email)),
    });

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000);

    if (existing) {
      await db
        .update(gmailAccounts)
        .set({
          accountId,
          accessTokenEncrypted: encryptToken(tokens.access_token),
          refreshTokenEncrypted: encryptToken(tokens.refresh_token),
          tokenExpiresAt: expiresAt,
          historyId: watch.historyId ?? existing.historyId,
          watchExpiration: watch.expiration ? new Date(watch.expiration) : existing.watchExpiration,
          syncStatus: 'ACTIVE',
          updatedAt: new Date(),
        })
        .where(eq(gmailAccounts.id, existing.id));
    } else {
      await db.insert(gmailAccounts).values({
        userId,
        accountId,
        email,
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: encryptToken(tokens.refresh_token),
        tokenExpiresAt: expiresAt,
        historyId: watch.historyId,
        watchExpiration: watch.expiration ? new Date(watch.expiration) : null,
        syncStatus: 'ACTIVE',
      });
    }

    return NextResponse.redirect(`${redirectBase}?gmail=connected&email=${encodeURIComponent(email)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[gmail/callback] Connect failed:', err);
    return NextResponse.redirect(`${redirectBase}?gmail=error&message=${encodeURIComponent(message)}`);
  }
}
