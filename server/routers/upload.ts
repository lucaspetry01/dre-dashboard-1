import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import * as XLSX from 'xlsx';

interface Transaction {
  data: string;
  descricao: string;
  documento: string;
  valor: number;
  saldo: number;
  tipo: 'entrada' | 'saida';
  categoria?: string;
}

// Função para criar chave única de transação
function createTransactionKey(transaction: Transaction): string {
  return `${transaction.data}|${transaction.descricao}|${transaction.valor}`;
}

// Função para processar base64 XLS
function processXLSFromBase64(base64Data: string, existingTransactions: Transaction[] = []): {
  newTransactions: Transaction[];
  duplicates: Transaction[];
  totalProcessed: number;
  totalNew: number;
  totalDuplicates: number;
} {
  try {
    // Decodificar base64
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Ler arquivo XLS
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Criar conjunto de chaves de transações existentes
    const existingKeys = new Set(existingTransactions.map(createTransactionKey));

    const newTransactions: Transaction[] = [];
    const duplicates: Transaction[] = [];

    // Processar cada linha (pulando cabeçalho)
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      
      if (!row || row.length < 5) continue; // Pular linhas vazias

      try {
        const dataStr = String(row[0]).trim();
        const descricao = String(row[1]).trim();
        const documento = String(row[2]).trim();
        let valorStr = String(row[3]).trim();
        let saldoStr = String(row[4]).trim();
        
        // Remover 'R$' se existir
        valorStr = valorStr.replace('R$', '').trim();
        saldoStr = saldoStr.replace('R$', '').trim();
        
        // Converter formato brasileiro (1.234,56) para formato internacional (1234.56)
        if (valorStr.includes(',') && valorStr.includes('.')) {
          valorStr = valorStr.replace(/\./g, '').replace(',', '.');
        } else if (valorStr.includes(',')) {
          valorStr = valorStr.replace(',', '.');
        }
        
        if (saldoStr.includes(',') && saldoStr.includes('.')) {
          saldoStr = saldoStr.replace(/\./g, '').replace(',', '.');
        } else if (saldoStr.includes(',')) {
          saldoStr = saldoStr.replace(',', '.');
        }

        const valor = parseFloat(valorStr) || 0;
        const saldo = parseFloat(saldoStr) || 0;

        const transaction: Transaction = {
          data: dataStr,
          descricao,
          documento,
          valor,
          saldo,
          tipo: valor < 0 ? 'saida' : 'entrada',
        };

        const key = createTransactionKey(transaction);

        if (existingKeys.has(key)) {
          duplicates.push(transaction);
        } else {
          newTransactions.push(transaction);
          existingKeys.add(key); // Adicionar à lista para evitar duplicatas dentro do mesmo arquivo
        }
      } catch (error) {
        console.warn(`Erro ao processar linha ${i}:`, error);
        continue;
      }
    }

    return {
      newTransactions,
      duplicates,
      totalProcessed: data.length - 1, // -1 para pular cabeçalho
      totalNew: newTransactions.length,
      totalDuplicates: duplicates.length,
    };
  } catch (error) {
    console.error('Erro ao processar arquivo XLS:', error);
    throw new Error(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Desconhecido'}`);
  }
}

export const uploadRouter = router({
  processXLS: publicProcedure
    .input(z.object({
      fileBase64: z.string(),
      existingTransactions: z.array(z.object({
        data: z.string(),
        descricao: z.string(),
        documento: z.string(),
        valor: z.number(),
        saldo: z.number(),
        tipo: z.enum(['entrada', 'saida']),
        categoria: z.string().optional(),
      })).optional(),
    }))
    .mutation(({ input }) => {
      return processXLSFromBase64(input.fileBase64, input.existingTransactions || []);
    }),
});
