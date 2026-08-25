import { useQuery } from '@tanstack/react-query';
import { deriveTravelMapData, deriveTravelStats, type RawTravelMapData } from '@shldr/shared';
import { apiClient } from '@/lib/api-client';

export function useAccountMapData(accountId: string | undefined) {
  return useQuery({
    queryKey: ['map-data', accountId],
    queryFn: () => apiClient.get<RawTravelMapData>(`/api/trips/map-data?accountId=${accountId}`),
    enabled: Boolean(accountId),
    select: (raw) => {
      const mapData = deriveTravelMapData(raw);
      return { ...mapData, stats: deriveTravelStats(mapData) };
    },
  });
}
