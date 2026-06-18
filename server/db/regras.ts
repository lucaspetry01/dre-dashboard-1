import { eq, asc } from 'drizzle-orm';
import { getDb } from '../db';
import { regrasCategorias, categorias, transacoes } from '../../drizzle/schema.js';

export async function getCategoriaIdPorNome(nome: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ id: categorias.id }).from(categorias).where(eq(categorias.nome, nome)).limit(1);
  return result[0]?.id ?? null;
}

export async function criarRegra(params: {
  categoriaId: number;
  tipo: 'KEYWORD' | 'REGEX' | 'NOME_EXATO';
  valor: string;
  descricao?: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.insert(regrasCategorias).values({
      categoriaId: params.categoriaId,
      tipo: params.tipo,
      valor: params.valor,
      ativa: 'sim',
      descricao: params.descricao ?? null,
    });
    return true;
  } catch (error) {
    console.error('Erro ao criar regra:', error);
    return false;
  }
}

/**
 * Aplica todas as regras ativas a todas as transações.
 * Respeita a PRIORIDADE da categoria — menor número = maior prioridade.
 * Ex: CHAPA (prioridade 5) vence PAGAMENTOS (prioridade 11).
 */
export async function aplicarRegrasRetroativamente(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // 1. Carregar categorias com prioridade
  const todasCategorias = await db
    .select({ id: categorias.id, nome: categorias.nome, prioridade: categorias.prioridade })
    .from(categorias)
    .orderBy(asc(categorias.prioridade)); // menor prioridade primeiro

  const categoriaPorId = new Map(todasCategorias.map(c => [c.id, c.nome]));
  const prioridadePorId = new Map(todasCategorias.map(c => [c.id, c.prioridade]));

  // 2. Carregar regras ativas
  const regras = await db
    .select({
      tipo: regrasCategorias.tipo,
      valor: regrasCategorias.valor,
      categoriaId: regrasCategorias.categoriaId,
    })
    .from(regrasCategorias)
    .where(eq(regrasCategorias.ativa, 'sim'));

  if (regras.length === 0) return 0;

  // Ordenar regras pela prioridade da categoria (menor = maior prioridade)
  regras.sort((a, b) => {
    const pA = prioridadePorId.get(a.categoriaId) ?? 999;
    const pB = prioridadePorId.get(b.categoriaId) ?? 999;
    return pA - pB;
  });

  // 3. Carregar todas as transações
  const todasTransacoes = await db
    .select({
      id: transacoes.id,
      descricao: transacoes.descricao,
      valor: transacoes.valor,
      categoria: transacoes.categoria,
    })
    .from(transacoes);

  let totalAtualizado = 0;

  // 4. Para cada transação, aplicar a primeira regra que bater (respeitando prioridade)
  for (const transacao of todasTransacoes) {
    // Receitas nunca mudam
    if (Number(transacao.valor) > 0) continue;

    const descUpper = transacao.descricao.toUpperCase();
    let novaCategoria: string | null = null;

    for (const regra of regras) {
      const valorRegra = regra.valor.toUpperCase();
      let corresponde = false;

      if (regra.tipo === 'KEYWORD') {
        corresponde = descUpper.includes(valorRegra);
      } else if (regra.tipo === 'NOME_EXATO') {
        corresponde = descUpper.includes(valorRegra);
      } else if (regra.tipo === 'REGEX') {
        try { corresponde = new RegExp(regra.valor, 'i').test(transacao.descricao); }
        catch { continue; }
      }

      if (corresponde) {
        novaCategoria = categoriaPorId.get(regra.categoriaId) ?? null;
        break; // Primeira regra com maior prioridade vence
      }
    }

    // Só atualiza se mudou
    if (novaCategoria && novaCategoria !== transacao.categoria) {
      await db.update(transacoes).set({ categoria: novaCategoria }).where(eq(transacoes.id, transacao.id));
      totalAtualizado++;
    }
  }

  return totalAtualizado;
}