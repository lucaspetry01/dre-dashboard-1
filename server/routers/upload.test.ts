import { describe, expect, it } from "vitest";
import * as XLSX from 'xlsx';

// Função para criar chave única de transação
function createTransactionKey(transaction: any): string {
  return `${transaction.data}|${transaction.descricao}|${transaction.valor}`;
}

// Função para processar base64 XLS
function processXLSFromBase64(base64Data: string, existingTransactions: any[] = []): any {
  try {
    // Decodificar base64
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Ler arquivo XLS
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Criar conjunto de chaves de transações existentes
    const existingKeys = new Set(existingTransactions.map(createTransactionKey));

    const newTransactions: any[] = [];
    const duplicates: any[] = [];

    // Processar cada linha (pulando cabeçalho)
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      
      if (!row || row.length < 5) continue;

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

        const transaction: any = {
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
          existingKeys.add(key);
        }
      } catch (error) {
        console.warn(`Erro ao processar linha ${i}:`, error);
        continue;
      }
    }

    return {
      newTransactions,
      duplicates,
      totalProcessed: data.length - 1,
      totalNew: newTransactions.length,
      totalDuplicates: duplicates.length,
    };
  } catch (error) {
    console.error('Erro ao processar arquivo XLS:', error);
    throw new Error(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Desconhecido'}`);
  }
}

describe("upload.processXLS", () => {
  it("detecta duplicatas corretamente", () => {
    // Criar dados de teste
    const existingTransactions = [
      {
        data: "27/04/2026",
        descricao: "PIX TATIANE CORREA",
        documento: "",
        valor: -20,
        saldo: 100,
        tipo: "saida"
      }
    ];

    // Criar arquivo XLS com uma duplicata e um novo registro
    const ws = XLSX.utils.aoa_to_sheet([
      ["Data", "Descricao", "Documento", "Valor", "Saldo"],
      ["27/04/2026", "PIX TATIANE CORREA", "", "-20", "100"],
      ["28/04/2026", "PIX MARCELO SANTOS", "", "-50", "50"]
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const base64Data = buffer.toString('base64');

    // Processar
    const result = processXLSFromBase64(base64Data, existingTransactions);

    expect(result.totalDuplicates).toBe(1);
    expect(result.totalNew).toBe(1);
    expect(result.newTransactions).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
  });

  it("processa novos registros corretamente", () => {
    // Criar arquivo XLS com novos registros
    const ws = XLSX.utils.aoa_to_sheet([
      ["Data", "Descricao", "Documento", "Valor", "Saldo"],
      ["27/04/2026", "DEPOSITO", "", "1000", "1000"],
      ["28/04/2026", "PIX FORNECEDOR", "", "-500", "500"]
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const base64Data = buffer.toString('base64');

    // Processar
    const result = processXLSFromBase64(base64Data, []);

    expect(result.totalNew).toBe(2);
    expect(result.totalDuplicates).toBe(0);
    expect(result.newTransactions).toHaveLength(2);
    expect(result.newTransactions[0].tipo).toBe('entrada');
    expect(result.newTransactions[1].tipo).toBe('saida');
  });

  it("formata valores monetários corretamente", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Data", "Descricao", "Documento", "Valor", "Saldo"],
      ["27/04/2026", "TESTE", "", "1234.56", "5000"],
      ["28/04/2026", "TESTE2", "", "-789.12", "4210.88"]
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const base64Data = buffer.toString('base64');

    const result = processXLSFromBase64(base64Data, []);

    expect(result.newTransactions[0].valor).toBe(1234.56);
    expect(result.newTransactions[1].valor).toBe(-789.12);
    expect(result.newTransactions[0].saldo).toBe(5000);
    expect(result.newTransactions[1].saldo).toBe(4210.88);
  });

  it("ignora linhas vazias", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Data", "Descricao", "Documento", "Valor", "Saldo"],
      ["27/04/2026", "TESTE", "", "100", "100"],
      [],
      ["28/04/2026", "TESTE2", "", "200", "300"]
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const base64Data = buffer.toString('base64');

    const result = processXLSFromBase64(base64Data, []);

    expect(result.totalNew).toBe(2);
    expect(result.newTransactions).toHaveLength(2);
  });
});
