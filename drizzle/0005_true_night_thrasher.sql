ALTER TABLE `company_matches` MODIFY COLUMN `contactSource` varchar(100) DEFAULT 'official_website';--> statement-breakpoint
ALTER TABLE `product_submissions` MODIFY COLUMN `aiAnalysis` longtext;