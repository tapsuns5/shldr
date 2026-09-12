import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { user } from './auth';

export const rankTiers = pgTable(
  'rank_tiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 20 }).notNull(),
    description: varchar('description', { length: 120 }),
    sortOrder: integer('sort_order').notNull().default(0),
    color: varchar('color', { length: 20 }),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('rank_tiers_account_label_unique').on(t.accountId, t.label),
    index('rank_tiers_account_id_idx').on(t.accountId),
    index('rank_tiers_sort_order_idx').on(t.sortOrder),
  ],
);
