import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  createAbastecimento,
  getAbastecimentosByPasta,
  getAllAbastecimentos,
  getAbastecimentoById,
  updateAbastecimento,
  deleteAbastecimento,
} from '../db/abastecimentos';

const pastaEnum = z.enum(['IES', 'IJD', 'DAJ', 'MFF', 'IGU']);

export const abastecimentosRouter = router({
  // Criar novo abastecimento
  create: protectedProcedure
    .input(
      z.object({
        pasta: pastaEnum,
        data: z.string().date(),
        placa: z.string().min(1),
        rota: z.string().optional(),
        motorista: z.string().optional(),
        protocolo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createAbastecimento(input);
    }),

  // Listar abastecimentos por pasta
  getByPasta: protectedProcedure
    .input(z.object({ pasta: pastaEnum }))
    .query(async ({ input }) => {
      return await getAbastecimentosByPasta(input.pasta);
    }),

  // Listar todos os abastecimentos
  getAll: protectedProcedure
    .query(async () => {
      return await getAllAbastecimentos();
    }),

  // Obter abastecimento por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await getAbastecimentoById(input.id);
      return result[0] || null;
    }),

  // Atualizar abastecimento
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        pasta: pastaEnum.optional(),
        data: z.string().date().optional(),
        placa: z.string().optional(),
        rota: z.string().optional(),
        motorista: z.string().optional(),
        protocolo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateAbastecimento(id, data);
    }),

  // Deletar abastecimento
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteAbastecimento(input.id);
    }),
});
