import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface APIAccount {
  id: string;
  name: string;
  slug: string;
}

export function useAccounts() {
  return useQuery<APIAccount[]>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.get<APIAccount[]>('/api/accounts'),
  });
}
