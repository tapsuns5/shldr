import { useMutation } from '@tanstack/react-query';
import type { InviteTripInput } from '@shldr/shared';
import { apiClient } from '@/lib/api-client';

interface InviteResult {
  token: string;
  inviteUrl: string;
}

export function useCreateTripInvite(tripId: string | undefined) {
  return useMutation({
    mutationFn: (input: InviteTripInput) =>
      apiClient.post<InviteResult[]>(`/api/trips/${tripId}/invite`, input),
  });
}
