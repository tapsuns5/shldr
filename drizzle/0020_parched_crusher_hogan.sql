CREATE TABLE "rank_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"label" varchar(20) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"color" varchar(20),
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rank_tiers_account_label_unique" UNIQUE("account_id","label")
);
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "rank_tier" varchar(20);--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "rank_order" integer;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "rank_labels" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "rank_tier" varchar(20);--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "rank_order" integer;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "rank_labels" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ADD COLUMN "rank_tier" varchar(20);--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ADD COLUMN "rank_order" integer;--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ADD COLUMN "rank_labels" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "rank_tiers" ADD CONSTRAINT "rank_tiers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rank_tiers" ADD CONSTRAINT "rank_tiers_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rank_tiers_account_id_idx" ON "rank_tiers" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "rank_tiers_sort_order_idx" ON "rank_tiers" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "trips_rank_tier_idx" ON "trips" USING btree ("rank_tier");--> statement-breakpoint
CREATE INDEX "reservations_rank_tier_idx" ON "reservations" USING btree ("rank_tier");--> statement-breakpoint
CREATE INDEX "wishlist_destinations_rank_tier_idx" ON "wishlist_destinations" USING btree ("rank_tier");