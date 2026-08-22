import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { enqueueGmailWebhook } from '@/lib/queue';

interface PubSubMessage {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
    attributes?: Record<string, string>;
  };
  subscription?: string;
}

async function verifyPubSubToken(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[gmail/webhook] Missing authorization header');
    return false;
  }
  const token = authHeader.slice(7);
  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: request.url,
    });
    const payload = ticket.getPayload();
    if (!payload) return false;
    if (payload.iss !== 'https://accounts.google.com') return false;
    return true;
  } catch (err) {
    console.error('[gmail/webhook] Token verification failed:', err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyPubSubToken(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PubSubMessage;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body.message?.data;
  if (!data) {
    return NextResponse.json({ error: 'Missing message data' }, { status: 400 });
  }

  let decoded: { emailAddress?: string; historyId?: string };
  try {
    decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Invalid message data' }, { status: 400 });
  }

  const emailAddress = decoded.emailAddress;
  const historyId = decoded.historyId;
  if (!emailAddress) {
    return NextResponse.json({ error: 'Missing emailAddress' }, { status: 400 });
  }

  try {
    await enqueueGmailWebhook({
      emailAddress,
      historyId,
      rawPayload: JSON.stringify(body.message),
    });
  } catch (err) {
    console.error('[gmail/webhook] Failed to enqueue webhook job:', err);
    return NextResponse.json({ error: 'Failed to enqueue' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
