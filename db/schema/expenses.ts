import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  decimal,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { trips } from './trips';
import { travelers } from './travelers';

export const expenseCategoryEnum = pgEnum('expense_category', [
  'lodging',
  'food',
  'transportation',
  'activities',
  'shopping',
  'other',
]);

export const tripExpenses = pgTable(
  'trip_expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull(),
    paidByTravelerId: uuid('paid_by_traveler_id').references(
      () => travelers.id,
      { onDelete: 'set null' }
    ),
    expenseDate: date('expense_date').notNull(),
    category: expenseCategoryEnum('category').notNull().default('other'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('trip_expenses_trip_id_idx').on(t.tripId),
    index('trip_expenses_expense_date_idx').on(t.expenseDate),
  ]
);
