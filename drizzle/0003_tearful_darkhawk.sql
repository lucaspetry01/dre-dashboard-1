CREATE TABLE `abastecimentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pasta` enum('IES','IJD','DAJ','MFF','IGU') NOT NULL,
	`data` date NOT NULL,
	`placa` varchar(20) NOT NULL,
	`rota` varchar(100),
	`motorista` varchar(100),
	`protocolo` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `abastecimentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `pasta_idx` ON `abastecimentos` (`pasta`);--> statement-breakpoint
CREATE INDEX `data_idx` ON `abastecimentos` (`data`);--> statement-breakpoint
CREATE INDEX `placa_idx` ON `abastecimentos` (`placa`);