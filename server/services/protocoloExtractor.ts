/**
 * Interface para dados extraídos de protocolo
 */
export interface ProtocoloData {
  numeroProtocolo: string;
  data: string; // YYYY-MM-DD
  valorFrete: number;
  pesoTotal: number;
  clientes: string[];
  motorista?: string;
  transportadora?: string;
}

/**
 * Extrai dados de um PDF de protocolo usando regex
 * @param pdfText Texto extraído do PDF
 * @returns Dados extraídos do protocolo
 */
export function extrairDadosProtocolo(pdfText: string): ProtocoloData {
  try {
    // Extrair número do protocolo. No layout real, o rótulo "Protocolo:" aparece
    // e o número (4+ dígitos) vem em uma linha seguinte. Evita capturar o "1" de "1 / 1".
    const protocoloMatch =
      pdfText.match(/Protocolo:\s*[\r\n]+[\s\S]*?(\d{4,})/i) ||
      pdfText.match(/Protocolo[:\s]+(\d{4,})/i) ||
      pdfText.match(/Protocolo[:\s]+([\d]+)/i);
    const numeroProtocolo = protocoloMatch ? protocoloMatch[1] : '';

    // Extrair data (formato: "26 de julho de 2026" ou "26/07/2026")
    const dataMatch = pdfText.match(/([\d]{1,2})\s+de\s+(\w+)\s+de\s+([\d]{4})/i) || 
                      pdfText.match(/([\d]{1,2})\/([\d]{1,2})\/([\d]{4})/);
    let data = '';
    if (dataMatch) {
      if (dataMatch[2].match(/[\d]/)) {
        // Formato DD/MM/YYYY
        data = `${dataMatch[3]}-${dataMatch[2].padStart(2, '0')}-${dataMatch[1].padStart(2, '0')}`;
      } else {
        // Formato "26 de julho de 2026"
        const meses: Record<string, string> = {
          janeiro: '01', fevereiro: '02', março: '03', abril: '04',
          maio: '05', junho: '06', julho: '07', agosto: '08',
          setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
        };
        const mes = meses[dataMatch[2].toLowerCase()] || '01';
        data = `${dataMatch[3]}-${mes}-${dataMatch[1].padStart(2, '0')}`;
      }
    }

    // Extrair valor total do frete (formato: "Valor Total Frete: 586,84")
    const valorMatch = pdfText.match(/Valor\s+Total\s+Frete[:\s]+R?\$?\s*([\d.,]+)/i);
    const valorFrete = valorMatch ? parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

    // Extrair peso total (formato: "Peso Bruto Total: 2.600,00")
    const pesoMatch = pdfText.match(/Peso\s+(?:Bruto\s+)?Total[:\s]+R?\$?\s*([\d.,]+)/i);
    const pesoTotal = pesoMatch ? parseFloat(pesoMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

    // Extrair clientes (procura por nomes em maiúsculas)
    const clientesMatch = pdfText.match(/(?:COMPANHIA|MADERO|[A-Z\s]{10,})\s+(?:LTDA|LTDA\s+ME|S\.A\.)?/g);
    const clientes = clientesMatch ? clientesMatch.map(c => c.trim()).filter(c => c.length > 0) : [];

    // Extrair motorista
    const motoristaMatch = pdfText.match(/Motorista[:\s]+([^\n]+)/i);
    const motorista = motoristaMatch ? motoristaMatch[1].trim() : '';

    // Extrair transportadora
    const transportadoraMatch = pdfText.match(/Transportador[:\s]+([^\n]+)/i);
    const transportadora = transportadoraMatch ? transportadoraMatch[1].trim() : '';

    return {
      numeroProtocolo,
      data,
      valorFrete,
      pesoTotal,
      clientes,
      motorista,
      transportadora
    };
  } catch (error) {
    console.error('Erro ao extrair dados do protocolo:', error);
    throw new Error('Falha ao processar PDF do protocolo');
  }
}

/**
 * Valida se os dados extraídos são válidos
 */
export function validarDadosProtocolo(dados: ProtocoloData): boolean {
  return !!(
    dados.numeroProtocolo &&
    dados.data &&
    dados.valorFrete > 0 &&
    dados.pesoTotal > 0
  );
}
