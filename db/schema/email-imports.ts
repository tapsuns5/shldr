import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const emailProviderEnum = pgEnum('email_provider', ['gmail', 'outlook']);

export const emailImportStatusEnum = pgEnum('email_import_status', [
  'active',
  'paused',
  'error',
]);

export const emailImports = pgTable(
  'email_imports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    provider: emailProviderEnum('provider').notNull(),
    status: emailImportStatusEnum('status').notNull().default('active'),
    lastSyncAt: timestamp('last_sync_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('email_imports_account_id_idx').on(t.accountId)]
);
