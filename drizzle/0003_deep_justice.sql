CREATE TABLE `email_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`subscriptionType` enum('job_alerts','product_matches','property_updates','all') NOT NULL DEFAULT 'all',
	`isActive` boolean DEFAULT true,
	`unsubscribeToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_subscriptions_id` PRIMARY KEY(`id`)
);
