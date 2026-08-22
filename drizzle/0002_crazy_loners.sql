CREATE TYPE "public"."trip_invite_role" AS ENUM('editor', 'viewer', 'traveler');--> statement-breakpoint
CREATE TYPE "public"."trip_invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TABLE "trip_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"email" varchar(255),
	"token" text NOT NULL,
	"role" "trip_invite_role" DEFAULT 'viewer' NOT NULL,
	"status" "trip_invite_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_by_user_id" text,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trip_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "trip_invites" ADD CONSTRAINT "trip_invites_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_invites" ADD CONSTRAINT "trip_invites_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_invites" ADD CONSTRAINT "trip_invites_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_invites_trip_id_idx" ON "trip_invites" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_invites_token_idx" ON "trip_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "trip_invites_email_idx" ON "trip_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "trip_invites_invited_by_idx" ON "trip_invites" USING btree ("invited_by_user_id");