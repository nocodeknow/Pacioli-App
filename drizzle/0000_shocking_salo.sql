CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`is_group` integer DEFAULT false NOT NULL,
	`parent_id` text,
	`path` text NOT NULL,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`opening_date` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`last_reconciled_date` text,
	`notes` text,
	FOREIGN KEY (`parent_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_path_unique` ON `accounts` (`path`);--> statement-breakpoint
CREATE TABLE `connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`sheet_id` text,
	`range` text,
	`last_synced_at` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`sheet_mappings` text
);
--> statement-breakpoint
CREATE TABLE `postings` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` real NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_records` (
	`id` text PRIMARY KEY NOT NULL,
	`connector_id` text NOT NULL,
	`raw_payload` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transaction_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`source_record_id` text NOT NULL,
	`date` text,
	`amount` real,
	`description` text,
	`suggested_account` text,
	`suggested_category` text,
	`notes` text,
	`status` text NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`source_record_id`) REFERENCES `source_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`suggested_account`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`suggested_category`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`notes` text
);
