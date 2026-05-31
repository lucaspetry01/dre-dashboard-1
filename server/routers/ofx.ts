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
import { z } from 'zod';

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

      // Filtrar apenas transações não-duplicadas
      const transacoesNaodup = [];
      for (let i = 0; i < parsed.transactions.length; i++) {
        const t = parsed.transactions[i];
        const hashUnico = hashes[i];

        if (existingHashes.has(hashUnico)) {
          duplicatas++;
          continue;
        }

        transacoesNaodup.push({ t, hashUnico });
      }

      // Calcular saldos acumulados de trás para frente
      // Começamos com o saldoFinal e subtraímos cada transação
      let saldoAtual = parsed.saldoFinal || 0;
      for (let i = transacoesNaodup.length - 1; i >= 0; i--) {
        const { t, hashUnico } = transacoesNaodup[i];
        const categoria = categorizar(t.descricao, t.valor);

        novosRegistros.unshift({
          data: t.data,
          dataTimestamp: t.dataTimestamp,
          descricao: t.descricao,
          documento: t.fitId,
          valor: t.valor.toFixed(2),
          saldo: saldoAtual.toFixed(2),
          tipo: t.tipo,
          categoria,
          hashUnico,
        });

        // Subtrair o valor da transação para obter o saldo anterior
        saldoAtual -= t.valor;
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

      if (!uploadId) {
        return {
          success: false,
          totalProcessado: 0,
          totalNovos: 0,
          totalDuplicatas: 0,
          mensagem: 'Erro ao criar registro de upload.',
        };
      }

      // Adicionar uploadId a cada transação
      for (const reg of novosRegistros) {
        reg.uploadId = uploadId;
      }

      // Inserir em lote
      const inserted = await insertTransacoes(novosRegistros);

      return {
        success: true,
        totalProcessado: parsed.transactions.length,
        totalNovos: inserted,
        totalDuplicatas: duplicatas,
        mensagem: `${inserted} transações inseridas, ${duplicatas} duplicatas ignoradas.`,
      };
    }),

  /**
   * Retorna o resumo completo (receitas, despesas, categorias, diário, saldo final).
   * O frontend usa essa fonte quando o banco tem dados, e cai para JSON estático
   * quando está vazio (primeiro acesso ou DB indisponível).
   */
  resumoCompleto: publicProcedure.query(async () => {
    return await buildResumoAgregado();
  }),
});
