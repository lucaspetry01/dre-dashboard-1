import { getDb } from '../db.js';
import { protocolosSincronizados } from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { extrairDadosProtocolo, validarDadosProtocolo, type ProtocoloData } from './protocoloExtractor.js';

/**
 * Interface para resultado de busca do Gmail
 */
export interface GmailSearchResult {
  messageId: string;
  from: string;
  subject: string;
  date: Date;
  attachments: Array<{
    filename: string;
    mimeType: string;
    data: Buffer;
  }>;
}

/**
 * Busca PDFs de protocolos no Gmail dos últimos N dias
 * TODO: Implementar integração real com Gmail API
 * Por enquanto, retorna array vazio
 */
export async function buscarProtocolosDoGmail(diasAtras: number = 30): Promise<GmailSearchResult[]> {
  try {
    console.log(`Buscando protocolos do Gmail dos últimos ${diasAtras} dias...`);
    
    // TODO: Integrar com Gmail API v1
    // const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    // const query = `from:noreply@transportadora.com.br after:${dataInicio} before:${dataFim} has:attachment filename:protocolo`;
    // const response = await gmail.users.messages.list({ userId: 'me', q: query });
    
    // Por enquanto, retorna array vazio
    return [];
  } catch (error) {
    console.error('Erro ao buscar protocolos do Gmail:', error);
    throw error;
  }
}

/**
 * Valida se protocolo já foi sincronizado
 */
export async function verificarDuplicata(numeroProtocolo: string): Promise<boolean> {
  try {
    const db = getDb();
    const resultado = await db
      .select()
      .from(protocolosSincronizados)
      .where(eq(protocolosSincronizados.numeroProtocolo, numeroProtocolo))
      .limit(1);
    
    return resultado.length > 0;
  } catch (error) {
    console.error('Erro ao verificar duplicata:', error);
    return false;
  }
}

/**
 * Salva protocolo sincronizado no banco
 */
export async function salvarProtocoloSincronizado(
  protocolo: ProtocoloData,
  gmailMessageId: string,
  pdfUrl?: string
) {
  try {
    const db = getDb();
    
    // Verificar se já existe
    const existe = await verificarDuplicata(protocolo.numeroProtocolo);
    if (existe) {
      console.warn(`Protocolo ${protocolo.numeroProtocolo} já foi sincronizado`);
      return null;
    }
    
    // Inserir novo protocolo
    const resultado = await db.insert(protocolosSincronizados).values({
      numeroProtocolo: protocolo.numeroProtocolo,
      data: protocolo.data,
      valorFrete: protocolo.valorFrete.toString(),
      pesoTotal: protocolo.pesoTotal.toString(),
      clientes: protocolo.clientes.join(', '),
      motorista: protocolo.motorista || null,
      gmailMessageId,
      pdfUrl: pdfUrl || null,
    });
    
    return resultado;
  } catch (error) {
    console.error('Erro ao salvar protocolo sincronizado:', error);
    throw error;
  }
}

/**
 * Processa PDF extraído do Gmail
 */
export async function processarPdfProtocolo(pdfBuffer: Buffer, gmailMessageId: string, pdfUrl?: string): Promise<ProtocoloData | null> {
  try {
    // TODO: Usar biblioteca pdf-parse para extrair texto do PDF
    // const pdfData = await pdf(pdfBuffer);
    // const pdfText = pdfData.text;
    
    // Por enquanto, simular com texto vazio
    const pdfText = '';
    
    const dados = extrairDadosProtocolo(pdfText);
    
    if (!validarDadosProtocolo(dados)) {
      console.warn('Dados de protocolo inválidos:', dados);
      return null;
    }
    
    // Salvar no banco se válido
    await salvarProtocoloSincronizado(dados, gmailMessageId, pdfUrl);
    
    return dados;
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    return null;
  }
}

/**
 * Sincroniza todos os protocolos do Gmail
 */
export async function sincronizarTodosProtocolos(diasAtras: number = 30) {
  try {
    const resultados: ProtocoloData[] = [];
    const erros: string[] = [];
    
    // Buscar emails do Gmail
    const emails = await buscarProtocolosDoGmail(diasAtras);
    
    // Processar cada email
    for (const email of emails) {
      for (const attachment of email.attachments) {
        if (attachment.mimeType === 'application/pdf') {
          try {
            const protocolo = await processarPdfProtocolo(
              attachment.data,
              email.messageId,
              `gmail://${email.messageId}/${attachment.filename}`
            );
            
            if (protocolo) {
              resultados.push(protocolo);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            erros.push(`Erro ao processar ${attachment.filename}: ${msg}`);
          }
        }
      }
    }
    
    return {
      sucesso: erros.length === 0,
      protocolos: resultados,
      erros,
      total: emails.length,
      processados: resultados.length
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      sucesso: false,
      protocolos: [],
      erros: [`Erro na sincronização: ${msg}`],
      total: 0,
      processados: 0
    };
  }
}

/**
 * Obtém protocolos sincronizados para pré-preenchimento de formulário
 */
export async function obterProtocolosSincronizados(dataInicio?: string, dataFim?: string) {
  try {
    const db = getDb();
    let query = db.select().from(protocolosSincronizados);
    
    if (dataInicio && dataFim) {
      query = query.where(
        (t) => t.data >= dataInicio && t.data <= dataFim
      );
    }
    
    const protocolos = await query;
    return protocolos;
  } catch (error) {
    console.error('Erro ao obter protocolos sincronizados:', error);
    return [];
  }
}
