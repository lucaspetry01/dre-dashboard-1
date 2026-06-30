import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { processOfxFile } from '../services/ofxProcessor';
import {
  buildResumoAgregado,
  countTransacoes,
  listTransacoes,
  listUploads,
  updateTransacaoCategoria,
  buscarPedagioPorDataEPlaca,
} from '../db/transacoes';
import { getCategoriaIdPorNome, criarRegra, aplicarRegrasRetroativamente } from '../db/regras';

// Lógica de processamento movida para server/services/ofxProcessor.ts

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
      return await processOfxFile(input.fileBase64, input.nomeArquivo || 'extrato.ofx');
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

  /**
   * Busca o valor total de pedágio para uma placa em uma data específica
   */
  buscarPedagio: publicProcedure
    .input(
      z.object({
        data: z.string(), // YYYY-MM-DD
        placa: z.string(),
      })
    )
    .query(async ({ input }) => {
      const valor = await buscarPedagioPorDataEPlaca(input.data, input.placa);
      return { valor };
    }),
});