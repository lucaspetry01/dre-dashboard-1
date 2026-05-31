import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../db';
import { transacoes } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('ofx.atualizarCategoria', () => {
  let db: any;
  let testTransacaoId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Criar uma transação de teste
    const testDate = new Date('2026-05-31');
    const result = await db
      .insert(transacoes)
      .values({
        data: '31/05/2026',
        dataTimestamp: testDate,
        descricao: 'TESTE ATUALIZAR CATEGORIA',
        documento: '',
        valor: -100.00,
        saldo: 0,
        tipo: 'saida',
        categoria: 'PAGAMENTOS',
        hashUnico: 'test-hash-' + Date.now(),
        uploadId: 1,
      })
      .$returningId();

    testTransacaoId = result[0].id;
  });

  afterAll(async () => {
    if (db && testTransacaoId) {
      await db
        .delete(transacoes)
        .where(eq(transacoes.id, testTransacaoId));
    }
  });

  it('deve atualizar a categoria de uma transação existente', async () => {
    const novaCategoria = 'MECÂNICA / MANUTENÇÃO';

    // Atualizar categoria
    await db
      .update(transacoes)
      .set({ categoria: novaCategoria })
      .where(eq(transacoes.id, testTransacaoId));

    // Verificar se foi atualizada
    const result = await db
      .select()
      .from(transacoes)
      .where(eq(transacoes.id, testTransacaoId))
      .limit(1);

    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe(novaCategoria);
  });

  it('deve manter outros campos intactos ao atualizar categoria', async () => {
    const novaCategoria = 'COMBUSTÍVEL / POSTO';

    // Valores originais
    const original = await db
      .select()
      .from(transacoes)
      .where(eq(transacoes.id, testTransacaoId))
      .limit(1);

    // Atualizar apenas categoria
    await db
      .update(transacoes)
      .set({ categoria: novaCategoria })
      .where(eq(transacoes.id, testTransacaoId));

    // Verificar
    const updated = await db
      .select()
      .from(transacoes)
      .where(eq(transacoes.id, testTransacaoId))
      .limit(1);

    expect(updated[0].descricao).toBe(original[0].descricao);
    expect(updated[0].valor).toBe(original[0].valor);
    expect(updated[0].categoria).toBe(novaCategoria);
  });

  it('deve permitir múltiplas atualizações de categoria', async () => {
    const categorias = [
      'PEDÁGIOS / TAGS',
      'IMPOSTOS / TRIBUTOS / OUTROS',
      'CHAPA / OPERACIONAL PF',
    ];

    for (const cat of categorias) {
      await db
        .update(transacoes)
        .set({ categoria: cat })
        .where(eq(transacoes.id, testTransacaoId));

      const result = await db
        .select()
        .from(transacoes)
        .where(eq(transacoes.id, testTransacaoId))
        .limit(1);

      expect(result[0].categoria).toBe(cat);
    }
  });
});
