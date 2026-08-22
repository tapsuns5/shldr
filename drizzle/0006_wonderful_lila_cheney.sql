CREATE TABLE "gmail_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"token_expires_at" timestamp,
	"history_id" text,
	"watch_expiration" timestamp,
	"sync_status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gmail_accounts_user_email_unique" UNIQUE("user_id","email")
);
--> statement-breakpoint
CREATE TABLE "gmail_sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gmail_account_id" uuid NOT NULL,
	"history_id" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"error" text,
	"payload" text
);
--> statement-breakpoint
CREATE TABLE "imported_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gmail_message_id" text NOT NULL,
	"gmail_thread_id" text,
	"gmail_account_id" uuid NOT NULL,
	"sender" text,
	"subject" text,
	"received_at" timestamp,
	"reservation_type" varchar(50),
	"processing_status" varchar(20) DEFAULT 'QUEUED' NOT NULL,
	"reservation_id" uuid,
	"raw_payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "imported_emails_account_message_unique" UNIQUE("gmail_account_id","gmail_message_id")
);
--> statement-breakpoint
CREATE TABLE "reservation_import_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"source" varchar(50) NOT NULL,
	"confidence" numeric(3, 2),
	"parser_used" varchar(50),
	"processing_time" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gmail_accounts" ADD CONSTRAINT "gmail_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_accounts" ADD CONSTRAINT "gmail_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_sync_events" ADD CONSTRAINT "gmail_sync_events_gmail_account_id_gmail_accounts_id_fk" FOREIGN KEY ("gmail_account_id") REFERENCES "public"."gmail_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_emails" ADD CONSTRAINT "imported_emails_gmail_account_id_gmail_accounts_id_fk" FOREIGN KEY ("gmail_account_id") REFERENCES "public"."gmail_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_emails" ADD CONSTRAINT "imported_emails_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_import_logs" ADD CONSTRAINT "reservation_import_logs_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gmail_accounts_user_id_idx" ON "gmail_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gmail_accounts_account_id_idx" ON "gmail_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "gmail_accounts_status_idx" ON "gmail_accounts" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "gmail_sync_events_account_id_idx" ON "gmail_sync_events" USING btree ("gmail_account_id");--> statement-breakpoint
CREATE INDEX "gmail_sync_events_status_idx" ON "gmail_sync_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gmail_sync_events_received_at_idx" ON "gmail_sync_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "imported_emails_account_id_idx" ON "imported_emails" USING btree ("gmail_account_id");--> statement-breakpoint
CREATE INDEX "imported_emails_status_idx" ON "imported_emails" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "imported_emails_reservation_id_idx" ON "imported_emails" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "reservation_import_logs_reservation_id_idx" ON "reservation_import_logs" USING btree ("reservation_id");