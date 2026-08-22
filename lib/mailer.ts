export interface SendMailOptions {
  to: string;
  /** Comma-separated list of CC addresses */
  cc?: string;
  subject: string;
  html: string;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.info('[mailer] SMTP not configured. Email that would have been sent:', {
      to: opts.to,
      subject: opts.subject,
    });
    return;
  }

  // nodemailer is an optional runtime dependency — install it to enable email sending
  // webpackIgnore prevents the bundler from trying to resolve it at build time
  const nodemailer = await import(/* webpackIgnore: true */ 'nodemailer' as string);
  const transporter = (nodemailer.default ?? nodemailer).createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: `"Shldr" <${fromEmail}>`,
    to: opts.to,
    ...(opts.cc ? { cc: opts.cc } : {}),
    subject: opts.subject,
    html: opts.html,
  });
}

export function buildInviteEmailHtml({
  inviterName,
  tripTitle,
  tripDates,
  inviteUrl,
}: {
  inviterName: string;
  tripTitle: string;
  tripDates: string;
  inviteUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1b6b3a;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">✈️ You're invited to a trip!</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
            Hi there!<br><br>
            <strong>${inviterName}</strong> has invited you to join the trip:
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
            <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">${tripTitle}</h2>
            <p style="margin:0;color:#6b7280;font-size:14px;">${tripDates}</p>
          </div>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            Click the button below to view the trip details and join. If you don't have an account yet, you'll be guided through creating one first.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${inviteUrl}" style="display:inline-block;background:#1b6b3a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:600;">
              View Trip &amp; Join
            </a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
            Or copy this link: <a href="${inviteUrl}" style="color:#1b6b3a;">${inviteUrl}</a><br>
            This invite expires in 7 days.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            You're receiving this because ${inviterName} invited you to a trip on Shldr.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface TripImportConfirmationOptions {
  ownerEmail: string;
  ownerName: string;
  /** Accepted trip-member emails to CC */
  ccEmails: string[];
  tripTitle: string;
  tripDates: string;
  tripLocation: string | null;
  tripUrl: string;
  /** Whether this import created a brand-new trip (true) or added to an existing one (false) */
  isNewTrip: boolean;
  /** Reservation / event summaries imported in this batch */
  importedItems: Array<{ type: string; title: string; date: string }>;
}

export function buildTripImportConfirmationHtml(opts: TripImportConfirmationOptions): string {
  const { tripTitle, tripDates, tripLocation, tripUrl, isNewTrip, importedItems, ownerName } = opts;

  const itemRows = importedItems
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 0;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6;">
          <span style="display:inline-block;background:#e5e7eb;border-radius:4px;padding:2px 8px;font-size:12px;color:#6b7280;margin-right:8px;text-transform:capitalize;">${item.type}</span>
          ${item.title}
        </td>
        <td style="padding:6px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${item.date}</td>
      </tr>`
    )
    .join('');

  const actionLabel = isNewTrip ? '🧳 New Trip Created' : '✅ Trip Updated';
  const headline = isNewTrip
    ? 'Your trip has been successfully imported!'
    : 'New event(s) have been added to your trip.';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1b6b3a;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">${actionLabel}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
            Hi ${ownerName},<br><br>
            ${headline}
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
            <h2 style="margin:0 0 4px;color:#111827;font-size:20px;">${tripTitle}</h2>
            <p style="margin:0 0 2px;color:#6b7280;font-size:14px;">${tripDates}</p>
            ${tripLocation ? `<p style="margin:0;color:#6b7280;font-size:14px;">📍 ${tripLocation}</p>` : ''}
          </div>
          ${importedItems.length > 0 ? `
          <p style="margin:0 0 12px;color:#374151;font-size:15px;font-weight:600;">Imported items:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            ${itemRows}
          </table>` : ''}
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${tripUrl}" style="display:inline-block;background:#1b6b3a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:600;">
              View Trip
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            You're receiving this because a confirmation email was forwarded to Shldr for import.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
