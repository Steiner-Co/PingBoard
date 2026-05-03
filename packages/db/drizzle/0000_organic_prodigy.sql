CREATE TABLE `daily_stats` (
	`monitor_id` text NOT NULL,
	`date` text NOT NULL,
	`uptime_pct` real NOT NULL,
	`avg_response_ms` real,
	`incidents_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`monitor_id`, `date`),
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `heartbeats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`monitor_id` text NOT NULL,
	`status` text NOT NULL,
	`response_time_ms` integer,
	`status_code` integer,
	`message` text,
	`checked_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `heartbeats_monitor_checked_idx` ON `heartbeats` (`monitor_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`monitor_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`resolved_at` integer,
	`cause` text DEFAULT 'auto' NOT NULL,
	`note` text,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `monitor_channels` (
	`monitor_id` text NOT NULL,
	`channel_id` text NOT NULL,
	PRIMARY KEY(`monitor_id`, `channel_id`),
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `notification_channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `monitors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`target` text NOT NULL,
	`interval_seconds` integer DEFAULT 60 NOT NULL,
	`timeout_seconds` integer DEFAULT 10 NOT NULL,
	`retry_count` integer DEFAULT 1 NOT NULL,
	`config` text NOT NULL,
	`paused` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`config` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `status_page_monitors` (
	`status_page_id` text NOT NULL,
	`monitor_id` text NOT NULL,
	`group_name` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`status_page_id`, `monitor_id`),
	FOREIGN KEY (`status_page_id`) REFERENCES `status_pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `status_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`theme` text DEFAULT 'auto' NOT NULL,
	`password_hash` text,
	`custom_domain` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `status_pages_slug_idx` ON `status_pages` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);