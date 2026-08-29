import { timingSafeEqual } from 'crypto';
import { ilike, eq } from 'drizzle-orm';
import { db } from '@/db';
import { accountMembers, gmailAccounts, user } from '@/db/schema';

export type HostingerInboundMessage = {
  eventId: string;
  messageId: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  bodyUrl: string | null;
};

type RawRecord = Record<string, unknown>;

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function bodyValue(value: unknown): { text: string | null; html: string | null } {
  const raw = stringValue(value);
  if (!raw) return { text: null, html: null };
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as RawRecord;
      return {
        text: stringValue(parsed.plainText) ?? stringValue(parsed.text) ?? stringValue(parsed.plainBody),
        html: stringValue(parsed.html) ?? stringValue(parsed.bodyHtml) ?? stringValue(parsed.plainHtml),
      };
    } catch {
      // Keep the original value when it is not JSON.
    }
  }
  return { text: raw, html: raw.startsWith('<') ? raw : null };
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (item && typeof item === 'object') {
        const record = item as RawRecord;
        const address = stringValue(record.email) ?? stringValue(record.address);
        return address ? [address] : [];
      }
      return [];
    });
  }
  const single = stringValue(value);
  return single ? [single] : [];
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const angleAddress = value.match(/<([^>]+)>/)?.[1];
  const candidate = (angleAddress ?? value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : null;
}

function senderValue(value: unknown): { email: string | null; name: string | null } {
  if (typeof value === 'string') {
    const email = normalizeEmail(value);
    return {
      email,
      name: email && value.includes('<') ? value.replace(/<[^>]+>/, '').trim() || null : null,
    };
  }
  if (value && typeof value === 'object') {
    const record = value as RawRecord;
    return {
      email: normalizeEmail(record.email ?? record.address),
      name: stringValue(record.name) ?? stringValue(record.displayName),
    };
  }
  return { email: null, name: null };
}

export function normalizeHostingerPayload(payload: RawRecord): HostingerInboundMessage | null {
  const message = payload.data && typeof payload.data === 'object'
    ? payload.data as RawRecord
    : payload.message && typeof payload.message === 'object'
      ? payload.message as RawRecord
      : payload;

  const eventId = stringValue(payload.id) ?? stringValue(payload.event_id) ?? stringValue(payload.eventId)
    ?? stringValue(message.id) ?? stringValue(message.message_id) ?? stringValue(message.messageId);
  if (!eventId) return null;

  const sender = senderValue(message.from ?? message.sender ?? payload.from ?? payload.sender);
  if (!sender.email) return null;

  const toEmails = [
    ...stringArray(message.to),
    ...stringArray(message.received_for),
    ...stringArray(payload.to),
  ].map((address) => normalizeEmail(address) ?? address.trim()).filter(Boolean);
  const bodyText = bodyValue(message.plainBody ?? message.text ?? message.body_text ?? payload.text);
  const bodyHtml = bodyValue(message.plainHtml ?? message.html ?? message.body_html ?? payload.html);

  return {
    eventId,
    messageId: stringValue(message.messageId) ?? stringValue(message.message_id)
      ?? stringValue(payload.messageId) ?? stringValue(payload.message_id),
    fromEmail: sender.email,
    fromName: sender.name,
    toEmails: [...new Set(toEmails)],
    subject: stringValue(message.subject) ?? stringValue(payload.subject) ?? 'Untitled email',
    bodyText: bodyText.text ?? bodyHtml.text,
    bodyHtml: bodyHtml.html ?? bodyText.html,
    bodyUrl: stringValue(message.bodyUrl) ?? stringValue(message.body_url),
  };
}

export async function enrichHostingerBody(message: HostingerInboundMessage): Promise<HostingerInboundMessage> {
  if (!message.bodyUrl) return message;
  try {
    const response = await fetch(message.bodyUrl, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return message;
    const raw = await response.text();
    if (!raw.trim()) return message;

    let parsed: RawRecord | null = null;
    try {
      parsed = JSON.parse(raw) as RawRecord;
    } catch {
      return { ...message, bodyText: raw, bodyHtml: raw.startsWith('<') ? raw : message.bodyHtml };
    }

    return {
      ...message,
      bodyText: stringValue(parsed.plainText) ?? stringValue(parsed.text) ?? stringValue(parsed.plainBody) ?? message.bodyText,
      bodyHtml: stringValue(parsed.html) ?? stringValue(parsed.bodyHtml) ?? stringValue(parsed.plainHtml) ?? message.bodyHtml,
    };
  } catch {
    return message;
  }
}

export type ResolvedImportAccount =
  | { status: 'resolved'; accountId: string; userId: string; matchedEmail: string }
  | { status: 'unknown_sender' }
  | { status: 'ambiguous'; accountIds: string[] };

/** Resolve the sender like Scheeme: primary login email reaches memberships; connected Gmail emails reach their account. */
export async function resolveImportAccount(
  fromEmail: string,
  accountIdHint?: string | null,
): Promise<ResolvedImportAccount> {
  const normalized = normalizeEmail(fromEmail);
  if (!normalized) return { status: 'unknown_sender' };

  const primaryUser = await db.query.user.findFirst({
    where: ilike(user.email, normalized),
    columns: { id: true, email: true },
  });

  let candidates: Array<{ accountId: string; userId: string; matchedEmail: string }> = [];
  if (primaryUser) {
    const memberships = await db.query.accountMembers.findMany({
      where: eq(accountMembers.userId, primaryUser.id),
      columns: { accountId: true, userId: true },
    });
    candidates = memberships.map((membership) => ({
      accountId: membership.accountId,
      userId: membership.userId,
      matchedEmail: primaryUser.email,
    }));
  } else {
    const gmailMatches = await db.query.gmailAccounts.findMany({
      where: ilike(gmailAccounts.email, normalized),
      columns: { accountId: true, userId: true, email: true },
    });
    candidates = gmailMatches.map((match) => ({
      accountId: match.accountId,
      userId: match.userId,
      matchedEmail: match.email,
    }));
  }

  const uniqueCandidates = Array.from(
    new Map(candidates.map((candidate) => [candidate.accountId, candidate])).values(),
  );
  const filtered = accountIdHint
    ? uniqueCandidates.filter((candidate) => candidate.accountId === accountIdHint)
    : uniqueCandidates;

  if (filtered.length === 1) return { status: 'resolved', ...filtered[0] };
  if (filtered.length > 1) return { status: 'ambiguous', accountIds: filtered.map((c) => c.accountId) };
  return { status: candidates.length ? 'ambiguous' : 'unknown_sender', accountIds: candidates.map((c) => c.accountId) };
}

export function verifyHostingerBearerToken(
  authorizationHeader: string | null,
  expectedToken: string | undefined,
): boolean {
  if (!expectedToken || !authorizationHeader) return false;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const provided = Buffer.from(match[1].trim());
  const expected = Buffer.from(expectedToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function isHostingerMessageReceived(payload: RawRecord): boolean {
  const eventType = stringValue(payload.event_type) ?? stringValue(payload.event) ?? stringValue(payload.type);
  return !eventType || eventType === 'message.received';
}
