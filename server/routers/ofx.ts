import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { parseOfx } from '../lib/parseOfx';
import { categorizarDinamico } from '../lib/categorizarDinamico';
import {
  buildResumoAgregado,
  countTransacoes,
  createUpload,
  getExistingHashes,
  insertTransacoes,
  listTransacoes,
  listUploads,
  updateTransacaoCategoria,
} from '../db/transacoes';
import { getCategoriaIdPorNome, criarRegra, aplicarRegrasRetroativamente } from '../db/regras';
import type { InsertTransacao } from '../../drizzle/schema';
import { db } from '../db';
import { transacoes } from '../../drizzle/schema';
import { eq, isNull, or, and } from 'drizzle-orm';
import { z } from 'zod';

const accountToCnpjMap: Record<string, string> = {
  '30085-5': '51.621.925/0001-90',
  '88828-6': '24.853.275/0001-36',
};

async function fillCnpjByAccount() {
  for (const [conta, cnpj] of Object.entries(accountToCnpjMap)) {
    await db
      .update(transacoes)
      .set({ cnpj })
      .where(
        and(
          eq(transacoes.conta, conta),
          or(isNull(transacoes.cnpj), eq(transacoes.cnpj, ''))
        )
      );
  }
}

/**
 * Cria o hash único da transação. Quando houver FITID (vindo do OFX),
 * usamos diretamente — é o ID nativo do banco e único por extrato.
 * Caso contrário, fallback para combinação data+descrição+valor.
 */
function buildHash(fitId: string | null | undefined, data: string, descricao: string, valor: number): string {
  if (fitId && fitId.trim().length > 0) {
    return `OFX:${fitId.trim()}`;
  }
  return `LEGACY:${data}|${descricao}|${valor.toFixed(2)}`;
}

export const ofxRouter = router({
  /**
   * Processa um arquivo OFX (em base64) e persiste transações no banco.
   * Detecta duplicatas pelo FITID (id único do banco).
   */
  processOFX: publicProcedure
    .input(
      z.object({
        fileBase64: z.string(),
        nomeArquivo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Decodificar base64
      const buffer = Buffer.from(input.fileBase64, 'base64');
      const ofxContent = buffer.toString('utf-8');

      // Parse OFX
      const parsed = parseOfx(ofxContent);

      if (parsed.transactions.length === 0) {
        return {
          success: false,
          totalProcessado: 0,
          totalNovos: 0,
          totalDuplicatas: 0,
          mensagem: 'Nenhuma transação encontrada no arquivo OFX.',
        };
      }

      // Calcular hashes e identificar duplicatas
      const hashes = parsed.transactions.map((t) => buildHash(t.fitId, t.data, t.descricao, t.valor));
      const existingHashes = await getExistingHashes(hashes);

      // Construir registros para inserir (apenas os não-duplicados)
      const novosRegistros: InsertTransacao[] = [];
      let duplicatas = 0;

      for (let i = 0; i < parsed.transactions.length; i++) {
        const t = parsed.transactions[i];
        const hashUnico = hashes[i];

        if (existingHashes.has(hashUnico)) {
          duplicatas++;
          continue;
        }

        const categoria = await categorizarDinamico(t.descricao, t.valor);

        novosRegistros.push({
          data: t.data,
          dataTimestamp: t.dataTimestamp,
          descricao: t.descricao,
          documento: t.fitId,
          valor: t.valor.toFixed(2),
          saldo: '0',
          tipo: t.tipo,
          categoria,
          hashUnico,
          banco: parsed.bankId || 'DESCONHECIDO',
          conta: parsed.accountId || '',
          cnpj: parsed.cnpj || '',
        });
      }

      // Se temos saldoFinal e transacoes novas, preencher o saldo da ultima transacao
      if (parsed.saldoFinal && novosRegistros.length > 0) {
        novosRegistros[novosRegistros.length - 1].saldo = parsed.saldoFinal.toFixed(2);
      }

      // Criar registro de upload
      const uploadId = await createUpload({
        nomeArquivo: input.nomeArquivo || 'extrato.ofx',
        totalProcessado: parsed.transactions.length,
        totalNovos: novosRegistros.length,
        totalDuplicatas: duplicatas,
        periodoInicio: parsed.periodoInicio,
        periodoFim: parsed.periodoFim,
        saldoFinal: parsed.saldoFinal ? parsed.saldoFinal.toFixed(2) : '0',
      });

      // Associar uploadId aos novos registros
      if (uploadId !== null) {
        novosRegistros.forEach((r) => {
          r.uploadId = uploadId;
        });
      }

      // Inserir em lote
      await insertTransacoes(novosRegistros);

      // Preencher CNPJ retroativamente baseado na conta
      await fillCnpjByAccount();

      return {
        success: true,
        totalProcessado: parsed.transactions.length,
        totalNovos: novosRegistros.length,
        totalDuplicatas: duplicatas,
        periodoInicio: parsed.periodoInicio,
        periodoFim: parsed.periodoFim,
        saldoFinal: parsed.saldoFinal ? parsed.saldoFinal.toFixed(2) : '0',
        mensagem: `${novosRegistros.length} transações importadas, ${duplicatas} duplicatas ignoradas.`,
      };
    }),

  /**
   * Lista todas as transações do banco com filtros opcionais.
   */
  listar: publicProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          categoria: z.string().optional(),
          banco: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await listTransacoes({
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        categoria: input?.categoria,
        banco: input?.banco,
      });
    }),

  /**
   * Retorna se o banco tem dados (para decidir entre JSON estático ou banco).
   */
  temDados: publicProcedure.query(async () => {
    const total = await countTransacoes();
    return { total, temDados: total > 0 };
  }),

  /**
   * Histórico de uploads.
   */
  historicoUploads: publicProcedure.query(async () => {
    return await listUploads();
  }),

  /**
   * Retorna resumo agregado no mesmo formato de dashboard.json.
   * O frontend usa essa fonte quando o banco tem dados, e cai para JSON estático
   * quando está vazio (primeiro acesso ou DB indisponível).
   */
  resumoCompleto: publicProcedure.query(async () => {
    return await buildResumoAgregado();
  }),

  /**
   * Atualiza apenas a categoria de uma transação (sem criar regra).
   */
  atualizarCategoria: publicProcedure
    .input(
      z.object({
        transacaoId: z.number().int().positive(),
        novaCategoria: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const sucesso = await updateTransacaoCategoria(input.transacaoId, input.novaCategoria);
      return {
        sucesso,
        mensagem: sucesso ? 'Categoria atualizada com sucesso' : 'Erro ao atualizar categoria',
      };
    }),

  /**
   * Move transação de categoria e opcionalmente cria uma regra automática
   * para que futuras transações similares sejam categorizadas corretamente.
   */
  moverComRegra: publicProcedure
    .input(
      z.object({
        transacaoId: z.number().int().positive(),
        novaCategoria: z.string().min(1),
        criarRegra: z.boolean().default(false),
        tipoRegra: z.enum(['KEYWORD', 'NOME_EXATO']).optional(),
        valorRegra: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Mover a transação para a nova categoria
      const moveu = await updateTransacaoCategoria(input.transacaoId, input.novaCategoria);
      if (!moveu) {
        return { sucesso: false, mensagem: 'Erro ao mover transação' };
      }

      // 2. Criar regra no banco se solicitado
      if (input.criarRegra && input.tipoRegra && input.valorRegra) {
        const categoriaId = await getCategoriaIdPorNome(input.novaCategoria);
        if (categoriaId) {
          await criarRegra({
            categoriaId,
            tipo: input.tipoRegra,
            valor: input.valorRegra.toUpperCase(),
            descricao: `${input.tipoRegra === 'KEYWORD' ? 'Palavra-chave' : 'Nome exato'}: ${input.valorRegra}`,
          });
        } else {
          // Categoria não encontrada na tabela categorias — mover funcionou mas regra não foi criada
          return {
            sucesso: true,
            mensagem: 'Transação movida, mas categoria não encontrada para criar regra.',
          };
        }
      }

      return { sucesso: true, mensagem: 'Transação movida com sucesso' };
    }),

  /**
   * Aplica todas as regras de categorização criadas às transações existentes.
   * Retorna o número de transações recategorizadas.
   */
  aplicarRegrasRetroativas: publicProcedure.mutation(async () => {
    try {
      const totalAtualizado = await aplicarRegrasRetroativamente();
      return {
        sucesso: true,
        mensagem: `${totalAtualizado} transações recategorizadas com sucesso`,
        totalAtualizado,
      };
    } catch (error) {
      console.error('Erro ao aplicar regras retroativamente:', error);
      return {
        sucesso: false,
        mensagem: 'Erro ao aplicar regras retroativamente',
        totalAtualizado: 0,
      };
    }
  }),
});