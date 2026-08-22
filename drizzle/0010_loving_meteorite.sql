CREATE TYPE "public"."user_travel_doc_field_type" AS ENUM('text', 'file');--> statement-breakpoint
CREATE TABLE "user_travel_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_by" text NOT NULL,
	"label" varchar(255) NOT NULL,
	"field_type" "user_travel_doc_field_type" NOT NULL,
	"value_encrypted" text,
	"file_url" text,
	"file_name" varchar(255),
	"mime_type" varchar(255),
	"size" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_travel_docs" ADD CONSTRAINT "user_travel_docs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_travel_docs" ADD CONSTRAINT "user_travel_docs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_travel_docs" ADD CONSTRAINT "user_travel_docs_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_travel_docs_account_id_idx" ON "user_travel_docs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "user_travel_docs_user_id_idx" ON "user_travel_docs" USING btree ("user_id");