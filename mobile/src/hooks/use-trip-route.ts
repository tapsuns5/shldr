import { useQuery } from '@tanstack/react-query';
import type { TripRouteData } from '@shldr/shared';
import { apiClient } from '@/lib/api-client';

export function useTripRoute(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip-route', tripId],
    queryFn: () => apiClient.get<TripRouteData>(`/api/trips/map-data?tripId=${tripId}`),
    enabled: Boolean(tripId),
  });
}
