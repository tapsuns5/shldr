import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { accounts } from './accounts';

export const tripStatusEnum = pgEnum('trip_status', [
  'planning',
  'confirmed',
  'active',
  'completed',
  'cancelled',
]);

export const tripMemberRoleEnum = pgEnum('trip_member_role', [
  'editor',
  'viewer',
  'traveler',
]);

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: tripStatusEnum('status').notNull().default('planning'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    originAirport: varchar('origin_airport', { length: 10 }),
    destinationCity: varchar('destination_city', { length: 255 }),
    destinationCountry: varchar('destination_country', { length: 255 }),
    coverImage: text('cover_image'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    externalUid: text('external_uid'),
    externalSource: varchar('external_source', { length: 50 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('trips_account_id_idx').on(t.accountId),
    index('trips_start_date_idx').on(t.startDate),
    index('trips_status_idx').on(t.status),
    index('trips_created_by_idx').on(t.createdBy),
    index('trips_external_uid_idx').on(t.externalUid),
  ]
);

export const tripMembers = pgTable(
  'trip_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: tripMemberRoleEnum('role').notNull().default('viewer'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('trip_members_trip_user_unique').on(t.tripId, t.userId),
    index('trip_members_trip_id_idx').on(t.tripId),
    index('trip_members_user_id_idx').on(t.userId),
  ]
);

export const tripDestinations = pgTable(
  'trip_destinations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    city: varchar('city', { length: 255 }).notNull(),
    state: varchar('state', { length: 255 }),
    country: varchar('country', { length: 255 }).notNull(),
    arrivalDate: date('arrival_date'),
    departureDate: date('departure_date'),
    sortOrder: text('sort_order').notNull().default('0'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('trip_destinations_trip_id_idx').on(t.tripId),
    index('trip_destinations_sort_order_idx').on(t.sortOrder),
  ]
);
