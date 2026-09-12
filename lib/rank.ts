export interface OrderedRankItem {
  rankKey: string;
  rankOrder: number | null;
}

export function sortRanked<T extends OrderedRankItem>(items: T[]): T[] {
  return items
    .filter((item) => item.rankOrder !== null)
    .sort((a, b) => (a.rankOrder ?? 0) - (b.rankOrder ?? 0));
}

export function partitionRankItems<T extends OrderedRankItem>(items: T[]) {
  return {
    ranked: sortRanked(items),
    unranked: items.filter((item) => item.rankOrder === null),
  };
}

export function compactRankOrder<T extends OrderedRankItem>(items: T[]): T[] {
  return items.map((item, rankOrder) => ({ ...item, rankOrder }));
}

export function reorderRanked<T extends OrderedRankItem>(items: T[], activeKey: string, overKey: string): T[] {
  const activeIndex = items.findIndex((item) => item.rankKey === activeKey);
  const overIndex = items.findIndex((item) => item.rankKey === overKey);
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return items;

  const next = [...items];
  const [moved] = next.splice(activeIndex, 1);
  next.splice(overIndex, 0, moved);
  return compactRankOrder(next);
}
