import { useCallback, useEffect, useRef, useState } from 'react';
import { compactRankOrder, reorderRanked } from '@/lib/rank';
import { composeAssistedOrder } from '@/lib/assisted-rank';

export type RankView = 'trips' | 'restaurants' | 'cities' | 'hotels' | 'activities';
export type RankEntityType = 'trip' | 'reservation' | 'city';

export interface RankItem {
  id: string;
  rankKey: string;
  entityType: RankEntityType;
  category: RankView;
  title: string;
  context: string;
  secondaryContext: string;
  image: string | null;
  rankOrder: number | null;
  tierId: string | null;
  tags: string[];
  href: string | null;
}

export interface RankTier {
  id: string;
  accountId: string;
  label: string;
  description: string | null;
  sortOrder: number;
  color: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankState {
  ranked: RankItem[];
  unranked: RankItem[];
  tiers: RankTier[];
  counts: { total: number; ranked: number; unranked: number };
}

const DEFAULT_TIER_DEFS = [
  { label: 'S', description: 'All-time favorites', sortOrder: 0, color: '#e0a800' },
  { label: 'A', description: 'Loved it', sortOrder: 1, color: '#2e7d32' },
  { label: 'B', description: 'Great', sortOrder: 2, color: '#1976d2' },
  { label: 'C', description: 'Good', sortOrder: 3, color: '#757575' },
];

const EMPTY_STATE: RankState = {
  ranked: [],
  unranked: [],
  tiers: [],
  counts: { total: 0, ranked: 0, unranked: 0 },
};

export function useRanks(accountId: string, view: RankView) {
  const [state, setState] = useState<RankState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef<RankState | null>(null);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ranks?accountId=${encodeURIComponent(accountId)}&view=${view}`);
      if (!res.ok) throw new Error('Failed to load ranking');
      const data = (await res.json()) as RankState;
      let tiers = data.tiers;
      if (tiers.length === 0) {
        for (const def of DEFAULT_TIER_DEFS) {
          const r = await fetch('/api/rank-tiers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, ...def }),
          });
          if (r.ok) tiers = [...tiers, (await r.json()) as RankTier];
        }
        tiers.sort((a, b) => a.sortOrder - b.sortOrder);
      }
      setState({ ...data, tiers });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [accountId, view]);

  useEffect(() => {
    load();
  }, [load]);

  const rollback = useCallback((message: string) => {
    if (snapshotRef.current) {
      setState(snapshotRef.current);
      snapshotRef.current = null;
    }
    setError(message);
  }, []);

  const moveRankedItem = useCallback(
    async (activeKey: string, overKey: string) => {
      snapshotRef.current = state;
      setState((prev) => ({
        ...prev,
        ranked: reorderRanked(prev.ranked, activeKey, overKey),
      }));
      try {
        const orderedKeys = reorderRanked(state.ranked, activeKey, overKey).map((item) => item.rankKey);
        const res = await fetch('/api/ranks/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, view, rankKeys: orderedKeys }),
        });
        if (!res.ok) throw new Error('Failed to save ranking');
        const { ranked } = (await res.json()) as { ranked: RankItem[] };
        setState((prev) => ({ ...prev, ranked }));
      } catch (e) {
        rollback(e instanceof Error ? e.message : 'Reorder failed');
      } finally {
        snapshotRef.current = null;
      }
    },
    [accountId, view, state, rollback],
  );

  const applyAssistedRanking = useCallback(
    async (assistedKeys: string[]) => {
      const snapshot = state;
      const selected = new Set(assistedKeys);
      const selectedItems = [...state.ranked, ...state.unranked].filter((item) => selected.has(item.rankKey));
      const itemByKey = new Map(selectedItems.map((item) => [item.rankKey, item]));
      const orderedKeys = composeAssistedOrder(
        state.ranked.map((item) => item.rankKey),
        assistedKeys,
        assistedKeys,
      );
      const remainingRanked = state.ranked.filter((item) => !selected.has(item.rankKey));
      const nextRanked = compactRankOrder([
        ...assistedKeys.map((rankKey) => itemByKey.get(rankKey)).filter((item): item is RankItem => Boolean(item)),
        ...remainingRanked,
      ]);
      const nextUnranked = state.unranked.filter((item) => !selected.has(item.rankKey));
      snapshotRef.current = snapshot;
      setState((prev) => ({
        ...prev,
        ranked: nextRanked,
        unranked: nextUnranked,
        counts: { total: prev.counts.total, ranked: nextRanked.length, unranked: nextUnranked.length },
      }));
      try {
        const res = await fetch('/api/ranks/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, view, rankKeys: orderedKeys }),
        });
        if (!res.ok) throw new Error('Failed to apply assisted ranking');
        const data = (await res.json()) as Pick<RankState, 'ranked' | 'unranked' | 'counts'>;
        setState((prev) => ({ ...prev, ...data }));
      } catch (caught) {
        setState(snapshot);
        throw caught;
      } finally {
        snapshotRef.current = null;
      }
    },
    [accountId, view, state],
  );

  const addToRanking = useCallback(
    async (rankKey: string) => {
      snapshotRef.current = state;
      const item = state.unranked.find((it) => it.rankKey === rankKey);
      if (!item) return;
      const nextRanked = [...state.ranked, { ...item, rankOrder: state.ranked.length }];
      const nextUnranked = state.unranked.filter((it) => it.rankKey !== rankKey);
      setState((prev) => ({
        ...prev,
        ranked: nextRanked,
        unranked: nextUnranked,
        counts: { total: prev.counts.total, ranked: nextRanked.length, unranked: nextUnranked.length },
      }));
      try {
        const res = await fetch('/api/ranks/item', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, view, rankKey, action: 'add' }),
        });
        if (!res.ok) throw new Error('Failed to add to ranking');
      } catch (e) {
        rollback(e instanceof Error ? e.message : 'Add failed');
      } finally {
        snapshotRef.current = null;
      }
    },
    [accountId, view, state, rollback],
  );

  const removeFromRanking = useCallback(
    async (rankKey: string) => {
      snapshotRef.current = state;
      const item = state.ranked.find((it) => it.rankKey === rankKey);
      if (!item) return;
      const remaining = state.ranked.filter((it) => it.rankKey !== rankKey);
      const compacted = compactRankOrder(remaining);
      const nextUnranked = [...state.unranked, { ...item, rankOrder: null, tierId: null }];
      setState((prev) => ({
        ...prev,
        ranked: compacted,
        unranked: nextUnranked,
        counts: { total: prev.counts.total, ranked: compacted.length, unranked: nextUnranked.length },
      }));
      try {
        const res = await fetch('/api/ranks/item', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, view, rankKey, action: 'remove' }),
        });
        if (!res.ok) throw new Error('Failed to remove from ranking');
        const data = (await res.json()) as Pick<RankState, 'ranked' | 'unranked' | 'counts'>;
        setState((prev) => ({ ...prev, ...data }));
      } catch (e) {
        rollback(e instanceof Error ? e.message : 'Remove failed');
      } finally {
        snapshotRef.current = null;
      }
    },
    [accountId, view, state, rollback],
  );

  const updateItem = useCallback(
    async (rankKey: string, updates: { tierId?: string | null; tags?: string[] }) => {
      snapshotRef.current = state;
      setState((prev) => ({
        ...prev,
        ranked: prev.ranked.map((it) =>
          it.rankKey === rankKey
            ? {
                ...it,
                tierId: updates.tierId !== undefined ? updates.tierId : it.tierId,
                tags: updates.tags !== undefined ? updates.tags : it.tags,
              }
            : it,
        ),
        unranked: prev.unranked.map((it) =>
          it.rankKey === rankKey
            ? {
                ...it,
                tierId: updates.tierId !== undefined ? updates.tierId : it.tierId,
                tags: updates.tags !== undefined ? updates.tags : it.tags,
              }
            : it,
        ),
      }));
      try {
        const res = await fetch('/api/ranks/item', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, view, rankKey, action: 'update', ...updates }),
        });
        if (!res.ok) throw new Error('Failed to update item');
      } catch (e) {
        rollback(e instanceof Error ? e.message : 'Update failed');
      } finally {
        snapshotRef.current = null;
      }
    },
    [accountId, view, state, rollback],
  );

  const addTier = useCallback(
    async (label: string, sortOrder: number, color?: string, description?: string) => {
      const res = await fetch('/api/rank-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, label, sortOrder, color, description }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add tier');
      }
      const tier = (await res.json()) as RankTier;
      setState((prev) => ({
        ...prev,
        tiers: [...prev.tiers, tier].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      return tier;
    },
    [accountId],
  );

  const updateTier = useCallback(
    async (
      id: string,
      updates: { label?: string; description?: string | null; sortOrder?: number; color?: string | null },
    ) => {
      const res = await fetch('/api/rank-tiers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update tier');
      }
      const updated = (await res.json()) as RankTier;
      setState((prev) => ({
        ...prev,
        tiers: prev.tiers.map((t) => (t.id === id ? { ...t, ...updated } : t)).sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      return updated;
    },
    [],
  );

  const deleteTier = useCallback(async (id: string) => {
    const res = await fetch(`/api/rank-tiers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete tier');
    setState((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((t) => t.id !== id),
      ranked: prev.ranked.map((it) => (it.tierId === id ? { ...it, tierId: null } : it)),
      unranked: prev.unranked.map((it) => (it.tierId === id ? { ...it, tierId: null } : it)),
    }));
    return res.json();
  }, []);

  return {
    ...state,
    loading,
    error,
    reload: load,
    moveRankedItem,
    applyAssistedRanking,
    addToRanking,
    removeFromRanking,
    updateItem,
    addTier,
    updateTier,
    deleteTier,
  };
}
