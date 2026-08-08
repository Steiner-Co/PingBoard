ALTER TABLE `status_pages` ADD `logo_path` text;--> statement-breakpoint
ALTER TABLE `status_pages` ADD `accent` text;--> statement-breakpoint
ALTER TABLE `status_pages` ADD `website_url` text;--> statement-breakpoint
ALTER TABLE `status_pages` ADD `hide_branding` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `status_pages` ADD `custom_css` text;