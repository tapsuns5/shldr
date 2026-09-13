/**
 * Branded transactional email templates for Shldr.
 *
 * All templates share `emailLayout()` — a table-based, inline-styled shell
 * (required for email-client compatibility) with the Shldr wordmark header,
 * brand-green accents, and a standard footer. The logo is a hosted PNG
 * (`/public/shldr-email-logo.png`) because Gmail and most clients don't
 * render SVG.
 */

const BRAND_GREEN = '#356a4c';
const TEXT_PRIMARY = '#111827';
const TEXT_BODY = '#374151';
const TEXT_MUTED = '#6b7280';
const TEXT_FAINT = '#9ca3af';
const BG_CANVAS = '#f4f4f5';
const BG_SUBTLE = '#f9fafb';
const BORDER = '#e5e7eb';

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function emailButton(url: string, label: string): string {
  const safeUrl = escapeHtml(url);
  return `<table cellpadding="0" cellspacing="0"><tr><td>
    <a href="${safeUrl}" target="_blank" style="display:inline-block;background:${BRAND_GREEN};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:600;">
      ${escapeHtml(label)}
    </a>
  </td></tr></table>`;
}

export function emailLinkFallback(url: string): string {
  const safeUrl = escapeHtml(url);
  return `<p style="margin:24px 0 0;color:${TEXT_FAINT};font-size:13px;word-break:break-all;">
    Or copy this link: <a href="${safeUrl}" target="_blank" style="color:${BRAND_GREEN};">${safeUrl}</a>
  </p>`;
}

export interface EmailLayoutOptions {
  /** Short preview text shown in inbox list (hidden in the email body) */
  preheader: string;
  /** Main heading rendered at the top of the card body */
  heading: string;
  /** Inner HTML for the card body */
  bodyHtml: string;
  /** One-line explanation of why the recipient got this email (footer) */
  footerReason: string;
}

export function emailLayout({ preheader, heading, bodyHtml, footerReason }: EmailLayoutOptions): string {
  const logoUrl = `${appUrl()}/shldr-email-logo.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:${BG_CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG_CANVAS};padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td align="center" style="padding:28px 40px 20px;border-bottom:1px solid ${BORDER};">
          <a href="${appUrl()}" target="_blank"><img src="${logoUrl}" alt="Shldr" height="44" style="display:block;height:44px;width:auto;border:0;"></a>
        </td></tr>
        <tr><td style="padding:32px 40px 40px;">
          <h1 style="margin:0 0 20px;color:${TEXT_PRIMARY};font-size:22px;font-weight:700;line-height:1.3;">${escapeHtml(heading)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:${BG_SUBTLE};padding:20px 40px;border-top:1px solid ${BORDER};">
          <p style="margin:0;color:${TEXT_FAINT};font-size:12px;text-align:center;line-height:1.6;">
            ${escapeHtml(footerReason)}<br>
            <a href="${appUrl()}" target="_blank" style="color:${TEXT_FAINT};text-decoration:underline;">Shldr</a> &mdash; plan trips together
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Password reset ────────────────────────────────────────────────────────────

export function buildPasswordResetEmailHtml({ url, displayName }: { url: string; displayName: string }): string {
  return emailLayout({
    preheader: 'Reset your Shldr password — this link expires in 1 hour.',
    heading: 'Reset your password',
    bodyHtml: `
      <p style="margin:0 0 16px;color:${TEXT_BODY};font-size:16px;line-height:1.6;">
        Hi ${escapeHtml(displayName)},<br><br>
        We received a request to reset the password on your Shldr account.
        Click the button below to choose a new password.
      </p>
      ${emailButton(url, 'Reset Password')}
      ${emailLinkFallback(url)}
      <p style="margin:8px 0 0;color:${TEXT_FAINT};font-size:13px;">
        This link expires in 1 hour. If you didn&apos;t request a password reset,
        you can safely ignore this email — your password won&apos;t change.
      </p>`,
    footerReason: 'You\u2019re receiving this because a password reset was requested for your Shldr account.',
  });
}

// ── Email verification ────────────────────────────────────────────────────────

export function buildVerificationEmailHtml({ url, displayName }: { url: string; displayName: string }): string {
  return emailLayout({
    preheader: 'Confirm your email address to finish setting up Shldr.',
    heading: 'Verify your email',
    bodyHtml: `
      <p style="margin:0 0 16px;color:${TEXT_BODY};font-size:16px;line-height:1.6;">
        Hi ${escapeHtml(displayName)},<br><br>
        Please confirm your email address by clicking the button below.
      </p>
      ${emailButton(url, 'Verify Email')}
      ${emailLinkFallback(url)}
      <p style="margin:8px 0 0;color:${TEXT_FAINT};font-size:13px;">
        This link expires in 1 hour.
      </p>`,
    footerReason: 'You\u2019re receiving this because this email address was used on Shldr.',
  });
}

// ── Email change confirmation ─────────────────────────────────────────────────

export function buildChangeEmailConfirmationHtml({
  oldEmail,
  newEmail,
  url,
  displayName,
}: {
  oldEmail: string;
  newEmail: string;
  url: string;
  displayName: string;
}): string {
  return emailLayout({
    preheader: `Confirm changing your Shldr email to ${newEmail}.`,
    heading: 'Confirm email change',
    bodyHtml: `
      <p style="margin:0 0 16px;color:${TEXT_BODY};font-size:16px;line-height:1.6;">
        Hi ${escapeHtml(displayName)},<br><br>
        A request was made to change the email on your Shldr account from
        <strong>${escapeHtml(oldEmail)}</strong> to <strong>${escapeHtml(newEmail)}</strong>.
      </p>
      <p style="margin:0 0 24px;color:${TEXT_BODY};font-size:15px;line-height:1.6;">
        If you made this request, click the button below to confirm. After confirmation,
        a verification email will be sent to your new email address.
      </p>
      ${emailButton(url, 'Confirm Email Change')}
      ${emailLinkFallback(url)}
      <p style="margin:8px 0 0;color:${TEXT_FAINT};font-size:13px;">
        If you did not request this change, you can safely ignore this email.
      </p>`,
    footerReason: 'You\u2019re receiving this because your Shldr account email is being changed.',
  });
}

// ── Trip invite ───────────────────────────────────────────────────────────────

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
  return emailLayout({
    preheader: `${inviterName} invited you to join ${tripTitle} on Shldr.`,
    heading: 'You\u2019re invited to a trip!',
    bodyHtml: `
      <p style="margin:0 0 16px;color:${TEXT_BODY};font-size:16px;line-height:1.6;">
        Hi there!<br><br>
        <strong>${escapeHtml(inviterName)}</strong> has invited you to join the trip:
      </p>
      <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:8px;padding:20px;margin:0 0 24px;">
        <h2 style="margin:0 0 8px;color:${TEXT_PRIMARY};font-size:20px;">${escapeHtml(tripTitle)}</h2>
        <p style="margin:0;color:${TEXT_MUTED};font-size:14px;">${escapeHtml(tripDates)}</p>
      </div>
      <p style="margin:0 0 24px;color:${TEXT_BODY};font-size:15px;line-height:1.6;">
        Click the button below to view the trip details and join. If you don&apos;t have an
        account yet, you&apos;ll be guided through creating one first.
      </p>
      ${emailButton(inviteUrl, 'View Trip & Join')}
      ${emailLinkFallback(inviteUrl)}
      <p style="margin:8px 0 0;color:${TEXT_FAINT};font-size:13px;">
        This invite expires in 7 days.
      </p>`,
    footerReason: `You\u2019re receiving this because ${inviterName} invited you to a trip on Shldr.`,
  });
}

// ── Trip import confirmation ──────────────────────────────────────────────────

export interface TripImportConfirmationOptions {
  ownerEmail: string;
  ownerName: string;
  /** Accepted trip-member emails to CC */
  ccEmails: string[];
  tripTitle: string;
  tripDates: string;
  tripLocation: string | null;
  tripUrl: string;
  /** True when the importer could not confidently match this to a named trip. */
  isUncategorized?: boolean;
  /** Whether this import created a brand-new trip (true) or added to an existing one (false) */
  isNewTrip: boolean;
  /** Reservation / event summaries imported in this batch */
  importedItems: Array<{ type: string; title: string; date: string }>;
}

export function buildTripImportConfirmationHtml(opts: TripImportConfirmationOptions): string {
  const { tripTitle, tripDates, tripLocation, tripUrl, isNewTrip, importedItems, ownerName, isUncategorized } = opts;

  const itemRows = importedItems
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 0;color:${TEXT_BODY};font-size:14px;border-bottom:1px solid #f3f4f6;">
          <span style="display:inline-block;background:${BORDER};border-radius:4px;padding:2px 8px;font-size:12px;color:${TEXT_MUTED};margin-right:8px;text-transform:capitalize;">${escapeHtml(item.type)}</span>
          ${escapeHtml(item.title)}
        </td>
        <td style="padding:6px 0;color:${TEXT_MUTED};font-size:13px;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${escapeHtml(item.date)}</td>
      </tr>`,
    )
    .join('');

  const intro = isUncategorized
    ? 'We\'ve imported the itinerary, but couldn\'t confidently match it to one of your named trips, so it\'s been placed in Uncategorized.'
    : isNewTrip
      ? 'We\'ve turned your forwarded email into a brand-new trip on Shldr.'
      : 'We\'ve added the details from your forwarded email to an existing trip.';

  return emailLayout({
    preheader: isNewTrip
      ? `Trip created: ${tripTitle} — see what we imported.`
      : `Trip updated: ${tripTitle} — see what we imported.`,
    heading: isUncategorized
      ? 'Itinerary imported to Uncategorized'
      : isNewTrip
        ? 'Trip imported'
        : 'Trip updated',
    bodyHtml: `
      <p style="margin:0 0 16px;color:${TEXT_BODY};font-size:16px;line-height:1.6;">
        Hi ${escapeHtml(ownerName)},<br><br>
        ${intro}
      </p>
      <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:8px;padding:20px;margin:0 0 24px;">
        <h2 style="margin:0 0 4px;color:${TEXT_PRIMARY};font-size:20px;">${escapeHtml(tripTitle)}</h2>
        <p style="margin:0 0 2px;color:${TEXT_MUTED};font-size:14px;">${escapeHtml(tripDates)}</p>
        ${tripLocation ? `<p style="margin:0;color:${TEXT_MUTED};font-size:14px;">&#128205; ${escapeHtml(tripLocation)}</p>` : ''}
      </div>
      ${importedItems.length > 0 ? `
      <p style="margin:0 0 12px;color:${TEXT_BODY};font-size:15px;font-weight:600;">Imported items:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        ${itemRows}
      </table>` : ''}
      ${emailButton(tripUrl, 'View Trip')}`,
    footerReason: 'You\u2019re receiving this because a confirmation email was forwarded to Shldr for import.',
  });
}

// ── Trip import failure ───────────────────────────────────────────────────────

export interface TripImportFailureOptions {
  to: string;
  recipientName: string;
  /** Subject of the email we couldn't import */
  originalSubject?: string;
  reason: string;
  /** Optional tips list */
  tips?: string[];
}

export function buildTripImportFailureHtml({
  recipientName,
  originalSubject,
  reason,
  tips,
}: Omit<TripImportFailureOptions, 'to'>): string {
  const tipItems = (tips ?? [])
    .map((tip) => `<li style="margin:0 0 6px;color:${TEXT_BODY};font-size:14px;line-height:1.5;">${escapeHtml(tip)}</li>`)
    .join('');

  return emailLayout({
    preheader: 'We couldn\u2019t import your forwarded email — here\u2019s what to try.',
    heading: 'We couldn\u2019t import that email',
    bodyHtml: `
      <p style="margin:0 0 16px;color:${TEXT_BODY};font-size:16px;line-height:1.6;">
        Hi ${escapeHtml(recipientName)},<br><br>
        Thanks for forwarding a travel confirmation to Shldr — unfortunately we
        weren&apos;t able to import it.
      </p>
      ${originalSubject ? `
      <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:8px;padding:16px 20px;margin:0 0 20px;">
        <p style="margin:0;color:${TEXT_MUTED};font-size:13px;">Forwarded email subject</p>
        <p style="margin:4px 0 0;color:${TEXT_PRIMARY};font-size:15px;font-weight:600;">${escapeHtml(originalSubject)}</p>
      </div>` : ''}
      <p style="margin:0 0 12px;color:${TEXT_BODY};font-size:15px;line-height:1.6;">
        <strong>What happened:</strong> ${escapeHtml(reason)}
      </p>
      ${tipItems ? `
      <p style="margin:0 0 8px;color:${TEXT_BODY};font-size:15px;font-weight:600;">Things to try:</p>
      <ul style="margin:0 0 24px;padding-left:20px;">${tipItems}</ul>` : ''}
      ${emailButton(`${appUrl()}/trips`, 'Open Shldr')}`,
    footerReason: 'You\u2019re receiving this because an email was forwarded to Shldr for import.',
  });
}
