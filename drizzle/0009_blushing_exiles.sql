CREATE TABLE `protocolos_sincronizados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroProtocolo` varchar(50) NOT NULL,
	`data` date NOT NULL,
	`valorFrete` decimal(10,2) NOT NULL,
	`pesoTotal` decimal(10,2) NOT NULL,
	`clientes` text NOT NULL,
	`motorista` varchar(100),
	`gmailMessageId` varchar(255) NOT NULL,
	`pdfUrl` text,
	`sinronizadoEm` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`cargaId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `protocolos_sincronizados_id` PRIMARY KEY(`id`),
	CONSTRAINT `protocolos_sincronizados_numeroProtocolo_unique` UNIQUE(`numeroProtocolo`)
);
--> statement-breakpoint
CREATE INDEX `protocolo_numero_idx` ON `protocolos_sincronizados` (`numeroProtocolo`);--> statement-breakpoint
CREATE INDEX `protocolo_data_idx` ON `protocolos_sincronizados` (`data`);