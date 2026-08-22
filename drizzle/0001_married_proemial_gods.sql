CREATE TYPE "public"."tripit_feed_status" AS ENUM('active', 'paused', 'error');--> statement-breakpoint
CREATE TABLE "tripit_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"ical_url" text NOT NULL,
	"status" "tripit_feed_status" DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tripit_feeds_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "external_uid" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "external_source" varchar(50);--> statement-breakpoint
ALTER TABLE "tripit_feeds" ADD CONSTRAINT "tripit_feeds_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tripit_feeds_account_id_idx" ON "tripit_feeds" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "trips_external_uid_idx" ON "trips" USING btree ("external_uid");