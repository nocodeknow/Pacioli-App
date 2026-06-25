CREATE SCHEMA IF NOT EXISTS "pacioli";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pacioli"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"type" text NOT NULL,
	"opening_balance" numeric NOT NULL,
	"opening_date" date NOT NULL,
	"parent_group" text,
	"parent_account" uuid,
	"archived" boolean DEFAULT false NOT NULL,
	"last_reconciled_date" date,
	"notes" text,
	CONSTRAINT "accounts_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pacioli"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"parent_category" uuid,
	"archived" boolean DEFAULT false NOT NULL,
	"notes" text,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pacioli"."connectors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"sheet_id" text,
	"range" text,
	"last_synced_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"sheet_mappings" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pacioli"."preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'dark' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pacioli"."source_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_id" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pacioli"."transaction_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_record_id" uuid NOT NULL,
	"date" date,
	"amount" numeric,
	"description" text,
	"suggested_account" uuid,
	"suggested_category" uuid,
	"notes" text,
	"status" text NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pacioli"."transaction_candidates" ADD CONSTRAINT "transaction_candidates_source_record_id_source_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "pacioli"."source_records"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pacioli"."transaction_candidates" ADD CONSTRAINT "transaction_candidates_suggested_account_accounts_id_fk" FOREIGN KEY ("suggested_account") REFERENCES "pacioli"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pacioli"."transaction_candidates" ADD CONSTRAINT "transaction_candidates_suggested_category_categories_id_fk" FOREIGN KEY ("suggested_category") REFERENCES "pacioli"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
