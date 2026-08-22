import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  bigint,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { trips } from './trips';

export const documentTypeEnum = pgEnum('document_type', [
  'passport',
  'visa',
  'ticket',
  'insurance',
  'hotel',
  'receipt',
  'other',
]);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileUrl: text('file_url').notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    documentType: documentTypeEnum('document_type').notNull().default('other'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('documents_trip_id_idx').on(t.tripId),
    index('documents_document_type_idx').on(t.documentType),
  ]
);
