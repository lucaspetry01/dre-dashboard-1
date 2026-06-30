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
 */
export async function buscarProtocolosDoGmail(diasAtras: number = 30): Promise<GmailSearchResult[]> {
  try {
    console.log(`Buscando protocolos do Gmail dos últimos ${diasAtras} dias...`);
    
    const dataFim = new Date();
    const dataInicio = new Date(dataFim.getTime() - diasAtras * 24 * 60 * 60 * 1000);
    const formatoData = (d: Date) => d.toISOString().split('T')[0];
    
    const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;
    
    if (!forgeApiUrl || !forgeApiKey) {
      throw new Error('Credenciais do Manus não configuradas');
    }
    
    const query = `has:attachment filename:pdf after:${formatoData(dataInicio)} before:${formatoData(dataFim)}`;
    
    const response = await fetch(`${forgeApiUrl}/gmail/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${forgeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        maxResults: 50,
        includeAttachments: true,
      }),
    });
    
    if (!response.ok) {
      console.warn(`Gmail API retornou ${response.status}: ${response.statusText}. Retornando array vazio.`);
      return [];
    }
    
    const data = await response.json();
    const messages = data.messages || [];
    
    const resultados: GmailSearchResult[] = [];
    
    for (const msg of messages) {
      const attachments = msg.attachments?.filter((att: any) => att.filename?.toLowerCase().endsWith('.pdf')) || [];
      
      if (attachments.length > 0) {
        resultados.push({
          messageId: msg.id,
          from: msg.from || '',
          subject: msg.subject || '',
          date: new Date(msg.date),
          attachments: attachments.map((att: any) => ({
            filename: att.filename,
            mimeType: att.mimeType,
            data: Buffer.from(att.data, 'base64'),
          })),
        });
      }
    }
    
    console.log(`Encontrados ${resultados.length} e-mail(s) com PDF(s) de protocolo`);
    return resultados;
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
 * Sincroniza protocolos do Gmail
 */
export async function sincronizarProtocolosDoGmail(diasAtras: number = 30) {
  try {
    const gmailResults = await buscarProtocolosDoGmail(diasAtras);
    const db = getDb();
    const protocolosProcessados: any[] = [];
    let sucessos = 0;
    let erros: string[] = [];
    
    for (const result of gmailResults) {
      for (const attachment of result.attachments) {
        try {
          const dados = extrairDadosProtocolo(attachment.data);
          
          if (!validarDadosProtocolo(dados)) {
            erros.push(`Protocolo inválido em ${attachment.filename}`);
            continue;
          }
          
          const isDuplicate = await verificarDuplicata(dados.numeroProtocolo);
          
          if (!isDuplicate) {
            await db.insert(protocolosSincronizados).values({
              numeroProtocolo: dados.numeroProtocolo,
              data: dados.data,
              valorFrete: dados.valorFrete,
              peso: dados.peso,
              motorista: dados.motorista || '',
              emitente: dados.emitente || '',
              cnpj: dados.cnpj || '',
              sincronizadoEm: new Date(),
            });
            sucessos++;
          }
          
          protocolosProcessados.push({
            id: dados.numeroProtocolo,
            numeroProtocolo: dados.numeroProtocolo,
            data: dados.data,
            valorFrete: dados.valorFrete,
            peso: dados.peso,
            motorista: dados.motorista,
            isDuplicate,
          });
        } catch (err) {
          erros.push(`Erro ao processar ${attachment.filename}: ${err}`);
        }
      }
    }
    
    return {
      sucesso: true,
      processados: sucessos,
      protocolos: protocolosProcessados,
      erros,
    };
  } catch (error) {
    console.error('Erro ao sincronizar protocolos:', error);
    return {
      sucesso: false,
      processados: 0,
      protocolos: [],
      erros: [String(error)],
    };
  }
}
