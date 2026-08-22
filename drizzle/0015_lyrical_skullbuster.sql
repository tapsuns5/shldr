ALTER TABLE "wishlist_destinations" ALTER COLUMN "city" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ADD COLUMN "type" varchar(10) DEFAULT 'city' NOT NULL;--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ADD COLUMN "visited_at" timestamp;