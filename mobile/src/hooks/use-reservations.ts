import { useQuery } from '@tanstack/react-query';
import type { APIReservation, APITrip } from '@shldr/shared';
import { apiClient } from '@/lib/api-client';

export function useTrip(tripId: string | undefined) {
  return useQuery<APITrip>({
    queryKey: ['trip', tripId],
    queryFn: () => apiClient.get<APITrip>(`/api/trips/${tripId}`),
    enabled: Boolean(tripId),
  });
}

export function useReservations(tripId: string | undefined) {
  return useQuery<APIReservation[]>({
    queryKey: ['trip', tripId, 'reservations'],
    queryFn: () => apiClient.get<APIReservation[]>(`/api/trips/${tripId}/reservations`),
    enabled: Boolean(tripId),
  });
}
