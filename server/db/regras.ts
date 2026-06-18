import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { regrasCategorias, categorias, transacoes } from '../../drizzle/schema.js';

/**
 * Busca o ID de uma categoria pelo nome.
 */
export async function getCategoriaIdPorNome(nome: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(eq(categorias.nome, nome))
    .limit(1);

  return result[0]?.id ?? null;
}

/**
 * Cria uma regra de categorização no banco.
 */
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
 * Aplica TODAS as regras ativas a TODAS as transações.
 * Rápido: carrega tudo em memória e faz apenas um UPDATE por transação alterada.
 * Retorna o número de transações atualizadas.
 */
export async function aplicarRegrasRetroativamente(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // 1. Carregar todas as regras ativas de uma vez
  const regras = await db
    .select({
      tipo: regrasCategorias.tipo,
      valor: regrasCategorias.valor,
      categoriaId: regrasCategorias.categoriaId,
    })
    .from(regrasCategorias)
    .where(eq(regrasCategorias.ativa, 'sim'));

  if (regras.length === 0) return 0;

  // 2. Carregar todas as categorias de uma vez (evita query por transação)
  const todasCategorias = await db
    .select({ id: categorias.id, nome: categorias.nome })
    .from(categorias);

  const categoriaPorId = new Map(todasCategorias.map(c => [c.id, c.nome]));

  // 3. Carregar todas as transações de uma vez
  const todasTransacoes = await db
    .select({ id: transacoes.id, descricao: transacoes.descricao, valor: transacoes.valor, categoria: transacoes.categoria })
    .from(transacoes);

  let totalAtualizado = 0;

  // 4. Para cada transação, testar todas as regras em memória
  for (const transacao of todasTransacoes) {
    // Receitas nunca mudam de categoria
    if (Number(transacao.valor) > 0) continue;

    const descUpper = transacao.descricao.toUpperCase();
    let novaCategoria: string | null = null;

    for (const regra of regras) {
      const valorRegra = regra.valor.toUpperCase();
      let corresponde = false;

      if (regra.tipo === 'KEYWORD') {
        corresponde = descUpper.includes(valorRegra);
      } else if (regra.tipo === 'NOME_EXATO') {
        corresponde = descUpper === valorRegra;
      } else if (regra.tipo === 'REGEX') {
        try {
          corresponde = new RegExp(regra.valor, 'i').test(transacao.descricao);
        } catch {
          continue;
        }
      }

      if (corresponde) {
        novaCategoria = categoriaPorId.get(regra.categoriaId) ?? null;
        break; // Primeira regra que bate vence
      }
    }

    // Só atualiza se a categoria mudou
    if (novaCategoria && novaCategoria !== transacao.categoria) {
      await db
        .update(transacoes)
        .set({ categoria: novaCategoria })
        .where(eq(transacoes.id, transacao.id));
      totalAtualizado++;
    }
  }

  return totalAtualizado;
}