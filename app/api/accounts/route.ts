import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { accounts, accountMembers } from '@/db/schema';

const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  timezone: z.string().default('UTC'),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, slug, timezone } = parsed.data;

  const existing = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  });
  if (existing) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
  }

  const [newAccount] = await db
    .insert(accounts)
    .values({
      name,
      slug,
      timezone,
      ownerUserId: session.user.id,
    })
    .returning();

  await db.insert(accountMembers).values({
    accountId: newAccount.id,
    userId: session.user.id,
    role: 'owner',
    joinedAt: new Date(),
  });

  return NextResponse.json(newAccount, { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userAccounts = await db.query.accountMembers.findMany({
    where: (t, { eq }) => eq(t.userId, session.user.id),
    with: { account: true },
  });

  return NextResponse.json(userAccounts.map((m) => m.account));
}
