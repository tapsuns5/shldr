import Constants from 'expo-constants';

/**
 * Base URL of the SHLDR web app's API (the same Next.js server the web
 * client talks to). Set EXPO_PUBLIC_API_URL per build profile in eas.json —
 * see mobile/README.md.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:3000';
