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
 * Conta o total de transações no banco.
 */
export async function countTransacoes(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transacoes);

  return result[0]?.count ?? 0;
}

/**
 * Lista todos os uploads em ordem reversa (mais recentes primeiro).
 */
export async function listUploads() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(uploads).orderBy(desc(uploads.createdAt));
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
  saldoFinal?: number; // Saldo final da conta do último OFX importado
  lastImportDate?: Date; // Data e hora do último import de OFX
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
        id: number;
        data: string;
        descricao: string;
        documento: string;
        valor: number;
        saldo: number;
        categoria: string;
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

/**
 * Formata Date como YYYY-MM-DD (ISO format para data_full).
 */
function formatISO(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatShort(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

interface AggregateRow {
  id: number;
  data: string;
  dataTimestamp: Date;
  descricao: string;
  documento: string;
  valor: number | string;
  saldo: number | string;
  categoria: string;
}

/**
 * Agrega linhas de transações em resumo, categorias, diário e detalhes.
 * Função pura: sem I/O, apenas transformação de dados.
 */
export function aggregateRows(rows: AggregateRow[]): ResumoAgregado | null {
  if (rows.length === 0) {
    return null;
  }

  let total_receitas = 0;
  let total_despesas = 0;
  let qtd_receitas = 0;
  let qtd_despesas = 0;

  const categoriaMap: Record<
    string,
    {
      total: number;
      quantidade: number;
    }
  > = {};

  const diarioMap: Record<
    string,
    {
      data: string;
      data_full: string;
      valor: number;
      saldo: number;
    }
  > = {};

  const detalhesMap: Record<
    string,
    {
      total: number;
      quantidade: number;
      registros: Array<{
        id: number;
        data: string;
        descricao: string;
        documento: string;
        valor: number;
        saldo: number;
        categoria: string;
      }>;
    }
  > = {};

  // Processar cada linha
  for (const row of rows) {
    const valor = Number(row.valor);
    const saldo = Number(row.saldo);
    const categoria = row.categoria || 'OUTROS';

    // Acumular receitas/despesas
    if (valor > 0) {
      total_receitas += valor;
      qtd_receitas++;
    } else if (valor < 0) {
      total_despesas += valor;
      qtd_despesas++;
    }

    // Agregar por categoria
    if (!categoriaMap[categoria]) {
      categoriaMap[categoria] = { total: 0, quantidade: 0 };
    }
    categoriaMap[categoria].total += valor;
    categoriaMap[categoria].quantidade++;

    // Agregar por data (diário)
    const dataFull = row.dataTimestamp
      ? formatISO(new Date(row.dataTimestamp))
      : row.data;
    const dataShort = row.dataTimestamp
      ? formatShort(new Date(row.dataTimestamp))
      : row.data.substring(0, 5);

    if (!diarioMap[dataFull]) {
      diarioMap[dataFull] = {
        data: dataShort,
        data_full: dataFull,
        valor: 0,
        saldo: 0,
      };
    }
    diarioMap[dataFull].valor += valor;
    diarioMap[dataFull].saldo = saldo; // Última transação do dia

    // Agregar por categoria (detalhes)
    if (!detalhesMap[categoria]) {
      detalhesMap[categoria] = {
        total: 0,
        quantidade: 0,
        registros: [],
      };
    }
    detalhesMap[categoria].total += valor;
    detalhesMap[categoria].quantidade++;
    detalhesMap[categoria].registros.push({
      id: row.id,
      data: row.data,
      descricao: row.descricao,
      documento: row.documento || '',
      valor,
      saldo,
      categoria: row.categoria,
    });
  }

  // Construir array de categorias ordenado por valor absoluto
  const categorias = Object.entries(categoriaMap)
    .map(([nome, dados]) => ({
      nome,
      valor: dados.total,
      valor_abs: Math.abs(dados.total),
      percentual:
        total_despesas < 0 && dados.total < 0
          ? (Math.abs(dados.total) / Math.abs(total_despesas)) * 100
          : 0,
      quantidade: dados.quantidade,
    }))
    .sort((a, b) => b.valor_abs - a.valor_abs);

  // Construir array de diário ordenado por data (data_full já está em YYYY-MM-DD)
  const diario = Object.values(diarioMap).sort((a, b) => {
    return a.data_full.localeCompare(b.data_full);
  });

  // Calcular periodo_inicio e periodo_fim a partir das datas do diário
  let periodo_inicio = '';
  let periodo_fim = '';
  
  if (diario.length > 0) {
    // data_full está em YYYY-MM-DD (ISO), converter para DD/MM/YYYY
    const firstDate = diario[0].data_full;
    const lastDate = diario[diario.length - 1].data_full;
    
    if (firstDate) {
      const [yyyy, mm, dd] = firstDate.split('-');
      periodo_inicio = `${dd}/${mm}/${yyyy}`;
    }
    if (lastDate) {
      const [yyyy, mm, dd] = lastDate.split('-');
      periodo_fim = `${dd}/${mm}/${yyyy}`;
    }
  }

  return {
    resumo: {
      total_receitas,
      total_despesas,
      resultado: total_receitas + total_despesas,
      periodo_inicio,
      periodo_fim,
      qtd_receitas,
      qtd_despesas,
    },
    categorias,
    diario,
    detalhes: detalhesMap,
    totalRegistros: rows.length,
  };
}

/**
 * Constrói o resumo agregado a partir do banco. Busca + delega para a função pura.
 * Também busca o saldoFinal do último registro de transação (do diário).
 */
export async function buildResumoAgregado(): Promise<ResumoAgregado | null> {
  const todas = await listTransacoes();
  const resumo = aggregateRows(todas as AggregateRow[]);
  
  // Buscar saldoFinal do último registro do diário
  if (resumo && resumo.diario && resumo.diario.length > 0) {
    const ultimoDia = resumo.diario[resumo.diario.length - 1];
    if (ultimoDia && ultimoDia.saldo) {
      resumo.saldoFinal = ultimoDia.saldo;
    }
  }

  // Buscar data do último import
  const db = await getDb();
  if (db && resumo) {
    const lastUpload = await db
      .select({ createdAt: uploads.createdAt })
      .from(uploads)
      .orderBy(desc(uploads.createdAt))
      .limit(1);
    
    if (lastUpload && lastUpload.length > 0) {
      resumo.lastImportDate = lastUpload[0].createdAt;
    }
  }
  
  return resumo;
}


/**
 * Atualiza a categoria de uma transação específica.
 * Retorna true se bem-sucedido, false caso contrário.
 */
export async function updateTransacaoCategoria(
  transacaoId: number,
  novaCategoria: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db
      .update(transacoes)
      .set({ categoria: novaCategoria })
      .where(eq(transacoes.id, transacaoId));

    return true;
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    return false;
  }
}
