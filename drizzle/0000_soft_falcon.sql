CREATE TABLE `transacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`data` varchar(10) NOT NULL,
	`dataTimestamp` timestamp NOT NULL,
	`descricao` text NOT NULL,
	`documento` varchar(64) DEFAULT '',
	`valor` decimal(15,2) NOT NULL,
	`saldo` decimal(15,2) DEFAULT '0',
	`tipo` enum('entrada','saida') NOT NULL,
	`categoria` varchar(100) NOT NULL DEFAULT 'OUTROS',
	`hashUnico` varchar(64) NOT NULL,
	`uploadId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transacoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `hashUnico_unique` UNIQUE(`hashUnico`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`totalProcessado` int NOT NULL DEFAULT 0,
	`totalNovos` int NOT NULL DEFAULT 0,
	`totalDuplicatas` int NOT NULL DEFAULT 0,
	`periodoInicio` varchar(10),
	`periodoFim` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `data_idx` ON `transacoes` (`dataTimestamp`);--> statement-breakpoint
CREATE INDEX `categoria_idx` ON `transacoes` (`categoria`);