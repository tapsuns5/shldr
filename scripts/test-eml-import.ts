#!/usr/bin/env tsx
/**
 * Test script to import a real .eml file via the email-import webhook.
 *
 * Usage:
 *   npx tsx scripts/test-eml-import.ts <path-to-eml> <account-id> <user-id>
 *
 * Example:
 *   npx tsx scripts/test-eml-import.ts tests/Your\ car\ rental\ ticket\ 054716.eml <account-id> <user-id>
 */

import fs from 'fs';
import path from 'path';
import { simpleParser } from 'mailparser';

const EML_PATH = process.argv[2];
const ACCOUNT_ID = process.argv[3];
const USER_ID = process.argv[4];
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/email-import';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

if (!EML_PATH) {
  console.error('Usage: npx tsx scripts/test-eml-import.ts <path-to-eml> <account-id> <user-id>');
  process.exit(1);
}

if (!ACCOUNT_ID || !USER_ID) {
  console.error('Missing account-id or user-id arguments');
  process.exit(1);
}

async function main() {
  const emlPath = path.resolve(EML_PATH);
  console.log('Reading .eml file:', emlPath);

  const emlContent = fs.readFileSync(emlPath, 'utf-8');
  console.log('File size:', emlContent.length, 'bytes');

  console.log('Parsing email with mailparser...');
  const parsed = await simpleParser(emlContent);

  console.log('Parsed email:', {
    messageId: parsed.messageId,
    subject: parsed.subject,
    from: parsed.from ? (Array.isArray(parsed.from) ? parsed.from.map(a => a.text).join(', ') : parsed.from.text) : undefined,
    to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(a => a.text).join(', ') : parsed.to.text) : undefined,
    hasText: !!parsed.text,
    hasHtml: !!parsed.html,
  });

  const payload = {
    accountId: ACCOUNT_ID,
    userId: USER_ID,
    messageId: parsed.messageId || `eml-${Date.now()}`,
    subject: parsed.subject || 'No subject',
    bodyText: parsed.text || (typeof parsed.html === 'string' ? parsed.html : ' '),
    bodyHtml: parsed.html || undefined,
  };

  console.log('Sending to webhook:', WEBHOOK_URL);
  console.log('Payload size:', JSON.stringify(payload).length, 'bytes');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (WEBHOOK_SECRET) {
    // Send as both x-webhook-secret and Authorization Bearer to support
    // either webhook verification mode.
    headers['x-webhook-secret'] = WEBHOOK_SECRET;
    headers['Authorization'] = `Bearer ${WEBHOOK_SECRET}`;
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  console.log('Response status:', res.status);
  console.log('Response body:', JSON.stringify(json, null, 2));

  if (!res.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
