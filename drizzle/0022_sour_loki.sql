CREATE TABLE "ranked_cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"city" varchar(255) NOT NULL,
	"state" varchar(255) DEFAULT '' NOT NULL,
	"country" varchar(255) NOT NULL,
	"normalized_city" varchar(255) NOT NULL,
	"normalized_state" varchar(255) DEFAULT '' NOT NULL,
	"normalized_country" varchar(255) NOT NULL,
	"rank_order" integer,
	"rank_tier_id" uuid,
	"rank_labels" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ranked_cities_account_location_unique" UNIQUE("account_id","normalized_city","normalized_state","normalized_country")
);
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "rank_tier_id" uuid;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "rank_tier_id" uuid;--> statement-breakpoint
ALTER TABLE "rank_tiers" ADD COLUMN "description" varchar(120);--> statement-breakpoint
UPDATE "trips" SET "rank_tier_id" = "rank_tiers"."id" FROM "rank_tiers" WHERE "trips"."account_id" = "rank_tiers"."account_id" AND "trips"."rank_tier" = "rank_tiers"."label";--> statement-breakpoint
UPDATE "reservations" SET "rank_tier_id" = "rank_tiers"."id" FROM "rank_tiers", "trips" WHERE "reservations"."trip_id" = "trips"."id" AND "trips"."account_id" = "rank_tiers"."account_id" AND "reservations"."rank_tier" = "rank_tiers"."label";--> statement-breakpoint
ALTER TABLE "ranked_cities" ADD CONSTRAINT "ranked_cities_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranked_cities" ADD CONSTRAINT "ranked_cities_rank_tier_id_rank_tiers_id_fk" FOREIGN KEY ("rank_tier_id") REFERENCES "public"."rank_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ranked_cities_account_id_idx" ON "ranked_cities" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "ranked_cities_rank_tier_id_idx" ON "ranked_cities" USING btree ("rank_tier_id");--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_rank_tier_id_rank_tiers_id_fk" FOREIGN KEY ("rank_tier_id") REFERENCES "public"."rank_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_rank_tier_id_rank_tiers_id_fk" FOREIGN KEY ("rank_tier_id") REFERENCES "public"."rank_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trips_rank_tier_id_idx" ON "trips" USING btree ("rank_tier_id");--> statement-breakpoint
CREATE INDEX "reservations_rank_tier_id_idx" ON "reservations" USING btree ("rank_tier_id");