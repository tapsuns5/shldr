import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  bigint,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { accounts } from './accounts';

export const userTravelDocFieldTypeEnum = pgEnum('user_travel_doc_field_type', [
  'text',
  'file',
]);

export const userTravelDocs = pgTable(
  'user_travel_docs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    label: varchar('label', { length: 255 }).notNull(),
    fieldType: userTravelDocFieldTypeEnum('field_type').notNull(),
    valueEncrypted: text('value_encrypted'),
    fileUrl: text('file_url'),
    fileName: varchar('file_name', { length: 255 }),
    mimeType: varchar('mime_type', { length: 255 }),
    size: bigint('size', { mode: 'number' }),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('user_travel_docs_account_id_idx').on(t.accountId),
    index('user_travel_docs_user_id_idx').on(t.userId),
    uniqueIndex('user_travel_docs_account_user_label_uniq').on(t.accountId, t.userId, t.label),
  ]
);
