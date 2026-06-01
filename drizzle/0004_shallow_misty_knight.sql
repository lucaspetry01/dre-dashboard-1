CREATE TABLE `cargas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pasta` enum('IES','IJD','DAJ','MFF','IGU') NOT NULL,
	`data` date NOT NULL,
	`rota` varchar(100),
	`motorista` varchar(100),
	`valorCombustivel` decimal(10,2) DEFAULT '0',
	`litrosCombustivel` decimal(10,2) DEFAULT '0',
	`chapa1` varchar(20),
	`chapa2` varchar(20),
	`manutencao` decimal(10,2) DEFAULT '0',
	`custoOutros` decimal(10,2) DEFAULT '0',
	`valorFrete` decimal(10,2) DEFAULT '0',
	`numeroProtocolo` varchar(50),
	`custoTotal` decimal(10,2) DEFAULT '0',
	`lucro` decimal(10,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cargas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `cargas_pasta_idx` ON `cargas` (`pasta`);--> statement-breakpoint
CREATE INDEX `cargas_data_idx` ON `cargas` (`data`);--> statement-breakpoint
CREATE INDEX `cargas_rota_idx` ON `cargas` (`rota`);--> statement-breakpoint
CREATE INDEX `cargas_motorista_idx` ON `cargas` (`motorista`);