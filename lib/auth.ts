import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { expo } from '@better-auth/expo';
import { db } from '@/db';
import * as authSchema from '@/db/schema/auth';
import { sendMail } from '@/lib/mailer';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authSchema.user,
      session: authSchema.session,
      account: authSchema.account,
      verification: authSchema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const newEmail = (request as Request | undefined)?.headers?.get?.('x-new-email');
      const subject = newEmail
        ? `Verify your new email on Shldr`
        : `Verify your email on Shldr`;
      await sendMail({
        to: user.email,
        subject,
        html: buildVerificationEmailHtml({ url, displayName: user.name || user.email }),
      });
    },
    autoSignInAfterVerification: true,
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url, token }, request) => {
        await sendMail({
          to: user.email,
          subject: 'Confirm your email change on Shldr',
          html: buildChangeEmailConfirmationHtml({
            oldEmail: user.email,
            newEmail,
            url,
            displayName: user.name || user.email,
          }),
        });
      },
    },
  },
  telemetry: {
    enabled: false,
  },
  plugins: [expo()],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [process.env.APP_URL!, 'shldr://', 'exp://'],
});

function buildVerificationEmailHtml({ url, displayName }: { url: string; displayName: string }): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1b6b3a;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Verify your email</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
            Hi ${displayName},<br><br>
            Please confirm your email address by clicking the button below.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${url}" style="display:inline-block;background:#1b6b3a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:600;">
              Verify Email
            </a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
            Or copy this link: <a href="${url}" style="color:#1b6b3a;">${url}</a><br>
            This link expires in 1 hour.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            You're receiving this because you recently changed your email on Shldr.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildChangeEmailConfirmationHtml({
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
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#b91c1c;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Confirm email change</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
            Hi ${displayName},<br><br>
            A request was made to change the email on your Shldr account from
            <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.
          </p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            If you made this request, click the button below to confirm. After confirmation,
            a verification email will be sent to your new email address.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${url}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:600;">
              Confirm Email Change
            </a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
            Or copy this link: <a href="${url}" style="color:#b91c1c;">${url}</a><br>
            If you did not request this change, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            You're receiving this because your Shldr account email is being changed.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
