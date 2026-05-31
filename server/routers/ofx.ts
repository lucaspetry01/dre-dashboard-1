import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { parseOfx } from '../lib/parseOfx';
import { categorizar } from '../lib/categorizar';
import {
  buildResumoAgregado,
  countTransacoes,
  createUpload,
  getExistingHashes,
  insertTransacoes,
  listTransacoes,
  listUploads,
} from '../db/transacoes';
import type { InsertTransacao } from '../../drizzle/schema';

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

        const categoria = categorizar(t.descricao, t.valor);

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
        });
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
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await listTransacoes({
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        categoria: input?.categoria,
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
});
