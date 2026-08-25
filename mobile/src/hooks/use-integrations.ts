import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import type { APIGmailAccount, APITripitFeed, TripitFeedInput, TripitSyncResult } from '@shldr/shared';
import { apiClient } from '@/lib/api-client';

export function useGmailAccounts(accountId: string | undefined) {
  return useQuery<APIGmailAccount[]>({
    queryKey: ['gmail-accounts', accountId],
    queryFn: () => apiClient.get<APIGmailAccount[]>(`/api/integrations/gmail?accountId=${accountId}`),
    enabled: Boolean(accountId),
  });
}

/**
 * Opens Google's consent screen in an in-app browser and waits for the
 * server to redirect back to shldr://settings/integrations (see
 * app/api/integrations/gmail/{auth,callback}/route.ts on the server — the
 * auth route is asked for JSON instead of a redirect since the mobile fetch
 * client can't hand a 302 Location off to a browser, and the callback route
 * redirects to the app scheme instead of the web settings page whenever the
 * signed OAuth state carries platform: "mobile").
 */
export function useConnectGmail(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { url } = await apiClient.get<{ url: string }>(
        `/api/integrations/gmail/auth?accountId=${accountId}&platform=mobile&json=1`
      );
      const result = await WebBrowser.openAuthSessionAsync(url, 'shldr://settings/integrations');
      if (result.type === 'success' && result.url.includes('gmail=error')) {
        throw new Error('Google sign-in failed. Try again.');
      }
      return result;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-accounts', accountId] });
    },
  });
}

export function useDisconnectGmail(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gmailAccountId: string) =>
      apiClient.delete(`/api/integrations/gmail?accountId=${accountId}&gmailAccountId=${gmailAccountId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-accounts', accountId] });
    },
  });
}

export function useTripitFeed(accountId: string | undefined) {
  return useQuery<APITripitFeed | null>({
    queryKey: ['tripit-feed', accountId],
    queryFn: () => apiClient.get<APITripitFeed | null>(`/api/integrations/tripit?accountId=${accountId}`),
    enabled: Boolean(accountId),
  });
}

export function useSaveTripitFeed(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TripitFeedInput) => apiClient.post<APITripitFeed>('/api/integrations/tripit', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripit-feed', accountId] });
    },
  });
}

export function useDisconnectTripit(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.delete(`/api/integrations/tripit?accountId=${accountId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripit-feed', accountId] });
    },
  });
}

export function useSyncTripit(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<TripitSyncResult>('/api/integrations/tripit/sync', { accountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripit-feed', accountId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['map-data', accountId] });
    },
  });
}
