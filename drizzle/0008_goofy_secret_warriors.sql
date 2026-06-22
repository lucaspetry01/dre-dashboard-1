ALTER TABLE `transacoes` ADD `banco` varchar(50) DEFAULT 'DESCONHECIDO';--> statement-breakpoint
ALTER TABLE `transacoes` ADD `conta` varchar(50) DEFAULT '';--> statement-breakpoint
ALTER TABLE `transacoes` ADD `cnpj` varchar(20) DEFAULT '';