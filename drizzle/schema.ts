import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, index, unique } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de transações financeiras.
 * Armazena cada lançamento individual do extrato bancário.
 * Suporta dados retroativos de qualquer período.
 */
export const transacoes = mysqlTable(
  "transacoes",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Data da transação no formato DD/MM/YYYY */
    data: varchar("data", { length: 10 }).notNull(),
    /** Data como timestamp para ordenação e filtros eficientes */
    dataTimestamp: timestamp("dataTimestamp").notNull(),
    /** Descrição original da transação */
    descricao: text("descricao").notNull(),
    /** Documento/identificador da transação */
    documento: varchar("documento", { length: 64 }).default(""),
    /** Valor da transação (negativo para saída, positivo para entrada) */
    valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
    /** Saldo após a transação */
    saldo: decimal("saldo", { precision: 15, scale: 2 }).default("0"),
    /** Tipo: entrada ou saida */
    tipo: mysqlEnum("tipo", ["entrada", "saida"]).notNull(),
    /** Categoria atribuída pela lógica de categorização */
    categoria: varchar("categoria", { length: 100 }).notNull().default("OUTROS"),
    /** Hash único: data + descricao + valor — previne duplicatas */
    hashUnico: varchar("hashUnico", { length: 64 }).notNull(),
    /** Referência ao upload que originou esta transação */
    uploadId: int("uploadId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    hashUnicoIdx: unique("hashUnico_unique").on(table.hashUnico),
    dataIdx: index("data_idx").on(table.dataTimestamp),
    categoriaIdx: index("categoria_idx").on(table.categoria),
  })
);

export type Transacao = typeof transacoes.$inferSelect;
export type InsertTransacao = typeof transacoes.$inferInsert;

/**
 * Histórico de uploads de arquivos XLS.
 * Permite auditoria de quando e quantos registros foram importados.
 */
export const uploads = mysqlTable("uploads", {
  id: int("id").autoincrement().primaryKey(),
  /** Nome original do arquivo */
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  /** Total de linhas processadas */
  totalProcessado: int("totalProcessado").notNull().default(0),
  /** Quantos foram inseridos como novos */
  totalNovos: int("totalNovos").notNull().default(0),
  /** Quantos foram detectados como duplicatas */
  totalDuplicatas: int("totalDuplicatas").notNull().default(0),
  /** Período inicial das transações (menor data) */
  periodoInicio: varchar("periodoInicio", { length: 10 }),
  /** Período final das transações (maior data) */
  periodoFim: varchar("periodoFim", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;
