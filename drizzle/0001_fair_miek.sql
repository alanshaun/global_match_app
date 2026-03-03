CREATE TABLE `cold_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyMatchId` int NOT NULL,
	`productSubmissionId` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`emailBody` text NOT NULL,
	`language` varchar(10) DEFAULT 'en',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cold_emails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productSubmissionId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`companyWebsite` varchar(500),
	`companyLinkedin` varchar(500),
	`companyDescription` text,
	`matchScore` decimal(5,2),
	`matchReason` text,
	`contactEmail` varchar(255),
	`contactPhone` varchar(20),
	`contactName` varchar(255),
	`contactTitle` varchar(100),
	`contactSource` enum('official_website','linkedin','other') DEFAULT 'official_website',
	`coldEmailGenerated` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resumeUploadId` int NOT NULL,
	`jobTitle` varchar(255) NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`companyWebsite` varchar(500),
	`jobLocation` varchar(255) NOT NULL,
	`jobCity` varchar(100),
	`jobCountry` varchar(100),
	`salaryMin` int,
	`salaryMax` int,
	`salaryCurrency` varchar(10) DEFAULT 'USD',
	`jobDescription` text,
	`jobRequirements` text,
	`matchScore` decimal(5,2),
	`matchReason` text,
	`jobSource` enum('indeed','linkedin','boss','other') NOT NULL,
	`jobUrl` varchar(500) NOT NULL,
	`publishedDate` timestamp,
	`expiryDate` timestamp,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`productDescription` text NOT NULL,
	`productCategory` varchar(100),
	`productSpecs` json,
	`productImages` json,
	`targetCountries` json,
	`numberOfCompanies` int DEFAULT 10,
	`aiAnalysis` text,
	`status` enum('pending','analyzing','completed','failed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resume_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resumeFileName` varchar(255) NOT NULL,
	`resumeFileUrl` varchar(500) NOT NULL,
	`resumeFileKey` varchar(500) NOT NULL,
	`resumeText` text,
	`parsedData` json,
	`targetPosition` varchar(255) NOT NULL,
	`targetCity` varchar(100) NOT NULL,
	`targetCountry` varchar(100),
	`salaryMin` int,
	`salaryMax` int,
	`salaryCurrency` varchar(10) DEFAULT 'USD',
	`status` enum('pending','parsing','completed','failed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resume_uploads_id` PRIMARY KEY(`id`)
);
