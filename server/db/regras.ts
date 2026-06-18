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
 * Busca todas as regras ativas.
 */
export async function obterTodasAsRegras() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: regrasCategorias.id,
      categoriaId: regrasCategorias.categoriaId,
      tipo: regrasCategorias.tipo,
      valor: regrasCategorias.valor,
      descricao: regrasCategorias.descricao,
    })
    .from(regrasCategorias)
    .where(eq(regrasCategorias.ativa, 'sim'));
}

/**
 * Busca todas as transações não categorizadas ou em categoria genérica.
 */
export async function obterTransacoesParaRecategorizar() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: transacoes.id,
      descricao: transacoes.descricao,
      categoria: transacoes.categoria,
    })
    .from(transacoes);
}

/**
 * Aplica as regras de categorização a todas as transações existentes.
 * Retorna o número de transações atualizadas.
 */
export async function aplicarRegrasRetroativamente(): Promise<number> {
  // TODO: Função desativada temporariamente para debug
  // Estava causando recategorização incorreta de transações
  console.log('[DEBUG] aplicarRegrasRetroativamente desativada temporariamente');
  return 0;
  
  /* CÓDIGO ORIGINAL - DESATIVADO
  const db = await getDb();
  if (!db) return 0;

  const regras = await obterTodasAsRegras();
  const todasAsTransacoes = await obterTransacoesParaRecategorizar();
  
  let totalAtualizado = 0;

  for (const transacao of todasAsTransacoes) {
    for (const regra of regras) {
      let corresponde = false;

      if (regra.tipo === 'KEYWORD') {
        // Busca a palavra-chave em qualquer lugar da descrição
        corresponde = transacao.descricao
          .toUpperCase()
          .includes(regra.valor.toUpperCase());
      } else if (regra.tipo === 'NOME_EXATO') {
        // Busca correspondência exata
        corresponde =
          transacao.descricao.toUpperCase() === regra.valor.toUpperCase();
      }

      if (corresponde) {
        // Busca o nome da categoria
        const categoria = await db
          .select({ nome: categorias.nome })
          .from(categorias)
          .where(eq(categorias.id, regra.categoriaId))
          .limit(1);

        if (categoria.length > 0) {
          // Atualiza a transação
          await db
            .update(transacoes)
            .set({ categoria: categoria[0].nome })
            .where(eq(transacoes.id, transacao.id));

          totalAtualizado++;
          break; // Aplica apenas a primeira regra que corresponde
        }
      }
    }
  }

  return totalAtualizado;
  */
}
