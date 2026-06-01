import { date, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, index, unique } from "drizzle-orm/mysql-core";

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
  /** Saldo final da conta conforme OFX */
  saldoFinal: decimal("saldoFinal", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

/**
 * Tabela de categorias de transações.
 * Define as categorias disponíveis e sua ordem de prioridade.
 */
export const categorias = mysqlTable(
  "categorias",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Nome da categoria (ex: PAGAMENTOS, COMBUSTÍVEL / POSTO) */
    nome: varchar("nome", { length: 100 }).notNull(),
    /** Ordem de prioridade na categorização (menor = maior prioridade) */
    prioridade: int("prioridade").notNull(),
    /** Se a categoria está ativa ou não */
    ativa: mysqlEnum("ativa", ["sim", "nao"]).default("sim").notNull(),
    /** Descrição da categoria */
    descricao: text("descricao"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nomeIdx: index("nome_idx").on(table.nome),
    prioridadeIdx: index("prioridade_idx").on(table.prioridade),
  })
);

export type Categoria = typeof categorias.$inferSelect;
export type InsertCategoria = typeof categorias.$inferInsert;

/**
 * Tabela de regras de categorização.
 * Define as palavras-chave, regex ou nomes que disparam cada categoria.
 */
export const regrasCategorias = mysqlTable(
  "regras_categorias",
  {
    id: int("id").autoincrement().primaryKey(),
    /** ID da categoria que esta regra ativa */
    categoriaId: int("categoriaId").notNull(),
    /** Tipo de regra: KEYWORD (substring), REGEX (expressão regular), NOME_EXATO */
    tipo: mysqlEnum("tipo", ["KEYWORD", "REGEX", "NOME_EXATO"]).notNull(),
    /** Valor da regra (palavra-chave, padrão regex, ou nome exato) */
    valor: text("valor").notNull(),
    /** Se a regra está ativa */
    ativa: mysqlEnum("ativa", ["sim", "nao"]).default("sim").notNull(),
    /** Descrição da regra para referência */
    descricao: text("descricao"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    categoriaIdIdx: index("categoriaId_idx").on(table.categoriaId),
    tipoIdx: index("tipo_idx").on(table.tipo),
  })
);

export type RegraCategoria = typeof regrasCategorias.$inferSelect;
export type InsertRegraCategoria = typeof regrasCategorias.$inferInsert;

/**
 * Tabela de abastecimentos de combustível.
 * Registra cada abastecimento com data, placa, rota, motorista e protocolo.
 * Organizado por pasta (IES, IJD, DAJ, MFF, IGU).
 */
export const abastecimentos = mysqlTable(
  "abastecimentos",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Pasta/categoria: IES, IJD, DAJ, MFF, IGU */
    pasta: mysqlEnum("pasta", ["IES", "IJD", "DAJ", "MFF", "IGU"]).notNull(),
    /** Data do abastecimento no formato YYYY-MM-DD */
    data: date("data").notNull(),
    /** Placa do veículo */
    placa: varchar("placa", { length: 20 }).notNull(),
    /** Rota/trajeto */
    rota: varchar("rota", { length: 100 }),
    /** Nome do motorista */
    motorista: varchar("motorista", { length: 100 }),
    /** Número do protocolo/comprovante */
    protocolo: varchar("protocolo", { length: 50 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    pastaIdx: index("pasta_idx").on(table.pasta),
    dataIdx: index("data_idx").on(table.data),
    placaIdx: index("placa_idx").on(table.placa),
  })
);

export type Abastecimento = typeof abastecimentos.$inferSelect;
export type InsertAbastecimento = typeof abastecimentos.$inferInsert;

/**
 * Tabela de cargas por rota.
 * Registra custos e receitas de cada carga transportada.
 * Permite gestão de lucro por rota e motorista.
 */
export const cargas = mysqlTable(
  "cargas",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Pasta/categoria: IES, IJD, DAJ, MFF, IGU */
    pasta: mysqlEnum("pasta", ["IES", "IJD", "DAJ", "MFF", "IGU"]).notNull(),
    /** Data da carga no formato YYYY-MM-DD */
    data: date("data").notNull(),
    /** Nome da rota/trajeto */
    rota: varchar("rota", { length: 100 }),
    /** Nome do motorista responsável */
    motorista: varchar("motorista", { length: 100 }),
    
    /** Combustível - valor gasto */
    valorCombustivel: decimal("valorCombustivel", { precision: 10, scale: 2 }).default("0"),
    /** Combustível - litros abastecidos */
    litrosCombustivel: decimal("litrosCombustivel", { precision: 10, scale: 2 }).default("0"),
    
    /** Placa do primeiro veículo */
    chapa1: varchar("chapa1", { length: 20 }),
    /** Placa do segundo veículo (opcional) */
    chapa2: varchar("chapa2", { length: 20 }),
    
    /** Custo de manutenção */
    manutencao: decimal("manutencao", { precision: 10, scale: 2 }).default("0"),
    /** Outros custos */
    custoOutros: decimal("custoOutros", { precision: 10, scale: 2 }).default("0"),
    
    /** Valor do frete/receita */
    valorFrete: decimal("valorFrete", { precision: 10, scale: 2 }).default("0"),
    
    /** Valor retido (10% do valorFrete) */
    valorRetido: decimal("valorRetido", { precision: 10, scale: 2 }).default("0"),
    
    /** Valor líquido do frete (valorFrete - valorRetido) */
    valorLiquidoFrete: decimal("valorLiquidoFrete", { precision: 10, scale: 2 }).default("0"),
    
    /** Número do protocolo/comprovante */
    numeroProtocolo: varchar("numeroProtocolo", { length: 50 }),
    
    /** Custo total calculado: combustível + manutenção + custoOutros */
    custoTotal: decimal("custoTotal", { precision: 10, scale: 2 }).default("0"),
    /** Lucro calculado: valorLiquidoFrete - custoTotal */
    lucro: decimal("lucro", { precision: 10, scale: 2 }).default("0"),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    pastaIdx: index("cargas_pasta_idx").on(table.pasta),
    dataIdx: index("cargas_data_idx").on(table.data),
    rotaIdx: index("cargas_rota_idx").on(table.rota),
    motoristaIdx: index("cargas_motorista_idx").on(table.motorista),
  })
);

export type Carga = typeof cargas.$inferSelect;
export type InsertCarga = typeof cargas.$inferInsert;
