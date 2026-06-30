import { getDb } from '../db.js';
import { protocolosSincronizados } from '../../drizzle/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
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
 * Extrai o texto de um PDF (Buffer) usando pdf-parse
 */
async function extrairTextoPdf(buffer: Buffer): Promise<string> {
  try {
    const mod: any = await import('pdf-parse');
    const pdfParse = mod.default || mod;
    const result = await pdfParse(buffer);
    return result.text || '';
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    return '';
  }
}

/**
 * Busca PDFs de protocolos no Gmail dos últimos N dias
 * Tenta usar o Google OAuth token se disponível, senão usa Forge API como fallback
 */
export async function buscarProtocolosDoGmail(diasAtras: number = 30, googleAccessToken?: string): Promise<GmailSearchResult[]> {
  try {
    console.log(`Buscando protocolos do Gmail dos últimos ${diasAtras} dias...`);

    const dataFim = new Date();
    const dataInicio = new Date(dataFim.getTime() - diasAtras * 24 * 60 * 60 * 1000);
    const formatoData = (d: Date) => d.toISOString().split('T')[0];

    // Se temos token do Google OAuth, usa a API do Google diretamente
    if (googleAccessToken) {
      return await buscarProtocolosComGoogleAPI(googleAccessToken, dataInicio, dataFim);
    }

    // Fallback: usa Forge API do Manus
    const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

    if (!forgeApiUrl || !forgeApiKey) {
      console.warn('Credenciais do Manus não configuradas. Retornando array vazio.');
      return [];
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
      const attachments = (msg.attachments || []).filter(
        (att: any) => att.filename?.toLowerCase().endsWith('.pdf')
      );

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
    return [];
  }
}

/**
 * Busca protocolos usando Google Gmail API diretamente com token OAuth
 */
async function buscarProtocolosComGoogleAPI(accessToken: string, dataInicio: Date, dataFim: Date): Promise<GmailSearchResult[]> {
  try {
    const { getGmailClient } = await import('./googleOAuthService.js');
    const gmail = getGmailClient(accessToken);

    const formatoData = (d: Date) => d.toISOString().split('T')[0];
    const query = `has:attachment filename:pdf after:${formatoData(dataInicio)} before:${formatoData(dataFim)}`;

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50,
    });

    const messages = response.data.messages || [];
    const resultados: GmailSearchResult[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;

      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = fullMessage.data.payload?.headers || [];
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const date = new Date(headers.find((h: any) => h.name === 'Date')?.value || new Date());

      const attachments: Array<{ filename: string; mimeType: string; data: Buffer }> = [];

      // Procura por attachments
      const parts = fullMessage.data.payload?.parts || [];
      for (const part of parts) {
        if (part.filename && part.filename.toLowerCase().endsWith('.pdf')) {
          const attachment = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: msg.id,
            id: part.body?.attachmentId || '',
          });

          const data = attachment.data.data || '';
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType || 'application/pdf',
            data: Buffer.from(data, 'base64'),
          });
        }
      }

      if (attachments.length > 0) {
        resultados.push({
          messageId: msg.id,
          from,
          subject,
          date,
          attachments,
        });
      }
    }

    console.log(`Encontrados ${resultados.length} e-mail(s) com PDF(s) de protocolo via Google API`);
    return resultados;
  } catch (error) {
    console.error('Erro ao buscar protocolos via Google API:', error);
    return [];
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
 * Sincroniza protocolos do Gmail: busca PDFs, extrai dados, grava novos protocolos
 */
export async function sincronizarProtocolosDoGmail(diasAtras: number = 30, googleAccessToken?: string) {
  try {
    const gmailResults = await buscarProtocolosDoGmail(diasAtras, googleAccessToken);
    const db = getDb();
    const protocolosProcessados: any[] = [];
    const erros: string[] = [];
    let novos = 0;
    let duplicados = 0;

    for (const result of gmailResults) {
      for (const attachment of result.attachments) {
        try {
          const texto = await extrairTextoPdf(attachment.data);
          const dados: ProtocoloData = extrairDadosProtocolo(texto);

          if (!validarDadosProtocolo(dados)) {
            erros.push(`Dados inválidos em ${attachment.filename}`);
            continue;
          }

          const isDuplicate = await verificarDuplicata(dados.numeroProtocolo);

          if (!isDuplicate) {
            await db.insert(protocolosSincronizados).values({
              numeroProtocolo: dados.numeroProtocolo,
              data: dados.data,
              valorFrete: String(dados.valorFrete),
              pesoTotal: String(dados.pesoTotal),
              clientes: JSON.stringify(dados.clientes || []),
              motorista: dados.motorista || null,
              gmailMessageId: result.messageId,
              pdfUrl: null,
            });
            novos++;
          } else {
            duplicados++;
          }

          protocolosProcessados.push({
            id: dados.numeroProtocolo,
            numeroProtocolo: dados.numeroProtocolo,
            data: dados.data,
            valorFrete: dados.valorFrete,
            pesoTotal: dados.pesoTotal,
            clientes: dados.clientes,
            motorista: dados.motorista || '',
            isDuplicate,
          });
        } catch (err) {
          erros.push(`Erro ao processar ${attachment.filename}: ${err}`);
        }
      }
    }

    return {
      sucesso: true,
      processados: novos,
      novos,
      duplicados,
      protocolos: protocolosProcessados,
      erros,
    };
  } catch (error) {
    console.error('Erro ao sincronizar protocolos:', error);
    return {
      sucesso: false,
      processados: 0,
      novos: 0,
      duplicados: 0,
      protocolos: [],
      erros: [String(error)],
    };
  }
}

/**
 * Obtém protocolos sincronizados do banco, com filtro de data opcional
 */
export async function obterProtocolosSincronizados(dataInicio?: string, dataFim?: string) {
  try {
    const db = getDb();
    const condicoes = [];

    if (dataInicio) {
      condicoes.push(gte(protocolosSincronizados.data, dataInicio));
    }
    if (dataFim) {
      condicoes.push(lte(protocolosSincronizados.data, dataFim));
    }

    const query = db.select().from(protocolosSincronizados);

    const resultado = condicoes.length > 0
      ? await query.where(and(...condicoes))
      : await query;

    return resultado.map((p) => ({
      ...p,
      clientes: (() => {
        try {
          return JSON.parse(p.clientes);
        } catch {
          return [];
        }
      })(),
    }));
  } catch (error) {
    console.error('Erro ao obter protocolos sincronizados:', error);
    return [];
  }
}
