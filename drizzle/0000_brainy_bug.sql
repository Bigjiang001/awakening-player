CREATE TABLE `companion_links` (
	`code` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`partner_email` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`joined_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companion_links_owner_email_unique` ON `companion_links` (`owner_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `companion_links_partner_email_unique` ON `companion_links` (`partner_email`);--> statement-breakpoint
CREATE TABLE `player_saves` (
	`user_email` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
