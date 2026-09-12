import type { RankItem, RankView } from '@/hooks/use-ranks';

export interface AssistedCriterion {
  id: string;
  label: string;
  description: string;
}

export type CriterionWeights = Record<string, number>;
export type ItemRatings = Record<string, Record<string, number>>;

export interface AssistedRankResult<T extends Pick<RankItem, 'rankKey' | 'title'>> {
  item: T;
  score: number;
  strongestCriteria: string[];
}

export const ASSISTED_CRITERIA: Record<RankView, AssistedCriterion[]> = {
  trips: [
    { id: 'enjoyment', label: 'Overall enjoyment', description: 'How much you enjoyed the trip as a whole' },
    { id: 'destination', label: 'Destination', description: 'How much you liked the places you visited' },
    { id: 'experiences', label: 'Experiences', description: 'The quality of activities, food, and moments' },
    { id: 'value', label: 'Value', description: 'How worthwhile it felt for the time and cost' },
    { id: 'memories', label: 'Lasting memories', description: 'How memorable and meaningful the trip remains' },
  ],
  hotels: [
    { id: 'comfort', label: 'Comfort', description: 'Room quality, sleep, cleanliness, and ease' },
    { id: 'service', label: 'Service', description: 'How well the staff anticipated and handled your needs' },
    { id: 'location', label: 'Location', description: 'Convenience and quality of the surrounding area' },
    { id: 'amenities', label: 'Amenities', description: 'The quality of facilities and included extras' },
    { id: 'value', label: 'Value', description: 'How worthwhile the stay felt for the price' },
  ],
  restaurants: [
    { id: 'food', label: 'Food', description: 'Taste, quality, and consistency of the meal' },
    { id: 'service', label: 'Service', description: 'Warmth, timing, and attentiveness' },
    { id: 'atmosphere', label: 'Atmosphere', description: 'The setting, energy, and sense of occasion' },
    { id: 'value', label: 'Value', description: 'How worthwhile the experience felt for the price' },
    { id: 'return', label: 'Desire to return', description: 'How strongly you would choose to eat there again' },
  ],
  cities: [
    { id: 'enjoyment', label: 'Overall enjoyment', description: 'How much you enjoyed spending time there' },
    { id: 'activities', label: 'Things to do', description: 'The range and quality of sights and experiences' },
    { id: 'culture', label: 'Food & culture', description: 'The local food, character, arts, and atmosphere' },
    { id: 'ease', label: 'Ease of exploring', description: 'How simple and pleasant it was to get around' },
    { id: 'return', label: 'Desire to return', description: 'How strongly you want to visit again' },
  ],
  activities: [
    { id: 'enjoyment', label: 'Enjoyment', description: 'How much fun or fulfillment it provided' },
    { id: 'uniqueness', label: 'Uniqueness', description: 'How distinctive and hard to replicate it felt' },
    { id: 'execution', label: 'Execution', description: 'Organization, quality, and guide or staff performance' },
    { id: 'value', label: 'Value', description: 'How worthwhile it felt for the time and cost' },
    { id: 'recommend', label: 'Would recommend', description: 'How confidently you would suggest it to someone else' },
  ],
};

export function scoreAssistedItems<T extends Pick<RankItem, 'rankKey' | 'title'>>(
  items: T[],
  criteria: AssistedCriterion[],
  weights: CriterionWeights,
  ratings: ItemRatings,
): AssistedRankResult<T>[] {
  const totalWeight = criteria.reduce((total, criterion) => total + (weights[criterion.id] ?? 1), 0);

  return items
    .map((item, originalIndex) => {
      const contributions = criteria.map((criterion) => ({
        criterion,
        value: (ratings[item.rankKey]?.[criterion.id] ?? 0) * (weights[criterion.id] ?? 1),
      }));
      const score = contributions.reduce((total, contribution) => total + contribution.value, 0) / totalWeight;
      const strongestCriteria = [...contributions]
        .sort((a, b) => b.value - a.value)
        .slice(0, 2)
        .map(({ criterion }) => criterion.label);
      return { item, score, strongestCriteria, originalIndex };
    })
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .map(({ item, score, strongestCriteria }) => ({ item, score, strongestCriteria }));
}

export function composeAssistedOrder(
  rankedKeys: string[],
  selectedKeys: string[],
  assistedKeys: string[],
): string[] {
  const selected = new Set(selectedKeys);
  return [...assistedKeys, ...rankedKeys.filter((rankKey) => !selected.has(rankKey))];
}
