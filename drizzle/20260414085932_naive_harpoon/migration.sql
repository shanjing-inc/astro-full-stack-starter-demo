CREATE TABLE `order` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`shop_id` int NOT NULL,
	`product_id` int NOT NULL,
	`order_no` varchar(64) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price_in_cents` int NOT NULL,
	`total_amount_in_cents` int NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`remark` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_order_no_unique` UNIQUE INDEX(`order_no`)
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`shop_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sku` varchar(64) NOT NULL,
	`price_in_cents` int NOT NULL,
	`inventory_count` int NOT NULL DEFAULT 0,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_shop_sku_unique` UNIQUE INDEX(`shop_id`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `shop` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_slug_unique` UNIQUE INDEX(`slug`)
);
--> statement-breakpoint
CREATE INDEX `order_shop_id_idx` ON `order` (`shop_id`);--> statement-breakpoint
CREATE INDEX `order_product_id_idx` ON `order` (`product_id`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `order` (`status`);--> statement-breakpoint
CREATE INDEX `product_shop_id_idx` ON `product` (`shop_id`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `product` (`status`);--> statement-breakpoint
CREATE INDEX `shop_status_idx` ON `shop` (`status`);--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_shop_id_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shop`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_product_id_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `product` ADD CONSTRAINT `product_shop_id_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shop`(`id`) ON DELETE CASCADE;
