import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, int, mysqlEnum, date, varchar, timestamp, decimal, text } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const cargas = mysqlTable("cargas", {
	id: int().autoincrement().notNull(),
	pasta: mysqlEnum(['IES','IJD','DAJ','MFF','IGU']).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	data: date({ mode: 'string' }).notNull(),
	rota: varchar({ length: 100 }),
	motorista: varchar({ length: 100 }),
	valorCombustivel: decimal({ precision: 10, scale: 2 }).default('0'),
	litrosCombustivel: decimal({ precision: 10, scale: 2 }).default('0'),
	chapa1: varchar({ length: 20 }),
	chapa2: varchar({ length: 20 }),
	manutencao: decimal({ precision: 10, scale: 2 }).default('0'),
	custoOutros: decimal({ precision: 10, scale: 2 }).default('0'),
	valorFrete: decimal({ precision: 10, scale: 2 }).default('0'),
	numeroProtocolo: varchar({ length: 50 }),
	custoTotal: decimal({ precision: 10, scale: 2 }).default('0'),
	lucro: decimal({ precision: 10, scale: 2 }).default('0'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	valorRetido: decimal({ precision: 10, scale: 2 }).default('0'),
	valorLiquidoFrete: decimal({ precision: 10, scale: 2 }).default('0'),
},
(table) => [
	index("cargas_pasta_idx").on(table.pasta),
	index("cargas_data_idx").on(table.data),
	index("cargas_rota_idx").on(table.rota),
	index("cargas_motorista_idx").on(table.motorista),
]);

export const categorias = mysqlTable("categorias", {
	id: int().autoincrement().notNull(),
	nome: varchar({ length: 100 }).notNull(),
	prioridade: int().notNull(),
	ativa: mysqlEnum(['sim','nao']).default('sim').notNull(),
	descricao: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("nome_idx").on(table.nome),
	index("prioridade_idx").on(table.prioridade),
]);

export const regrasCategorias = mysqlTable("regras_categorias", {
	id: int().autoincrement().notNull(),
	categoriaId: int().notNull(),
	tipo: mysqlEnum(['KEYWORD','REGEX','NOME_EXATO']).notNull(),
	valor: text().notNull(),
	ativa: mysqlEnum(['sim','nao']).default('sim').notNull(),
	descricao: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("categoriaId_idx").on(table.categoriaId),
	index("tipo_idx").on(table.tipo),
]);

export const transacoes = mysqlTable("transacoes", {
	id: int().autoincrement().notNull(),
	data: varchar({ length: 10 }).notNull(),
	dataTimestamp: timestamp({ mode: 'string' }).notNull(),
	descricao: text().notNull(),
	documento: varchar({ length: 64 }).default(''),
	valor: decimal({ precision: 15, scale: 2 }).notNull(),
	saldo: decimal({ precision: 15, scale: 2 }).default('0'),
	tipo: mysqlEnum(['entrada','saida']).notNull(),
	categoria: varchar({ length: 100 }).default('OUTROS').notNull(),
	hashUnico: varchar({ length: 64 }).notNull(),
	uploadId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("data_idx").on(table.dataTimestamp),
	index("categoria_idx").on(table.categoria),
]);

export const uploads = mysqlTable("uploads", {
	id: int().autoincrement().notNull(),
	nomeArquivo: varchar({ length: 255 }).notNull(),
	totalProcessado: int().default(0).notNull(),
	totalNovos: int().default(0).notNull(),
	totalDuplicatas: int().default(0).notNull(),
	periodoInicio: varchar({ length: 10 }),
	periodoFim: varchar({ length: 10 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	saldoFinal: decimal({ precision: 15, scale: 2 }).default('0'),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});
