CREATE TABLE `categorias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`prioridade` int NOT NULL,
	`ativa` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`descricao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categorias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regras_categorias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoriaId` int NOT NULL,
	`tipo` enum('KEYWORD','REGEX','NOME_EXATO') NOT NULL,
	`valor` text NOT NULL,
	`ativa` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`descricao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regras_categorias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `nome_idx` ON `categorias` (`nome`);--> statement-breakpoint
CREATE INDEX `prioridade_idx` ON `categorias` (`prioridade`);--> statement-breakpoint
CREATE INDEX `categoriaId_idx` ON `regras_categorias` (`categoriaId`);--> statement-breakpoint
CREATE INDEX `tipo_idx` ON `regras_categorias` (`tipo`);