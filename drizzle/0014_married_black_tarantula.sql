CREATE TABLE "wishlist_destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"city" varchar(255) NOT NULL,
	"country" varchar(255) NOT NULL,
	"country_code" varchar(2),
	"lat" double precision,
	"lng" double precision,
	"note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ADD CONSTRAINT "wishlist_destinations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ADD CONSTRAINT "wishlist_destinations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wishlist_destinations_account_id_idx" ON "wishlist_destinations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "wishlist_destinations_created_by_idx" ON "wishlist_destinations" USING btree ("created_by");