import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pushTokens } from '@/db/schema';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Fans a notification out to every device registered for the given users via
 * Expo's push API. Called from lib/notifications.ts after a notification is
 * persisted — push delivery is best-effort and never blocks that write.
 */
export async function sendPushToUsers(
  userIds: string[],
  notification: { title: string; body?: string; data?: Record<string, unknown> }
): Promise<void> {
  if (userIds.length === 0) return;

  const tokens = await db.query.pushTokens.findMany({
    where: inArray(pushTokens.userId, userIds),
  });
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title: notification.title,
    body: notification.body,
    data: notification.data,
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) return;

    const { data: tickets }: { data: ExpoPushTicket[] } = await res.json();
    const staleTokens = tickets
      .map((ticket, i) => (ticket.details?.error === 'DeviceNotRegistered' ? tokens[i]?.token : null))
      .filter((token): token is string => Boolean(token));

    if (staleTokens.length > 0) {
      await db.delete(pushTokens).where(inArray(pushTokens.token, staleTokens));
    }
  } catch {
    // Push delivery is best-effort; the in-app notification is already persisted.
  }
}
