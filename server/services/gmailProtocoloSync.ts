import { extrairDadosProtocolo, validarDadosProtocolo, type ProtocoloData } from './protocoloExtractor.js';

/**
 * Interface para resultado de sincronização
 */
export interface SincronizacaoResult {
  sucesso: boolean;
  protocolos: ProtocoloData[];
  erros: string[];
  total: number;
  processados: number;
}

/**
 * Simula busca de PDFs do Gmail (placeholder para futura integração)
 * @param diasAtras Número de dias para buscar (padrão: 30)
 * @returns Array de buffers de PDF (simulado)
 */
export async function buscarProtocolosDoGmail(diasAtras: number = 30): Promise<Buffer[]> {
  // TODO: Implementar integração com Gmail API
  // Por enquanto, retorna array vazio
  console.log(`Buscando protocolos dos últimos ${diasAtras} dias no Gmail...`);
  return [];
}

/**
 * Processa um PDF e extrai dados do protocolo
 * @param pdfBuffer Buffer do arquivo PDF
 * @returns Dados extraídos ou null se inválido
 */
export async function processarPdfProtocolo(pdfBuffer: Buffer): Promise<ProtocoloData | null> {
  try {
    // TODO: Usar biblioteca pdf-parse para extrair texto
    // Por enquanto, simular com texto vazio
    const pdfText = '';
    
    const dados = extrairDadosProtocolo(pdfText);
    
    if (!validarDadosProtocolo(dados)) {
      console.warn('Dados de protocolo inválidos:', dados);
      return null;
    }
    
    return dados;
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    return null;
  }
}

/**
 * Sincroniza protocolos do Gmail
 * @param diasAtras Número de dias para buscar
 * @returns Resultado da sincronização
 */
export async function sincronizarProtocolos(diasAtras: number = 30): Promise<SincronizacaoResult> {
  const resultado: SincronizacaoResult = {
    sucesso: true,
    protocolos: [],
    erros: [],
    total: 0,
    processados: 0
  };

  try {
    // Buscar PDFs do Gmail
    const pdfBuffers = await buscarProtocolosDoGmail(diasAtras);
    resultado.total = pdfBuffers.length;

    // Processar cada PDF
    for (const pdfBuffer of pdfBuffers) {
      try {
        const dados = await processarPdfProtocolo(pdfBuffer);
        if (dados) {
          resultado.protocolos.push(dados);
          resultado.processados++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        resultado.erros.push(`Erro ao processar PDF: ${errorMsg}`);
      }
    }

    if (resultado.processados === 0 && resultado.total > 0) {
      resultado.sucesso = false;
    }

    return resultado;
  } catch (error) {
    resultado.sucesso = false;
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    resultado.erros.push(`Erro na sincronização: ${errorMsg}`);
    return resultado;
  }
}

/**
 * Converte dados de protocolo para dados de carga
 */
export function converterProtocoloParaCarga(protocolo: ProtocoloData, pasta: string) {
  return {
    data: protocolo.data,
    rota: '',
    rotaCustom: '',
    motorista: protocolo.motorista || '',
    valorLitroDiesel: '',
    litrosCombustivel: '',
    chapa1: '',
    chapa2: '',
    custoOutros: '',
    manutencao: '',
    numeroProtocolo: protocolo.numeroProtocolo,
    valorFrete: protocolo.valorFrete.toString(),
    peso: protocolo.pesoTotal.toString(),
    clientes: protocolo.clientes.join(', ')
  };
}
