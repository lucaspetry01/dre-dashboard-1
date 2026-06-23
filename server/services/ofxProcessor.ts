/**
 * Serviço de processamento de arquivos OFX.
 * Centraliza a lógica de parse, deduplicação, categorização e persistência.
 */

import { parseOfx } from '../lib/parseOfx';
import { categorizarDinamico } from '../lib/categorizarDinamico';
import { ACCOUNT_TO_CNPJ_MAP } from '../lib/accountMaps';
import {
  createUpload,
  getExistingHashes,
  insertTransacoes,
  fillCnpjByAccount,
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

/**
 * Constrói um registro de transação para inserção no banco.
 */
async function buildTransacaoRecord(
  transaction: any,
  hashUnico: string,
  parsed: any
): Promise<any> {
  const categoria = await categorizarDinamico(transaction.descricao, transaction.valor);

  return {
    data: transaction.data,
    dataTimestamp: transaction.dataTimestamp,
    descricao: transaction.descricao,
    documento: transaction.fitId,
    valor: transaction.valor.toFixed(2),
    saldo: '0',
    tipo: transaction.tipo,
    categoria,
    hashUnico,
    banco: parsed.bankId || 'DESCONHECIDO',
    conta: parsed.accountId || '',
    cnpj: parsed.cnpj || '',
  };
}

/**
 * Processa um arquivo OFX em base64 e persiste transações no banco.
 * Detecta duplicatas pelo FITID e preenche CNPJ automaticamente.
 */
export async function processOfxFile(
  fileBase64: string,
  nomeArquivo: string
) {
  try {
    // 1. Decodificar e fazer parse do OFX
    const buffer = Buffer.from(fileBase64, 'base64');
    const ofxContent = buffer.toString('utf-8');
    const parsed = parseOfx(ofxContent);

    // 2. Validar se há transações
    if (parsed.transactions.length === 0) {
      return {
        success: false,
        totalProcessado: 0,
        totalNovos: 0,
        totalDuplicatas: 0,
        mensagem: 'Nenhuma transação encontrada no arquivo OFX.',
      };
    }

    // 3. Calcular hashes e identificar duplicatas
    const hashes = parsed.transactions.map((t: any) => buildHash(t.fitId, t.data, t.descricao, t.valor));
    const existingHashes = await getExistingHashes(hashes);

    // 4. Construir registros para inserir (apenas os não-duplicados)
    const novosRegistros: InsertTransacao[] = [];
    let duplicatas = 0;

    for (let i = 0; i < parsed.transactions.length; i++) {
      const t: any = parsed.transactions[i];
      const hashUnico = hashes[i];

      if (existingHashes.has(hashUnico)) {
        duplicatas++;
        continue;
      }

      const record = await buildTransacaoRecord(t, hashUnico, parsed);
      novosRegistros.push(record);
    }

    // 5. Se temos saldoFinal e transações novas, preencher o saldo da última transação
    if (parsed.saldoFinal && novosRegistros.length > 0) {
      novosRegistros[novosRegistros.length - 1].saldo = parsed.saldoFinal.toFixed(2);
    }

    // 6. Criar registro de upload
    const uploadId = await createUpload({
      nomeArquivo: nomeArquivo || 'extrato.ofx',
      totalProcessado: parsed.transactions.length,
      totalNovos: novosRegistros.length,
      totalDuplicatas: duplicatas,
      periodoInicio: parsed.periodoInicio,
      periodoFim: parsed.periodoFim,
      saldoFinal: parsed.saldoFinal ? parsed.saldoFinal.toFixed(2) : '0',
    });

    // 7. Associar uploadId aos novos registros
    if (uploadId !== null) {
      novosRegistros.forEach((r) => {
        r.uploadId = uploadId;
      });
    }

    // 8. Inserir em lote
    await insertTransacoes(novosRegistros);

    // 9. Preencher CNPJ retroativamente baseado na conta
    await fillCnpjByAccount(ACCOUNT_TO_CNPJ_MAP);

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
  } catch (error) {
    console.error('Erro ao processar OFX:', error);
    return {
      success: false,
      totalProcessado: 0,
      totalNovos: 0,
      totalDuplicatas: 0,
      mensagem: 'Erro ao processar arquivo OFX.',
    };
  }
}
