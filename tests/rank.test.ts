import assert from 'node:assert/strict';
import { compactRankOrder, partitionRankItems, reorderRanked, sortRanked } from '../lib/rank';
import { ASSISTED_CRITERIA, composeAssistedOrder, scoreAssistedItems } from '../lib/assisted-rank';

const items = [
  { rankKey: 'b', rankOrder: 1 },
  { rankKey: 'u', rankOrder: null },
  { rankKey: 'a', rankOrder: 0 },
];

assert.deepEqual(sortRanked(items).map((item) => item.rankKey), ['a', 'b']);
assert.deepEqual(partitionRankItems(items).unranked.map((item) => item.rankKey), ['u']);
assert.deepEqual(reorderRanked(sortRanked(items), 'b', 'a'), [
  { rankKey: 'b', rankOrder: 0 },
  { rankKey: 'a', rankOrder: 1 },
]);
assert.deepEqual(compactRankOrder([{ rankKey: 'a', rankOrder: 8 }]), [
  { rankKey: 'a', rankOrder: 0 },
]);

const criteria = ASSISTED_CRITERIA.hotels.slice(0, 2);
const assistedItems = [
  { rankKey: 'hotel:a', title: 'Hotel A' },
  { rankKey: 'hotel:b', title: 'Hotel B' },
  { rankKey: 'hotel:c', title: 'Hotel C' },
];
const assistedResults = scoreAssistedItems(
  assistedItems,
  criteria,
  { comfort: 3, service: 1 },
  {
    'hotel:a': { comfort: 5, service: 2 },
    'hotel:b': { comfort: 3, service: 5 },
    'hotel:c': { comfort: 3, service: 5 },
  },
);
assert.deepEqual(assistedResults.map(({ item }) => item.rankKey), ['hotel:a', 'hotel:b', 'hotel:c']);
assert.equal(assistedResults[0].score, 4.25);
assert.deepEqual(assistedResults[0].strongestCriteria, ['Comfort', 'Service']);
assert.deepEqual(composeAssistedOrder(['hotel:a', 'hotel:d'], ['hotel:a', 'hotel:b'], ['hotel:b', 'hotel:a']), [
  'hotel:b',
  'hotel:a',
  'hotel:d',
]);
assert.deepEqual(Object.keys(ASSISTED_CRITERIA).sort(), ['activities', 'cities', 'hotels', 'restaurants', 'trips']);
assert.ok(Object.values(ASSISTED_CRITERIA).every((viewCriteria) => viewCriteria.length > 0));

console.log('Rank helper tests passed');
