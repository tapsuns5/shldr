import {
  buildTripImportConfirmationHtml,
  buildTripImportFailureHtml,
  type TripImportConfirmationOptions,
  type TripImportFailureOptions,
} from '@/lib/email-templates';

export type { TripImportConfirmationOptions, TripImportFailureOptions } from '@/lib/email-templates';

export interface SendMailOptions {
  to: string;
  /** Comma-separated list of CC addresses */
  cc?: string;
  subject: string;
  html: string;
  text?: string;
}

interface MailTransporter {
  sendMail: (message: Record<string, unknown>) => Promise<unknown>;
}

// Pooled, lazily-created transporter — reusing one connection pool avoids paying
// DNS + TCP + TLS + AUTH setup on every single email.
// nodemailer is loaded via dynamic import (webpackIgnore) so the bundler doesn't
// try to resolve it at build time.
let transporterPromise: Promise<MailTransporter> | null = null;

function getTransporter(): Promise<MailTransporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const nodemailer = await import(/* webpackIgnore: true */ 'nodemailer' as string);
      const port = Number(process.env.SMTP_PORT || 587);
      const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
      return (nodemailer.default ?? nodemailer).createTransport({
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
      }) as MailTransporter;
    })();
  }
  return transporterPromise;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

  if (!process.env.SMTP_HOST || !smtpUser || !process.env.SMTP_PASS) {
    console.info('[mailer] SMTP not configured. Email that would have been sent:', {
      to: opts.to,
      subject: opts.subject,
    });
    return;
  }

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: `"Shldr" <${fromEmail}>`,
    to: opts.to,
    ...(opts.cc ? { cc: opts.cc } : {}),
    subject: opts.subject,
    html: opts.html,
    ...(opts.text ? { text: opts.text } : {}),
  });
}

export async function sendTripImportConfirmation(opts: TripImportConfirmationOptions): Promise<void> {
  const html = buildTripImportConfirmationHtml(opts);
  const subject = opts.isNewTrip
    ? `Trip imported: ${opts.tripTitle}`
    : `Trip updated: ${opts.tripTitle}`;

  await sendMail({
    to: opts.ownerEmail,
    cc: opts.ccEmails.length > 0 ? opts.ccEmails.join(', ') : undefined,
    subject,
    html,
  });
}

export async function sendTripImportFailure(opts: TripImportFailureOptions): Promise<void> {
  const html = buildTripImportFailureHtml(opts);

  await sendMail({
    to: opts.to,
    subject: opts.originalSubject
      ? `We couldn't import your email: ${opts.originalSubject}`
      : `We couldn't import your email`,
    html,
  });
}
