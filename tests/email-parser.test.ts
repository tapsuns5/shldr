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
  // Dates are stored as naive datetimes encoded in UTC (Date.UTC), so the
  // wall-clock components live in the UTC getters.
  assert.equal(event.startDateTime.getUTCFullYear(), expected.year);
  assert.equal(event.startDateTime.getUTCMonth() + 1, expected.month);
  assert.equal(event.startDateTime.getUTCDate(), expected.day);
  assert.equal(event.startDateTime.getUTCHours(), expected.hour);
  assert.equal(event.startDateTime.getUTCMinutes(), expected.minute);
}

async function assertFixture(
  fileName: string,
  expected: {
    type: ReservationType;
    confirmationNumber: string;
    date: { year: number; month: number; day: number; hour: number; minute: number };
    destinationCity?: string;
    destinationCountry?: string;
    hasTime?: boolean;
  },
) {
  const event = await parseFixture(fileName);
  assert.equal(event.type, expected.type, `${fileName}: type mismatch`);
  assert.equal(event.confirmationNumber ?? '', expected.confirmationNumber, `${fileName}: confirmationNumber mismatch`);
  assertLocalDate(event, expected.date);
  if (expected.destinationCity) assert.equal(event.destinationCity, expected.destinationCity, `${fileName}: destinationCity mismatch`);
  if (expected.destinationCountry) assert.equal(event.destinationCountry, expected.destinationCountry, `${fileName}: destinationCountry mismatch`);
  if (expected.hasTime !== undefined) assert.equal(event.hasTime, expected.hasTime, `${fileName}: hasTime mismatch`);
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

  // ── New fixtures: type detection, time extraction, location ──────────

  // Auberge de Savièse — restaurant booking via Resos (Geneva)
  await assertFixture('Booking confirmation (2 people, Sat, 26 Sep 2026 19_30).eml', {
    type: 'restaurant',
    confirmationNumber: '',
    date: { year: 2026, month: 9, day: 26, hour: 19, minute: 30 },
    destinationCity: 'Genève',
    destinationCountry: 'Switzerland',
    hasTime: true,
  });

  // La Pelosa beach reservation (Sardinia) — no time in email
  await assertFixture('Conferma prenotazione spiaggia n. 60790.eml', {
    type: 'activity',
    confirmationNumber: '',
    date: { year: 2026, month: 9, day: 19, hour: 0, minute: 0 },
    destinationCountry: 'Italy',
    hasTime: false,
  });

  // Capichera wine tasting (Sardinia) — Italian "in data ... alle 15:00"
  await assertFixture('Your appointment information.eml', {
    type: 'activity',
    confirmationNumber: '',
    date: { year: 2026, month: 9, day: 23, hour: 15, minute: 0 },
    destinationCountry: 'Italy',
    hasTime: true,
  });

  // Restaurant Les Armures (Geneva) — "Friday 25 September 2026 at 7:30 PM"
  await assertFixture('[Restaurant Les Armures] Reservation confirmation.eml', {
    type: 'restaurant',
    confirmationNumber: '',
    date: { year: 2026, month: 9, day: 25, hour: 19, minute: 30 },
    destinationCity: 'Genève',
    destinationCountry: 'Switzerland',
    hasTime: true,
  });

  console.log('Email parser fixtures passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
