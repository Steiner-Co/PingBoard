CREATE TABLE `domain_facts` (
	`monitor_id` text PRIMARY KEY NOT NULL,
	`registrar` text,
	`expiry_at` integer,
	`registered_at` integer,
	`nameservers` text DEFAULT '[]' NOT NULL,
	`statuses` text DEFAULT '[]' NOT NULL,
	`dns` text,
	`ssl_issuer` text,
	`ssl_expiry_at` integer,
	`collected_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
