/**
 * Lógica de categorização dinâmica que lê regras do banco de dados.
 * Substitui a versão hardcoded (categorizar.ts) por uma versão flexível.
 */

import { getDb } from '../db';
import { categorias, regrasCategorias } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export type Categoria =
  | 'RECEITAS OPERACIONAIS'
  | 'COMBUSTÍVEL / POSTO'
  | 'CHAPA / OPERACIONAL PF'
  | 'PRÓ-LABORE / SOCIETÁRIO'
  | 'MECÂNICA / MANUTENÇÃO'
  | 'PEDÁGIOS / TAGS'
  | 'IMPOSTOS / TRIBUTOS / OUTROS'
  | 'CONTA / BOLETO'
  | 'CONSÓRCIO / FINANCIAMENTO'
  | 'CUSTO OPERACIONAL ESPECÍFICO'
  | 'PAGAMENTOS'
  | 'SAÍDAS NÃO CATEGORIZADAS';

interface CategoriaComRegras {
  id: number;
  nome: string;
  prioridade: number;
  ativa: string;
  regras: Array<{
    id: number;
    tipo: 'KEYWORD' | 'REGEX' | 'NOME_EXATO';
    valor: string;
    ativa: string;
  }>;
}

// Cache em memória para evitar queries repetidas
let categoriasCache: CategoriaComRegras[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega todas as categorias e regras do banco.
 * Usa cache em memória para evitar queries repetidas.
 */
async function loadCategoriasComRegras(): Promise<CategoriaComRegras[]> {
  const now = Date.now();
  
  // Retornar cache se ainda está válido
  if (categoriasCache && now - cacheTimestamp < CACHE_TTL) {
    return categoriasCache;
  }

  const db = await getDb();
  if (!db) return [];

  // Buscar todas as categorias ativas
  const cats = await db
    .select()
    .from(categorias)
    .where(eq(categorias.ativa, 'sim'));

  // Para cada categoria, buscar suas regras ativas
  const result: CategoriaComRegras[] = [];
  for (const cat of cats) {
    const regras = await db
      .select()
      .from(regrasCategorias)
      .where(eq(regrasCategorias.categoriaId, cat.id));

    result.push({
      id: cat.id,
      nome: cat.nome,
      prioridade: cat.prioridade,
      ativa: cat.ativa,
      regras: regras
        .filter((r) => r.ativa === 'sim')
        .map((r) => ({
          id: r.id,
          tipo: r.tipo as 'KEYWORD' | 'REGEX' | 'NOME_EXATO',
          valor: r.valor,
          ativa: r.ativa,
        })),
    });
  }

  // Ordenar por prioridade
  result.sort((a, b) => a.prioridade - b.prioridade);

  // Atualizar cache
  categoriasCache = result;
  cacheTimestamp = now;

  return result;
}

/**
 * Verifica se a descrição contém a palavra-chave (case-insensitive).
 */
function matchKeyword(desc: string, keyword: string): boolean {
  return desc.includes(keyword);
}

/**
 * Verifica se a descrição corresponde ao padrão regex.
 */
function matchRegex(desc: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(desc);
  } catch {
    // Se regex inválido, retornar false
    return false;
  }
}

/**
 * Verifica se a descrição corresponde exatamente ao nome (case-insensitive).
 */
function matchNomeExato(desc: string, nome: string): boolean {
  return desc.includes(nome);
}

/**
 * Categoriza uma transação com base na descrição e valor.
 * Lê as regras do banco de dados em ordem de prioridade.
 */
export async function categorizarDinamico(
  descricao: string,
  valor: number
): Promise<Categoria> {
  // 1. Receitas (valor > 0)
  if (valor > 0) {
    return 'RECEITAS OPERACIONAIS';
  }

  const desc = descricao.toUpperCase();
  const categoriasComRegras = await loadCategoriasComRegras();

  // 2. Aplicar regras em ordem de prioridade
  for (const categoria of categoriasComRegras) {
    // Pular RECEITAS OPERACIONAIS pois já foi tratada
    if (categoria.nome === 'RECEITAS OPERACIONAIS') continue;

    for (const regra of categoria.regras) {
      let match = false;

      if (regra.tipo === 'KEYWORD') {
        match = matchKeyword(desc, regra.valor);
      } else if (regra.tipo === 'REGEX') {
        match = matchRegex(desc, regra.valor);
      } else if (regra.tipo === 'NOME_EXATO') {
        match = matchNomeExato(desc, regra.valor);
      }

      if (match) {
        return categoria.nome as Categoria;
      }
    }
  }

  // 3. Default
  return 'SAÍDAS NÃO CATEGORIZADAS';
}

/**
 * Limpa o cache (útil para testes ou quando regras são atualizadas).
 */
export function clearCategoriasCache(): void {
  categoriasCache = null;
  cacheTimestamp = 0;
}
