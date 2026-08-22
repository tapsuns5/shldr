import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateWishlistInput, RawWishlistItem } from '@shldr/shared';
import { apiClient } from '@/lib/api-client';

export function useCreateWishlistItem(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWishlistInput) => apiClient.post<RawWishlistItem>('/api/wishlist', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-data', accountId] });
    },
  });
}

export function useDeleteWishlistItem(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/wishlist?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-data', accountId] });
    },
  });
}

export function useUpdateWishlistItem(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; note?: string; visited?: boolean }) =>
      apiClient.patch<RawWishlistItem>('/api/wishlist', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-data', accountId] });
    },
  });
}
