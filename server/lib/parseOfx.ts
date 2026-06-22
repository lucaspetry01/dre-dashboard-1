/**
 * Parser de extratos OFX (Open Financial Exchange).
 *
 * O formato OFX é o padrão usado por bancos brasileiros (Sicredi, Itaú, BB, etc.)
 * para exportar extratos. É um XML estruturado que contém:
 * - DTPOSTED: data da transação (formato YYYYMMDDHHMMSS)
 * - TRNAMT: valor (negativo = saída, positivo = entrada)
 * - MEMO/NAME: descrição
 * - FITID: identificador único da transação no banco (perfeito para deduplicação)
 *
 * Esta implementação faz parsing manual usando regex para evitar dependências
 * pesadas e ter controle total sobre o formato.
 */

export interface OfxTransaction {
  fitId: string;
  data: string; // formato DD/MM/YYYY
  dataTimestamp: Date;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  saldo?: number; // Saldo após a transação (se disponível no OFX)
}

export interface OfxParseResult {
  bankId?: string;
  accountId?: string;
  agencia?: string; // Agência extraída da conta
  cnpj?: string; // CNPJ da empresa
  periodoInicio?: string;
  periodoFim?: string;
  saldoFinal?: number; // Saldo final da conta (LEDGERBAL/BALAMT)
  transactions: OfxTransaction[];
}

/**
 * Mapeamento de agência/conta para CNPJ.
 * Usado quando o OFX não contém CNPJ explicitamente.
 */
const accountToCnpjMap: Record<string, string> = {
  '0101300855': '51.621.925/0001-90', // MMP - Sicredi
  // Adicione outros mapeamentos conforme necessário
};

/**
 * Converte data OFX (YYYYMMDD ou YYYYMMDDHHMMSS) para Date.
 */
function parseOfxDate(raw: string): Date {
  const clean = raw.trim().replace(/\[.*\]/g, ''); // Remove [-3:BRT]
  const year = parseInt(clean.slice(0, 4), 10);
  const month = parseInt(clean.slice(4, 6), 10) - 1; // JS month is 0-indexed
  const day = parseInt(clean.slice(6, 8), 10);
  const hour = clean.length >= 10 ? parseInt(clean.slice(8, 10), 10) : 12;
  const min = clean.length >= 12 ? parseInt(clean.slice(10, 12), 10) : 0;
  return new Date(year, month, day, hour, min, 0);
}

/**
 * Formata Date para string DD/MM/YYYY.
 */
function formatDateBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Extrai conteúdo de uma tag OFX. Suporta tanto formato com fechamento explícito
 * (<TAG>valor</TAG>) quanto formato SGML legado (<TAG>valor sem fechamento).
 */
function extractTag(block: string, tag: string): string | undefined {
  // Formato XML completo
  const xmlRegex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const xmlMatch = block.match(xmlRegex);
  if (xmlMatch) return xmlMatch[1].trim();

  // Formato SGML legado (sem fechamento, valor até próxima tag ou fim de linha)
  const sgmlRegex = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i');
  const sgmlMatch = block.match(sgmlRegex);
  if (sgmlMatch) return sgmlMatch[1].trim();

  return undefined;
}

/**
 * Faz parse de um arquivo OFX (em string) e retorna lista de transações.
 */
export function parseOfx(ofxContent: string): OfxParseResult {
  // Normalizar quebras de linha
  const content = ofxContent.replace(/\r\n/g, '\n');

  // Extrair informações da conta
  let bankId = extractTag(content, 'BANKID');
  let accountId = extractTag(content, 'ACCTID');
  let cnpj = extractTag(content, 'IDSCOPE'); // CNPJ vem em IDSCOPE no OFX
  
  // Normalizar bankId: remover zeros à esquerda e formatar como 3 dígitos
  if (bankId) {
    const bankNum = parseInt(bankId.trim(), 10);
    bankId = bankNum.toString().padStart(3, '0');
  }
  
  // Tentar extrair CNPJ de outras tags se IDSCOPE estiver vazio
  if (!cnpj || cnpj.trim().length === 0) {
    cnpj = extractTag(content, 'IDORG'); // Alternativa: IDORG
  }
  if (!cnpj || cnpj.trim().length === 0) {
    // Procurar por padrão CNPJ no formato XX.XXX.XXX/XXXX-XX
    const cnpjMatch = content.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
    if (cnpjMatch) cnpj = cnpjMatch[1];
  }
  
  // Limpar accountId: remover caracteres especiais e espaços
  let cleanAccountId = '';
  if (accountId) {
    cleanAccountId = accountId.trim().replace(/[^0-9]/g, '');
  }
  
  // Extrair agência (primeiros 4 dígitos) e conta (últimos 7 dígitos)
  let agencia = '';
  let formattedAccount = '';
  
  if (cleanAccountId.length >= 4) {
    agencia = cleanAccountId.substring(0, 4);
    // Pega os dígitos após agência e formata como XXXXX-X (5 dígitos + hífen + 1 dígito verificador)
    const accountPart = cleanAccountId.substring(4);
    if (accountPart.length >= 6) {
      // Pega os últimos 6 dígitos (5 + verificador)
      const lastSix = accountPart.substring(accountPart.length - 6);
      formattedAccount = lastSix.substring(0, 5) + '-' + lastSix.substring(5);
    }
  }
  
  // Se CNPJ ainda está vazio, tentar usar mapeamento de agência/conta
  if (!cnpj || cnpj.trim().length === 0) {
    const accountKey = cleanAccountId.substring(4); // Pega tudo após agência
    if (accountKey && accountToCnpjMap[agencia + accountKey]) {
      cnpj = accountToCnpjMap[agencia + accountKey];
    }
  }
  
  // Usar conta formatada se disponível, senão usar limpeza simples
  accountId = formattedAccount || cleanAccountId;

  // Período do extrato
  const dtStartRaw = extractTag(content, 'DTSTART');
  const dtEndRaw = extractTag(content, 'DTEND');
  const periodoInicio = dtStartRaw ? formatDateBR(parseOfxDate(dtStartRaw)) : undefined;
  const periodoFim = dtEndRaw ? formatDateBR(parseOfxDate(dtEndRaw)) : undefined;

  // Extrair saldo final da conta (LEDGERBAL/BALAMT ou AVAILBAL/BALAMT)
  let saldoFinal: number | undefined;
  const ledgerBalBlock = content.match(/<LEDGERBAL>([\s\S]*?)<\/LEDGERBAL>/i);
  if (ledgerBalBlock) {
    const balAmtRaw = extractTag(ledgerBalBlock[1], 'BALAMT');
    if (balAmtRaw) {
      saldoFinal = parseFloat(balAmtRaw.replace(',', '.'));
    }
  }
  // Fallback para AVAILBAL se LEDGERBAL não existir
  if (saldoFinal === undefined) {
    const availBalBlock = content.match(/<AVAILBAL>([\s\S]*?)<\/AVAILBAL>/i);
    if (availBalBlock) {
      const balAmtRaw = extractTag(availBalBlock[1], 'BALAMT');
      if (balAmtRaw) {
        saldoFinal = parseFloat(balAmtRaw.replace(',', '.'));
      }
    }
  }

  // Extrair todas as transações <STMTTRN>...</STMTTRN>
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const transactions: OfxTransaction[] = [];

  let match: RegExpExecArray | null;
  while ((match = stmttrnRegex.exec(content)) !== null) {
    const block = match[1];

    const fitId = extractTag(block, 'FITID');
    const dtPosted = extractTag(block, 'DTPOSTED');
    const trnAmt = extractTag(block, 'TRNAMT');
    const memo = extractTag(block, 'MEMO') || extractTag(block, 'NAME') || '';
    const balAmtRaw = extractTag(block, 'BALAMT'); // Saldo após a transação

    if (!fitId || !dtPosted || !trnAmt) continue;

    // Valor: pode vir com vírgula ou ponto decimal
    const valor = parseFloat(trnAmt.replace(',', '.'));
    if (isNaN(valor)) continue;

    const dataTimestamp = parseOfxDate(dtPosted);
    const data = formatDateBR(dataTimestamp);

    // Extrair saldo se disponível
    let saldo: number | undefined;
    if (balAmtRaw) {
      const saldoValue = parseFloat(balAmtRaw.replace(',', '.'));
      if (!isNaN(saldoValue)) {
        saldo = saldoValue;
      }
    }

    transactions.push({
      fitId: fitId.trim(),
      data,
      dataTimestamp,
      descricao: memo.trim(),
      valor,
      tipo: valor < 0 ? 'saida' : 'entrada',
      saldo,
    });
  }

  return {
    bankId,
    accountId,
    agencia,
    cnpj,
    periodoInicio,
    periodoFim,
    saldoFinal,
    transactions,
  };
}
