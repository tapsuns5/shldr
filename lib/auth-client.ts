import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  changeEmail,
  changePassword,
  requestPasswordReset,
  resetPassword,
} = authClient;
