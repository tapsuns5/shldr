CREATE TYPE "public"."location_display_mode" AS ENUM('map', 'image');--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "location_display_mode" "location_display_mode" DEFAULT 'map' NOT NULL;