import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { simpleParser } from 'mailparser';
import { parseConfirmationEmail, type ParsedEmailEvent, type ReservationType } from '../lib/email-parser';

const fixturesDir = path.resolve(process.cwd(), 'tests');

async function parseFixture(fileName: string): Promise<ParsedEmailEvent> {
  const source = await readFile(path.join(fixturesDir, fileName));
  const email = await simpleParser(source);
  return parseConfirmationEmail({
    subject: email.subject ?? '',
    bodyText: email.text ?? '',
    bodyHtml: typeof email.html === 'string' ? email.html : undefined,
  }).events[0];
}

function assertLocalDate(
  event: ParsedEmailEvent,
  expected: { year: number; month: number; day: number; hour: number; minute: number },
) {
  assert.ok(event.startDateTime, 'expected a parsed start date');
  assert.equal(event.startDateTime.getFullYear(), expected.year);
  assert.equal(event.startDateTime.getMonth() + 1, expected.month);
  assert.equal(event.startDateTime.getDate(), expected.day);
  assert.equal(event.startDateTime.getHours(), expected.hour);
  assert.equal(event.startDateTime.getMinutes(), expected.minute);
}

async function assertFixture(
  fileName: string,
  expected: {
    type: ReservationType;
    confirmationNumber: string;
    date: { year: number; month: number; day: number; hour: number; minute: number };
    destinationCity?: string;
  },
) {
  const event = await parseFixture(fileName);
  assert.equal(event.type, expected.type);
  assert.equal(event.confirmationNumber, expected.confirmationNumber);
  assertLocalDate(event, expected.date);
  if (expected.destinationCity) assert.equal(event.destinationCity, expected.destinationCity);
}

async function run() {
  await assertFixture('forwarded-restaurant-reservation.eml', {
    type: 'restaurant',
    confirmationNumber: '21803',
    date: { year: 2026, month: 9, day: 22, hour: 19, minute: 30 },
    destinationCity: 'San Pantaleo',
  });

  await assertFixture('spanish-activity-reservation.eml', {
    type: 'activity',
    confirmationNumber: 'ABC123',
    date: { year: 2026, month: 9, day: 22, hour: 19, minute: 30 },
    destinationCity: 'Madrid',
  });

  await assertFixture('german-rail-reservation.eml', {
    type: 'rail',
    confirmationNumber: 'DE1234',
    date: { year: 2026, month: 9, day: 22, hour: 8, minute: 45 },
  });

  await assertFixture('Your car rental ticket 054716.eml', {
    type: 'car',
    confirmationNumber: '054716',
    date: { year: 2026, month: 9, day: 16, hour: 18, minute: 0 },
    destinationCity: 'Olbia',
  });

  const sardiniaActivity = await parseFixture('Reservation confirmation.eml');
  assert.equal(sardiniaActivity.type, 'activity');
  assert.equal(sardiniaActivity.title, 'TOUR CONDIVISO ARCIPELAGO DELLA MADDALENA CON 7 SOSTE');
  assert.equal(sardiniaActivity.providerName, 'Blue Island Sardinia');
  assert.equal(sardiniaActivity.destinationCity, 'Palau');
  assertLocalDate(sardiniaActivity, { year: 2026, month: 9, day: 21, hour: 10, minute: 0 });

  const luStazzu = await parseFixture('🍴Your reservation at Ristorante Lu Stazzu.eml');
  assert.equal(luStazzu.type, 'restaurant');
  assert.equal(luStazzu.title, 'Ristorante Lu Stazzu');
  assert.equal(luStazzu.providerName, 'Ristorante Lu Stazzu');
  assert.equal(luStazzu.destinationCity, 'OLBIA');
  assert.equal(luStazzu.destinationCountry, 'Italy');
  assertLocalDate(luStazzu, { year: 2026, month: 9, day: 23, hour: 19, minute: 30 });

  const encodedTitle = parseConfirmationEmail({
    subject: 'Fwd: Reservation confirmation',
    bodyText: 'Activity confirmation of your reservation for &quot;&quot;SARDINIA BOAT TOUR&quot;&quot; below.\nData: 2026-09-21 10:00',
  }).events[0];
  assert.equal(encodedTitle.title, 'SARDINIA BOAT TOUR');

  console.log('Email parser fixtures passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
