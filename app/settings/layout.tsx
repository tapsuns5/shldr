import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account as accountTable } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';
import SettingsShell from './SettingsShell';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/login');
  }

  const { user } = session;

  const userAccounts = await db.query.accountMembers.findMany({
    where: (t, { eq }) => eq(t.userId, user.id),
    with: { account: true },
  });

  const rawAccount = userAccounts[0]?.account;
  const primaryAccount = rawAccount
    ? {
        id: rawAccount.id,
        name: rawAccount.name,
        slug: rawAccount.slug,
        timezone: rawAccount.timezone,
        ownerUserId: rawAccount.ownerUserId,
        plan: rawAccount.plan,
        locationDisplayMode: rawAccount.locationDisplayMode,
        createdAt: rawAccount.createdAt.toISOString(),
      }
    : null;

  const authAccounts = await db
    .select({ providerId: accountTable.providerId })
    .from(accountTable)
    .where(eq(accountTable.userId, user.id));

  const providers = authAccounts.map((a) => a.providerId);

  return (
    <SettingsShell
      user={{
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt?.toISOString?.() ?? user.createdAt ?? '',
        providers,
      }}
      primaryAccount={primaryAccount}
    >
      {children}
    </SettingsShell>
  );
}
