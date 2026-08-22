import { createHmac, timingSafeEqual } from 'crypto';
import { google } from 'googleapis';
import { db } from '@/db';
import { gmailAccounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decryptToken, encryptToken } from './encryption';

function getStateSecret(): string {
  const secret = process.env.GMAIL_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('No signing secret available for OAuth state');
  return secret;
}

function signStatePayload(payload: string): string {
  const hmac = createHmac('sha256', getStateSecret()).update(payload).digest('base64url');
  return `${payload}.${hmac}`;
}

function verifyStatePayload(signed: string): AuthState {
  const dotIndex = signed.lastIndexOf('.');
  if (dotIndex === -1) throw new Error('Invalid state');
  const payload = signed.slice(0, dotIndex);
  const signature = signed.slice(dotIndex + 1);
  const expected = createHmac('sha256', getStateSecret()).update(payload).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid state signature');
  }
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthState;
}

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
];

function getRedirectUri(): string {
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/api/integrations/gmail/callback`;
}

export function getGmailOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

export interface AuthState {
  accountId: string;
  userId: string;
  nonce: string;
}

export function getGmailAuthUrl(state: AuthState): string {
  const client = getGmailOAuthClient();
  const signed = signStatePayload(Buffer.from(JSON.stringify(state)).toString('base64url'));
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    include_granted_scopes: true,
    state: signed,
  });
}

export function verifyGmailState(state: string): AuthState {
  return verifyStatePayload(state);
}

export async function exchangeCodeForTokens(code: string) {
  const client = getGmailOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getGmailProfile(tokens: { access_token: string; refresh_token?: string }) {
  const client = getGmailOAuthClient();
  client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: client });
  const res = await gmail.users.getProfile({ userId: 'me' });
  return res.data;
}

export async function registerGmailWatch(tokens: { access_token: string; refresh_token?: string }) {
  const client = getGmailOAuthClient();
  client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: client });
  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topicName) {
    throw new Error('GMAIL_PUBSUB_TOPIC is not set');
  }
  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
      labelFilterAction: 'include',
    },
  });
  return {
    historyId: res.data.historyId ?? null,
    expiration: res.data.expiration ? Number(res.data.expiration) : null,
  };
}

export async function stopGmailWatch(tokens: { access_token: string; refresh_token?: string }) {
  try {
    const client = getGmailOAuthClient();
    client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: client });
    await gmail.users.stop({ userId: 'me' });
  } catch (err) {
    console.error('[gmail] Failed to stop watch:', err);
  }
}

export async function refreshAccessToken(accountId: string) {
  const account = await db.query.gmailAccounts.findFirst({
    where: eq(gmailAccounts.id, accountId),
  });
  if (!account) throw new Error('Gmail account not found');

  const refreshToken = decryptToken(account.refreshTokenEncrypted);
  const client = getGmailOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error('No access_token returned from refresh');
  }

  const expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600 * 1000);
  await db
    .update(gmailAccounts)
    .set({
      accessTokenEncrypted: encryptToken(credentials.access_token),
      tokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(gmailAccounts.id, accountId));

  return { accessToken: credentials.access_token, refreshToken };
}

export async function getGmailClientForAccount(accountId: string) {
  const account = await db.query.gmailAccounts.findFirst({
    where: eq(gmailAccounts.id, accountId),
  });
  if (!account) throw new Error('Gmail account not found');

  let accessToken = decryptToken(account.accessTokenEncrypted);
  const refreshToken = decryptToken(account.refreshTokenEncrypted);

  if (!account.tokenExpiresAt || account.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(accountId);
    accessToken = refreshed.accessToken;
  }

  const client = getGmailOAuthClient();
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: client });
}
