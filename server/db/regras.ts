import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { regrasCategorias, categorias } from '../../drizzle/schema';

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