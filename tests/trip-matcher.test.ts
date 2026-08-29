import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { simpleParser } from 'mailparser';
import { parseConfirmationEmail, type ParsedEmailEvent } from '../lib/email-parser';
import { isDetailEvent, selectTripCandidate, type TripCandidate } from '../lib/trip-matcher';

const referencedTrip: TripCandidate = {
  id: 'b843e663-6734-4512-a1ac-8eed66eee9ca',
  title: 'Sardinia',
  startDate: '2026-09-16',
  endDate: '2026-09-25',
  destinationCity: 'Olbia',
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
  assert.equal(matchingDetail.destinationCity, 'Olbia');
  assert.equal(selectTripCandidate(matchingDetail, [referencedTrip])?.id, referencedTrip.id);

  const sameDateDifferentLocation = await parseFixture('same-date-unmatched-trip-detail.eml');
  assert.equal(sameDateDifferentLocation.type, 'activity');
  assert.equal(sameDateDifferentLocation.destinationCity, 'Rome');
  assert.equal(selectTripCandidate(sameDateDifferentLocation, [referencedTrip]), null);
  assert.equal(isDetailEvent(sameDateDifferentLocation), true);

  const uncategorizedTrip: TripCandidate = {
    ...referencedTrip,
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Uncategorized',
    destinationCity: 'Rome',
    isUncategorized: true,
  };
  assert.equal(selectTripCandidate(sameDateDifferentLocation, [uncategorizedTrip]), null);
  assert.equal(
    !selectTripCandidate(sameDateDifferentLocation, [referencedTrip]) && isDetailEvent(sameDateDifferentLocation),
    true,
  );

  console.log('Trip matching and Uncategorized fallback tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
