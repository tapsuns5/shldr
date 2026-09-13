import { useCallback, useEffect, useState } from 'react';
import type { TripDocument } from '@/components/attachments/types';

export function useTripDocuments(tripId: string) {
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trips/${tripId}/documents`);
        if (!res.ok) throw new Error('Failed to load attachments');
        const data: TripDocument[] = await res.json();
        if (!cancelled) setDocuments(data);
      } catch {
        if (!cancelled) setError('Failed to load attachments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [tripId, version]);

  return { documents, loading, error, refetch };
}
