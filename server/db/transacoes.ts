import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { transacoes, uploads, type InsertTransacao, type InsertUpload } from '../../drizzle/schema';

/**
 * Verifica quais hashes já existem no banco.
 * Retorna conjunto de hashes existentes para deduplicação eficiente.
 */
export async function getExistingHashes(hashes: string[]): Promise<Set<string>> {
  const db = await getDb();
  if (!db || hashes.length === 0) return new Set();

  const result = await db
    .select({ hashUnico: transacoes.hashUnico })
    .from(transacoes)
    .where(sql`${transacoes.hashUnico} IN (${sql.join(hashes.map((h) => sql`${h}`), sql`, `)})`);

  return new Set(result.map((r) => r.hashUnico));
}

/**
 * Insere transações em lote, ignorando duplicatas (ON DUPLICATE KEY UPDATE no-op).
 */
export async function insertTransacoes(
  rows: InsertTransacao[]
): Promise<number> {
  const db = await getDb();
  if (!db || rows.length === 0) return 0;

  // MySQL: usar ON DUPLICATE KEY UPDATE para ignorar duplicatas via hashUnico
  await db
    .insert(transacoes)
    .values(rows)
    .onDuplicateKeyUpdate({
      // Atualiza apenas hashUnico para si mesmo (no-op efetivo, mantém registro existente)
      set: { hashUnico: sql`${transacoes.hashUnico}` },
    });

  return rows.length;
}

/**
 * Cria um registro de upload e retorna o ID.
 */
export async function createUpload(data: InsertUpload): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(uploads).values(data);
  // MySQL Drizzle retorna [{ insertId, ... }, ...]
  const insertId = (result as unknown as { insertId: number }).insertId;
  return insertId ?? null;
}

/**
 * Lista todas as transações ordenadas por data (asc) com filtros opcionais.
 */
export async function listTransacoes(filters?: {
  startDate?: Date;
  endDate?: Date;
  categoria?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.startDate) conditions.push(gte(transacoes.dataTimestamp, filters.startDate));
  if (filters?.endDate) conditions.push(lte(transacoes.dataTimestamp, filters.endDate));
  if (filters?.categoria) conditions.push(eq(transacoes.categoria, filters.categoria));

  const query = db
    .select()
    .from(transacoes)
    .orderBy(transacoes.dataTimestamp);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }
  return await query;
}

/**
 * Conta total de transações no banco.
 */
export async function countTransacoes(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(transacoes);
  return Number(result[0]?.count ?? 0);
}

/**
 * Retorna lista de uploads ordenados pelo mais recente.
 */
export async function listUploads(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(uploads).orderBy(desc(uploads.createdAt)).limit(limit);
}

/**
 * Tipo de saída do resumo agregado, no mesmo formato do dashboard.json
 * para troca direta no frontend.
 */
export interface ResumoAgregado {
  resumo: {
    total_receitas: number;
    total_despesas: number;
    resultado: number;
    periodo_inicio: string;
    periodo_fim: string;
    qtd_receitas: number;
    qtd_despesas: number;
  };
  categorias: Array<{
    nome: string;
    valor: number;
    valor_abs: number;
    percentual: number;
    quantidade: number;
  }>;
  diario: Array<{
    data: string;
    data_full: string;
    valor: number;
    saldo: number;
  }>;
  detalhes: Record<
    string,
    {
      total: number;
      quantidade: number;
      registros: Array<{
        data: string;
        descricao: string;
        documento: string;
        valor: number;
        saldo: number;
      }>;
    }
  >;
  totalRegistros: number;
}

/**
 * Formata Date como DD/MM/YYYY (formato BR do dashboard).
 */
function formatBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatShort(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function formatISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Tipo genérico das linhas usadas pela agregação (corresponde ao retorno de listTransacoes).
 */
export interface AggregateRow {
  data: string;
  dataTimestamp: Date | string;
  descricao: string;
  documento: string | null;
  valor: string | number;
  saldo: string | number | null;
  categoria: string;
}

/**
 * Função PURA: recebe linhas e produz o resumo agregado.
 * Foi extraída para permitir testes unitários determinísticos sem depender do banco.
 */
export function aggregateRows(rows: AggregateRow[]): ResumoAgregado | null {
  if (rows.length === 0) return null;

  let totalReceitas = 0;
  let totalDespesas = 0;
  let qtdReceitas = 0;
  let qtdDespesas = 0;
  const categoriasMap = new Map<string, { valor: number; quantidade: number }>();
  const diarioMap = new Map<
    string,
    { data: string; data_full: string; valor: number; saldo: number; ts: number }
  >();
  const detalhes: ResumoAgregado['detalhes'] = {};

  let periodoInicio: Date | null = null;
  let periodoFim: Date | null = null;

  for (const t of rows) {
    const valor = Number(t.valor);
    const saldo = Number(t.saldo ?? 0);
    const dt = t.dataTimestamp instanceof Date ? t.dataTimestamp : new Date(t.dataTimestamp as unknown as string);

    if (!periodoInicio || dt < periodoInicio) periodoInicio = dt;
    if (!periodoFim || dt > periodoFim) periodoFim = dt;

    if (valor > 0) {
      totalReceitas += valor;
      qtdReceitas += 1;
    } else {
      totalDespesas += valor;
      qtdDespesas += 1;
    }

    // categorias (apenas saídas)
    if (valor < 0) {
      const cat = categoriasMap.get(t.categoria) ?? { valor: 0, quantidade: 0 };
      cat.valor += valor;
      cat.quantidade += 1;
      categoriasMap.set(t.categoria, cat);
    }

    // diário
    const isoKey = formatISO(dt);
    const dia = diarioMap.get(isoKey) ?? {
      data: formatShort(dt),
      data_full: isoKey,
      valor: 0,
      saldo: 0,
      ts: dt.getTime(),
    };
    dia.valor += valor;
    dia.saldo = saldo;
    diarioMap.set(isoKey, dia);

    // detalhes por categoria
    if (!detalhes[t.categoria]) {
      detalhes[t.categoria] = { total: 0, quantidade: 0, registros: [] };
    }
    detalhes[t.categoria].total += valor;
    detalhes[t.categoria].quantidade += 1;
    detalhes[t.categoria].registros.push({
      data: formatBR(dt),
      descricao: t.descricao,
      documento: t.documento ?? '',
      valor,
      saldo,
    });
  }

  const totalDespesasAbs = Math.abs(totalDespesas);
  const categorias = Array.from(categoriasMap.entries())
    .map(([nome, v]) => ({
      nome,
      valor: v.valor,
      valor_abs: Math.abs(v.valor),
      percentual: totalDespesasAbs > 0 ? (Math.abs(v.valor) / totalDespesasAbs) * 100 : 0,
      quantidade: v.quantidade,
    }))
    .sort((a, b) => b.valor_abs - a.valor_abs);

  const diario = Array.from(diarioMap.values())
    .sort((a, b) => a.ts - b.ts)
    .map(({ ts: _ts, ...rest }) => rest);

  return {
    resumo: {
      total_receitas: totalReceitas,
      total_despesas: totalDespesas,
      resultado: totalReceitas + totalDespesas,
      periodo_inicio: periodoInicio ? formatBR(periodoInicio) : '',
      periodo_fim: periodoFim ? formatBR(periodoFim) : '',
      qtd_receitas: qtdReceitas,
      qtd_despesas: qtdDespesas,
    },
    categorias,
    diario,
    detalhes,
    totalRegistros: rows.length,
  };
}

/**
 * Constrói o resumo agregado a partir do banco. Apenas busca + delega para a função pura.
 */
export async function buildResumoAgregado(): Promise<ResumoAgregado | null> {
  const todas = await listTransacoes();
  return aggregateRows(todas as AggregateRow[]);
}
