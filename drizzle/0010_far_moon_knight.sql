ALTER TABLE `cargas` ADD `tipo` enum('SAO_LEO','ESTEIO') DEFAULT 'SAO_LEO' NOT NULL;--> statement-breakpoint
CREATE INDEX `cargas_tipo_idx` ON `cargas` (`tipo`);