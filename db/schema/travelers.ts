import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { trips } from './trips';

export const travelers = pgTable(
  'travelers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    birthDate: date('birth_date'),
    passportNumberEncrypted: text('passport_number_encrypted'),
    passportCountry: varchar('passport_country', { length: 100 }),
    passportExpiration: date('passport_expiration'),
    knownTravelerNumber: varchar('known_traveler_number', { length: 100 }),
    redressNumber: varchar('redress_number', { length: 100 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('travelers_trip_id_idx').on(t.tripId),
    index('travelers_email_idx').on(t.email),
  ]
);
