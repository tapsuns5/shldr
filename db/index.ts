import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './relations';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  prepare: false,
  // Interpret PostgreSQL `timestamp without timezone` columns as UTC rather
  // than the Node process local timezone.  All application timestamps are
  // stored as naive-UTC values, so reading them as UTC preserves the
  // wall-clock components exactly.  OID 1114 = timestamp, 1082 = date.
  types: {
    timestamp: {
      to: 1114,
      from: [1114],
      serialize: (x: Date | string) =>
        x instanceof Date ? x.toISOString() : x,
      parse: (x: string) => new Date(x + '+00'),
    },
  },
});

export const db = drizzle(client, { schema: { ...schema, ...relations } });

export type DB = typeof db;
