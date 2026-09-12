/**
 * Verifies SMTP connectivity/auth without sending an email.
 * Usage: npx tsx scripts/smtp-verify.ts
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';

async function main() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  await transporter.verify();
  console.log('SMTP OK — authenticated successfully');
}

main().catch((err) => {
  console.error('SMTP FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
