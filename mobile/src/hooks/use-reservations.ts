import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useDeleteReservation(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) =>
      apiClient.delete(`/api/trips/${tripId}/reservations/${reservationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'reservations'] });
    },
  });
}

export function useMoveReservation(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, targetTripId }: { reservationId: string; targetTripId: string }) =>
      apiClient.patch(`/api/trips/${tripId}/reservations/${reservationId}`, { tripId: targetTripId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'reservations'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useCopyReservation(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reservation, targetTripId }: { reservation: APIReservation; targetTripId: string }) => {
      const { id, tripId: _tripId, createdAt, updatedAt, ...fields } = reservation;
      return apiClient.post<APIReservation>(`/api/trips/${targetTripId}/reservations`, {
        ...fields,
        source: fields.source ?? 'manual',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
