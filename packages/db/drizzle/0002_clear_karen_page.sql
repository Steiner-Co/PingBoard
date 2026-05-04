CREATE TABLE `maintenance_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`monitor_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `maintenance_windows_monitor_time_idx` ON `maintenance_windows` (`monitor_id`,`starts_at`,`ends_at`);