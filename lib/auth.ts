import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { expo } from '@better-auth/expo';
import { db } from '@/db';
import * as authSchema from '@/db/schema/auth';
import { sendMail } from '@/lib/mailer';
import {
  buildChangeEmailConfirmationHtml,
  buildPasswordResetEmailHtml,
  buildVerificationEmailHtml,
} from '@/lib/email-templates';

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
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Reset your Shldr password',
        html: buildPasswordResetEmailHtml({ url, displayName: user.name || user.email }),
      });
    },
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
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
  advanced: {
    backgroundTasks: {
      // Send auth emails (verification, password reset) without blocking the
      // API response — SMTP handshake can take several seconds.
      handler: (promise: Promise<unknown>) => {
        void promise;
      },
    },
  },
  plugins: [expo()],
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      disableImplicitSignUp: true,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [process.env.APP_URL!, 'shldr://', 'exp://'],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
