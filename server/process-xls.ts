import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface Transaction {
  data: string;
  descricao: string;
  documento: string;
  valor: number;
  saldo: number;
  tipo: 'entrada' | 'saida';
}

interface ProcessResult {
  newTransactions: Transaction[];
  duplicates: Transaction[];
  totalProcessed: number;
  totalNew: number;
  totalDuplicates: number;
}

// Função para normalizar data (dd/mm/yyyy para ISO string)
function normalizeDate(dateStr: string): string {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

// Função para criar chave única de transação (para detectar duplicatas)
function createTransactionKey(transaction: Transaction): string {
  return `${transaction.data}|${transaction.descricao}|${transaction.valor}`;
}

// Função para processar arquivo XLS
export async function processXLSFile(filePath: string, existingTransactions: Transaction[] = []): Promise<ProcessResult> {
  try {
    // Ler arquivo XLS
    const workbook = XLSX.readFile(filePath);
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

      const transaction: Transaction = {
        data: String(row[0]).trim(),
        descricao: String(row[1]).trim(),
        documento: String(row[2]).trim(),
        valor: parseFloat(String(row[3]).replace('R$', '').replace('.', '').replace(',', '.')) || 0,
        saldo: parseFloat(String(row[4]).replace('R$', '').replace('.', '').replace(',', '.')) || 0,
        tipo: parseFloat(String(row[3])) < 0 ? 'saida' : 'entrada',
      };

      const key = createTransactionKey(transaction);

      if (existingKeys.has(key)) {
        duplicates.push(transaction);
      } else {
        newTransactions.push(transaction);
        existingKeys.add(key); // Adicionar à lista para evitar duplicatas dentro do mesmo arquivo
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

// Função para mesclar transações (remover duplicatas)
export function mergeTransactions(existing: Transaction[], newOnes: Transaction[]): Transaction[] {
  const existingKeys = new Set(existing.map(createTransactionKey));
  
  const merged = [...existing];
  
  for (const transaction of newOnes) {
    const key = createTransactionKey(transaction);
    if (!existingKeys.has(key)) {
      merged.push(transaction);
      existingKeys.add(key);
    }
  }

  return merged;
}
