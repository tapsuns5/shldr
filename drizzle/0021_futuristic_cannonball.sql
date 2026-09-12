ALTER TABLE "trips" ALTER COLUMN "rank_labels" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "rank_labels" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "rank_labels" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "rank_labels" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ALTER COLUMN "rank_labels" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ALTER COLUMN "rank_labels" SET DEFAULT '{}';