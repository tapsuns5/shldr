import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { simpleParser } from 'mailparser';
import { parseConfirmationEmail, type ParsedEmailEvent } from '../lib/email-parser';
import { isDetailEvent, selectTripCandidate, type TripCandidate } from '../lib/trip-matcher';

const referencedTrip: TripCandidate = {
  id: 'b843e663-6734-4512-a1ac-8eed66eee9ca',
  title: 'IT',
  startDate: '2026-09-15',
  endDate: '2026-09-28',
  destinationCity: 'Via Antares 1 Santa Teresa di Gallura SS 07028 IT',
  destinationCountry: '',
  tripDestinations: [
    { city: 'Via Antares 1 Santa Teresa di Gallura SS 07028 IT', country: '' },
    { city: 'Costa Smeralda Arzachena Italy', country: '07021' },
    { city: '1201 GENEVA', country: 'Switzerland' },
  ],
  status: 'confirmed',
};

async function parseFixture(fileName: string): Promise<ParsedEmailEvent> {
  const source = await readFile(path.resolve(process.cwd(), 'tests', fileName));
  const email = await simpleParser(source);
  return parseConfirmationEmail({
    subject: email.subject ?? '',
    bodyText: email.text ?? '',
    bodyHtml: typeof email.html === 'string' ? email.html : undefined,
  }).events[0];
}

async function run() {
  const matchingDetail = await parseFixture('matching-trip-detail.eml');
  assert.equal(matchingDetail.type, 'restaurant');
  assert.equal(matchingDetail.destinationCity, 'Costa Smeralda');
  assert.equal(selectTripCandidate(matchingDetail, [referencedTrip])?.id, referencedTrip.id);

  const sardiniaActivity = await parseFixture('Reservation confirmation.eml');
  assert.equal(sardiniaActivity.providerName, 'Blue Island Sardinia');
  assert.equal(selectTripCandidate(sardiniaActivity, [referencedTrip])?.id, referencedTrip.id);

  const luStazzu = await parseFixture('🍴Your reservation at Ristorante Lu Stazzu.eml');
  assert.equal(luStazzu.destinationCity, 'OLBIA');
  assert.equal(luStazzu.destinationCountry, 'Italy');
  assert.equal(selectTripCandidate(luStazzu, [referencedTrip])?.id, referencedTrip.id);

  const sameDateDifferentLocation = await parseFixture('same-date-unmatched-trip-detail.eml');
  assert.equal(sameDateDifferentLocation.type, 'activity');
  assert.equal(sameDateDifferentLocation.destinationCity, 'Rome');
  // Rome event falls within the Sardinia trip dates and both are in Italy,
  // so the country+date fallback should match it to the only candidate.
  assert.equal(selectTripCandidate(sameDateDifferentLocation, [referencedTrip])?.id, referencedTrip.id);
  assert.equal(isDetailEvent(sameDateDifferentLocation), true);

  const uncategorizedTrip: TripCandidate = {
    ...referencedTrip,
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Uncategorized',
    destinationCity: 'Rome',
    isUncategorized: true,
  };
  // Uncategorized trips must never be matched, even with country+date fallback.
  assert.equal(selectTripCandidate(sameDateDifferentLocation, [uncategorizedTrip]), null);

  const futureTokyoActivity = await parseFixture('unassigned-tokyo-activity.eml');
  assert.equal(futureTokyoActivity.type, 'activity');
  assert.equal(futureTokyoActivity.confirmationNumber, 'TOKYO-2027');
  assert.equal(selectTripCandidate(futureTokyoActivity, [referencedTrip]), null);
  assert.equal(isDetailEvent(futureTokyoActivity), true);

  console.log('Trip matching and Uncategorized fallback tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
