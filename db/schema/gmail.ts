import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { accounts } from './accounts';
import { reservations } from './reservations';

export const gmailAccountStatusEnumValues = ['ACTIVE', 'EXPIRED', 'ERROR', 'REVOKED'] as const;

export const gmailAccounts = pgTable(
  'gmail_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
    tokenExpiresAt: timestamp('token_expires_at'),
    historyId: text('history_id'),
    watchExpiration: timestamp('watch_expiration'),
    syncStatus: varchar('sync_status', { length: 20 }).notNull().default('ACTIVE'),
    lastSyncAt: timestamp('last_sync_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('gmail_accounts_user_email_unique').on(t.userId, t.email),
    index('gmail_accounts_user_id_idx').on(t.userId),
    index('gmail_accounts_account_id_idx').on(t.accountId),
    index('gmail_accounts_status_idx').on(t.syncStatus),
  ]
);

export const gmailSyncEventStatusEnumValues = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;

export const gmailSyncEvents = pgTable(
  'gmail_sync_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gmailAccountId: uuid('gmail_account_id')
      .notNull()
      .references(() => gmailAccounts.id, { onDelete: 'cascade' }),
    historyId: text('history_id'),
    receivedAt: timestamp('received_at').notNull().defaultNow(),
    processedAt: timestamp('processed_at'),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    error: text('error'),
    payload: text('payload'),
  },
  (t) => [
    index('gmail_sync_events_account_id_idx').on(t.gmailAccountId),
    index('gmail_sync_events_status_idx').on(t.status),
    index('gmail_sync_events_received_at_idx').on(t.receivedAt),
  ]
);

export const importedEmailStatusEnumValues = ['QUEUED', 'PROCESSING', 'IMPORTED', 'SKIPPED', 'FAILED'] as const;

export const importedEmails = pgTable(
  'imported_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gmailMessageId: text('gmail_message_id').notNull(),
    gmailThreadId: text('gmail_thread_id'),
    gmailAccountId: uuid('gmail_account_id')
      .notNull()
      .references(() => gmailAccounts.id, { onDelete: 'cascade' }),
    sender: text('sender'),
    subject: text('subject'),
    receivedAt: timestamp('received_at'),
    reservationType: varchar('reservation_type', { length: 50 }),
    processingStatus: varchar('processing_status', { length: 20 }).notNull().default('QUEUED'),
    reservationId: uuid('reservation_id').references(() => reservations.id, { onDelete: 'set null' }),
    rawPayload: text('raw_payload'),
    parsedPayload: text('parsed_payload'),
    bodyHtml: text('body_html'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    unique('imported_emails_account_message_unique').on(t.gmailAccountId, t.gmailMessageId),
    index('imported_emails_account_id_idx').on(t.gmailAccountId),
    index('imported_emails_status_idx').on(t.processingStatus),
    index('imported_emails_reservation_id_idx').on(t.reservationId),
  ]
);

export const reservationImportLogs = pgTable(
  'reservation_import_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    source: varchar('source', { length: 50 }).notNull(),
    confidence: decimal('confidence', { precision: 3, scale: 2 }),
    parserUsed: varchar('parser_used', { length: 50 }),
    processingTime: decimal('processing_time', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('reservation_import_logs_reservation_id_idx').on(t.reservationId)]
);
