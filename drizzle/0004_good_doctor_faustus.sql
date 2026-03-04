CREATE TABLE `job_search_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`searchName` varchar(255) NOT NULL,
	`targetPosition` varchar(255) NOT NULL,
	`targetCity` varchar(100) NOT NULL,
	`targetCountry` varchar(100) DEFAULT 'US',
	`salaryMin` int,
	`salaryMax` int,
	`salaryCurrency` varchar(10) DEFAULT 'USD',
	`minMatchScore` int DEFAULT 70,
	`isActive` boolean DEFAULT true,
	`lastNotificationSent` timestamp,
	`notificationFrequency` enum('daily','weekly','immediately') DEFAULT 'daily',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_search_subscriptions_id` PRIMARY KEY(`id`)
);
