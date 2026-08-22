import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import ICAL from 'ical.js';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { tripitFeeds, accountMembers } from '@/db/schema';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accountId = new URL(request.url).searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, session.user.id)),
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const feed = await db.query.tripitFeeds.findFirst({
    where: eq(tripitFeeds.accountId, accountId),
  });
  if (!feed) return NextResponse.json({ error: 'No feed configured' }, { status: 404 });

  const res = await fetch(feed.icalUrl);
  const icsText = await res.text();
  const cal = new ICAL.Component(ICAL.parse(icsText));
  const vevents = cal.getAllSubcomponents('vevent');

  const events = vevents
    .filter((vevent) => {
      const event = new ICAL.Event(vevent);
      return event.uid?.startsWith('item-');
    })
    .slice(0, 10)
    .map((vevent) => {
      const event = new ICAL.Event(vevent);
      const dtStartProp = vevent.getFirstProperty('dtstart');
      const tzid = dtStartProp?.getParameter('tzid') ?? null;
      return {
        uid: event.uid,
        summary: event.summary,
        tzid,
        start: event.startDate?.toJSDate(),
        end: event.endDate?.toJSDate(),
        location: vevent.getFirstPropertyValue('location'),
        description: vevent.getFirstPropertyValue('description'),
      };
    });

  return NextResponse.json({ count: events.length, events });
}
