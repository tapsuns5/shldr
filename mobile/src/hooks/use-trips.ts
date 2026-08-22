import { useQuery } from '@tanstack/react-query';
import { formatTrip, type APITrip, type UITrip } from '@shldr/shared';
import { apiClient } from '@/lib/api-client';

export function useTrips(accountId: string | undefined) {
  return useQuery<UITrip[]>({
    queryKey: ['trips', accountId],
    queryFn: async () => {
      const trips = await apiClient.get<APITrip[]>(`/api/trips?accountId=${accountId}`);
      return trips.map(formatTrip);
    },
    enabled: Boolean(accountId),
  });
}
