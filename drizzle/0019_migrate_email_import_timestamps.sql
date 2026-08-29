-- Convert email_import reservation timestamps from server-local-UTC to naive-UTC.
--
-- Before the parser fix, parseEmailDate used `new Date(y, m, d, h, min)` which
-- interpreted wall-clock times in the server's local timezone (America/New_York),
-- producing UTC instants.  The `timestamp` (without tz) column stored the UTC
-- wall-clock components (e.g. 7:30 PM EDT → 23:30 stored).
--
-- The new parser uses Date.UTC(...) so the wall-clock time is stored directly
-- (e.g. 7:30 PM → 19:30 stored).  This migration shifts existing email_import
-- rows back to the original wall-clock time by interpreting the stored value
-- as a UTC instant and converting to America/New_York.
--
-- `timestamp AT TIME ZONE 'UTC'`        → treats naive timestamp as UTC → timestamptz
-- `(...) AT TIME ZONE 'America/New_York'` → converts to NY wall-clock → naive timestamp
UPDATE "reservations"
SET
  "start_date_time" = ("start_date_time" AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York',
  "end_date_time" = CASE
    WHEN "end_date_time" IS NOT NULL
    THEN ("end_date_time" AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York'
    ELSE "end_date_time"
  END,
  "updated_at" = NOW()
WHERE "source" = 'email_import';
