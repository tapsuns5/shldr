import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const accountMemberRoleEnum = pgEnum('account_member_role', [
  'owner',
  'admin',
  'member',
  'viewer',
]);

export const locationDisplayModeEnum = pgEnum('location_display_mode', [
  'map',
  'image',
]);

export const accountPlanEnum = pgEnum('account_plan', [
  'free',
  'pro',
  'premium',
]);

export const accountInviteStatusEnum = pgEnum('account_invite_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    logoUrl: text('logo_url'),
    plan: accountPlanEnum('plan').notNull().default('free'),
    locationDisplayMode: locationDisplayModeEnum('location_display_mode').notNull().default('map'),
    timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('accounts_slug_idx').on(t.slug),
    index('accounts_owner_user_id_idx').on(t.ownerUserId),
  ]
);

export const accountMembers = pgTable(
  'account_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: accountMemberRoleEnum('role').notNull().default('member'),
    invitedBy: text('invited_by').references(() => user.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('account_members_account_user_unique').on(t.accountId, t.userId),
    index('account_members_account_id_idx').on(t.accountId),
    index('account_members_user_id_idx').on(t.userId),
  ]
);

export const accountInvites = pgTable(
  'account_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    invitedByUserId: text('invited_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }),
    token: text('token').notNull().unique(),
    status: accountInviteStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedByUserId: text('accepted_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('account_invites_account_id_idx').on(t.accountId),
    index('account_invites_token_idx').on(t.token),
    index('account_invites_email_idx').on(t.email),
    index('account_invites_invited_by_idx').on(t.invitedByUserId),
  ]
);
