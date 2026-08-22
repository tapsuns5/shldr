import { authClient } from './auth-client';
import { API_URL } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Thin wrapper around better-auth's $fetch, which the expoClient plugin
 * already wires to attach the stored bearer token and rewrite it against
 * API_URL. Every route under app/api/** on the server reads its session the
 * same way regardless of whether the caller is the web app (cookies) or this
 * client (bearer token) — see lib/auth.ts.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authClient.$fetch(path, {
    baseURL: API_URL,
    method: init?.method ?? 'GET',
    body: init?.body,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (res.error) {
    throw new ApiError(res.error.message ?? 'Request failed', res.error.status ?? 500);
  }

  return res.data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
