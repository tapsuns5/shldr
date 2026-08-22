import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { trips } from './trips';

export const tripInviteStatusEnum = pgEnum('trip_invite_status', [
  'pending',
  'accepted',
  'declined',
  'expired',
]);

export const tripInviteRoleEnum = pgEnum('trip_invite_role', [
  'editor',
  'viewer',
  'traveler',
]);

export const tripInvites = pgTable(
  'trip_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    invitedByUserId: text('invited_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }),
    token: text('token').notNull().unique(),
    role: tripInviteRoleEnum('role').notNull().default('viewer'),
    status: tripInviteStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedByUserId: text('accepted_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('trip_invites_trip_id_idx').on(t.tripId),
    index('trip_invites_token_idx').on(t.token),
    index('trip_invites_email_idx').on(t.email),
    index('trip_invites_invited_by_idx').on(t.invitedByUserId),
  ]
);
