import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  pgEnum,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { trips } from './trips';
import { rankTiers } from './rank-tiers';

export const reservationTypeEnum = pgEnum('reservation_type', [
  'flight',
  'hotel',
  'car',
  'rail',
  'cruise',
  'activity',
  'restaurant',
  'transport',
  'other',
]);

export const reservationSourceEnum = pgEnum('reservation_source', [
  'manual',
  'email_import',
  'calendar_import',
  'api_import',
]);

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    type: reservationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    confirmationNumber: varchar('confirmation_number', { length: 255 }),
    providerName: varchar('provider_name', { length: 255 }),
    providerPhone: varchar('provider_phone', { length: 255 }),
    providerWebsite: text('provider_website'),
    startDateTime: timestamp('start_date_time').notNull(),
    endDateTime: timestamp('end_date_time'),
    location: text('location'),
    currency: varchar('currency', { length: 10 }),
    totalCost: decimal('total_cost', { precision: 12, scale: 2 }),
    notes: text('notes'),
    rawEmailHtml: text('raw_email_html'),
    rawEmailSubject: text('raw_email_subject'),
    source: reservationSourceEnum('source').notNull().default('manual'),
    rankTier: varchar('rank_tier', { length: 20 }),
    rankTierId: uuid('rank_tier_id').references(() => rankTiers.id, { onDelete: 'set null' }),
    rankOrder: integer('rank_order'),
    rankLabels: text('rank_labels').array().notNull().default([]),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('reservations_trip_id_idx').on(t.tripId),
    index('reservations_type_idx').on(t.type),
    index('reservations_start_date_time_idx').on(t.startDateTime),
    index('reservations_rank_tier_idx').on(t.rankTier),
    index('reservations_rank_tier_id_idx').on(t.rankTierId),
  ]
);

export const flightReservations = pgTable('flight_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  reservationId: uuid('reservation_id')
    .notNull()
    .unique()
    .references(() => reservations.id, { onDelete: 'cascade' }),
  airline: varchar('airline', { length: 255 }).notNull(),
  flightNumber: varchar('flight_number', { length: 50 }).notNull(),
  departureAirport: varchar('departure_airport', { length: 10 }).notNull(),
  arrivalAirport: varchar('arrival_airport', { length: 10 }).notNull(),
  departureTerminal: varchar('departure_terminal', { length: 50 }),
  arrivalTerminal: varchar('arrival_terminal', { length: 50 }),
  departureGate: varchar('departure_gate', { length: 50 }),
  arrivalGate: varchar('arrival_gate', { length: 50 }),
  seat: varchar('seat', { length: 20 }),
  ticketNumber: varchar('ticket_number', { length: 255 }),
  bookingClass: varchar('booking_class', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const hotelReservations = pgTable('hotel_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  reservationId: uuid('reservation_id')
    .notNull()
    .unique()
    .references(() => reservations.id, { onDelete: 'cascade' }),
  hotelName: varchar('hotel_name', { length: 255 }).notNull(),
  address1: varchar('address1', { length: 255 }),
  address2: varchar('address2', { length: 255 }),
  city: varchar('city', { length: 255 }).notNull(),
  state: varchar('state', { length: 255 }),
  country: varchar('country', { length: 255 }).notNull(),
  postalCode: varchar('postal_code', { length: 50 }),
  roomType: varchar('room_type', { length: 255 }),
  checkIn: timestamp('check_in').notNull(),
  checkOut: timestamp('check_out').notNull(),
  guestCount: text('guest_count'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const carRentalReservations = pgTable('car_rental_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  reservationId: uuid('reservation_id')
    .notNull()
    .unique()
    .references(() => reservations.id, { onDelete: 'cascade' }),
  vendor: varchar('vendor', { length: 255 }).notNull(),
  pickupLocation: varchar('pickup_location', { length: 255 }).notNull(),
  dropoffLocation: varchar('dropoff_location', { length: 255 }).notNull(),
  pickupDateTime: timestamp('pickup_date_time').notNull(),
  dropoffDateTime: timestamp('dropoff_date_time').notNull(),
  vehicleClass: varchar('vehicle_class', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const activityReservations = pgTable('activity_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  reservationId: uuid('reservation_id')
    .notNull()
    .unique()
    .references(() => reservations.id, { onDelete: 'cascade' }),
  activityName: varchar('activity_name', { length: 255 }).notNull(),
  venue: varchar('venue', { length: 255 }),
  address: text('address'),
  ticketCount: text('ticket_count'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transportReservations = pgTable('transport_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  reservationId: uuid('reservation_id')
    .notNull()
    .unique()
    .references(() => reservations.id, { onDelete: 'cascade' }),
  transportType: varchar('transport_type', { length: 100 }).notNull(),
  operator: varchar('operator', { length: 255 }),
  departureLocation: varchar('departure_location', { length: 255 }),
  arrivalLocation: varchar('arrival_location', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
