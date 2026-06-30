import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { z } from 'zod';
import {
  criarCarga,
  atualizarCarga,
  listarCargasPorPasta,
  listarTodasCargas,
  buscarCargaPorId,
  deletarCarga,
  resumoCargasPorPasta,
} from '../db/cargas';

export const cargasRouter = router({
  /**
   * Cria uma nova carga
   */
  criar: publicProcedure
    .input(
      z.object({
        pasta: z.enum(['IES', 'IJD', 'DAJ', 'MFF', 'IGU']),
        data: z.string(), // YYYY-MM-DD
        tipo: z.enum(['SAO_LEO', 'ESTEIO']).default('SAO_LEO'),
        rota: z.string().optional(),
        motorista: z.string().optional(),
        valorCombustivel: z.number(),
        litrosCombustivel: z.number(),
        chapa1: z.string().optional(),
        chapa2: z.string().optional(),
        manutencao: z.number(),
        custoOutros: z.number(),
        valorFrete: z.number(),
        numeroProtocolo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return criarCarga(input);
    }),

  /**
   * Atualiza uma carga existente
   */
  atualizar: publicProcedure
    .input(
      z.object({
        id: z.number(),
        tipo: z.enum(['SAO_LEO', 'ESTEIO']).optional(),
        rota: z.string().optional(),
        motorista: z.string().optional(),
        valorCombustivel: z.number().optional(),
        litrosCombustivel: z.number().optional(),
        chapa1: z.string().optional(),
        chapa2: z.string().optional(),
        manutencao: z.number().optional(),
        custoOutros: z.number().optional(),
        valorFrete: z.number().optional(),
        numeroProtocolo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return atualizarCarga(id, data);
    }),

  /**
   * Lista todas as cargas de uma pasta
   */
  listarPorPasta: publicProcedure
    .input(z.enum(['IES', 'IJD', 'DAJ', 'MFF', 'IGU']))
    .query(async ({ input }: any) => {
      return listarCargasPorPasta(input);
    }),

  /**
   * Busca uma carga por ID
   */
  buscarPorId: publicProcedure
    .input(z.number())
    .query(async ({ input }: any) => {
      return buscarCargaPorId(input);
    }),

  /**
   * Deleta uma carga
   */
  deletar: publicProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      return deletarCarga(input);
    }),

  /**
   * Lista todas as cargas de todas as pastas
   */
  listarTodas: publicProcedure
    .query(async () => {
      return listarTodasCargas();
    }),

  /**
   * Calcula resumo de cargas por pasta
   */
  resumoPorPasta: publicProcedure
    .input(z.enum(['IES', 'IJD', 'DAJ', 'MFF', 'IGU']))
    .query(async ({ input }: any) => {
      return resumoCargasPorPasta(input);
    }),

  /**
   * Sincroniza protocolos do Gmail
   */
  sincronizarProtocolos: publicProcedure
    .input(
      z.object({
        diasAtras: z.number().optional().default(30),
      })
    )
    .mutation(async ({ input }) => {
      const { sincronizarProtocolosDoGmail } = await import('../services/gmailProtocoloIntegration.js');
      return sincronizarProtocolosDoGmail(input.diasAtras);
    }),

  /**
   * Obtem protocolos sincronizados para pre-preenchimento
   */
  obterProtocolosSincronizados: publicProcedure
    .input(
      z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { obterProtocolosSincronizados } = await import('../services/gmailProtocoloIntegration.js');
      return obterProtocolosSincronizados(input.dataInicio, input.dataFim);
    }),
});
