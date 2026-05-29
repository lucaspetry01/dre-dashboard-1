/**
 * Lógica de categorização inteligente de transações financeiras.
 * Portada do script Python `advanced_categorization_v2.py`.
 *
 * Aplica regras em ordem de prioridade. Cada regra usa palavras-chave
 * encontradas na descrição da transação (case-insensitive).
 */

export type Categoria =
  | 'RECEITAS OPERACIONAIS'
  | 'COMBUSTÍVEL / POSTO'
  | 'CHAPA / OPERACIONAL PF'
  | 'PRÓ-LABORE / SOCIETÁRIO'
  | 'MECÂNICA / MANUTENÇÃO'
  | 'PEDÁGIOS / TAGS'
  | 'IMPOSTOS / TRIBUTOS / OUTROS'
  | 'CONTA / BOLETO'
  | 'CONSÓRCIO / FINANCIAMENTO'
  | 'CUSTO OPERACIONAL ESPECÍFICO'
  | 'PAGAMENTOS'
  | 'SAÍDAS NÃO CATEGORIZADAS';

const CHAPA_NAMES = [
  'DOUGLAS MATOZO ALEIXO',
  'LUCAS EVERTON PETRY',
  'PAULO DILMAR DOS SANTO',
  'PABLO CEZAR MARQUES DA',
  'CLODOMIRO MATOZO ALEIX',
];

const PRO_LABORE_NAMES = ['CESAR MAURICIO MORAES', 'FRED MERCURY MORAES PE'];

const COMBUSTIVEL_KEYWORDS = [
  'POSTO', 'ABAST', 'ABASTECEDORA', 'REDE DE POSTO', 'COMBUST', 'SINOS',
  'CHAFARIZ', 'PHOENIX', 'DIESEL', 'ETANOL', 'GASOLINA', 'ABASTECIMENTO',
  'DISTRIBUIDORA DE COMBUSTIVEL', 'CONVENIENCIA', 'SIM - REDE', 'NOBRE ABASTEC',
  'SHELL', 'PETROBRAS', 'IPIRANGA', 'BR DISTRIBUIDORA', 'RAIZEN', 'VIBRA',
  'COMPRAS NACIONAIS SIM',
];

const MECANICA_KEYWORDS = [
  'MECANICA', 'MECÂNICA', 'MANUTENCAO', 'MANUTENÇÃO', 'AUTOMOTIVA', 'SULCAR',
  'FENNER', 'C M MANUTENCAO', 'OFICINA', 'AUTO PECAS', 'AUTOPEÇAS', 'BORRACHARIA',
  'PNEUS', 'SUSPENSAO', 'SUSPENSÃO', 'FREIOS', 'ELETRICA AUTOMOTIVA', 'CAMINHAO',
  'CAMIHÃO', 'SUSPENCENTER', 'COML AUTOMOTIVA',
];

const PEDAGIO_KEYWORDS = [
  'PEDAGIO', 'PEDÁGIO', 'SEM PARAR', 'CONCESSIONARIA', 'RODOVIARIA',
  'PASSAGEM PEDAGIO', 'MENSALID TAG',
];

const IMPOSTO_KEYWORDS = [
  'RECEITA FEDERAL', 'DARF', 'SIMPLES', 'TRIBUTO', 'IMPOSTO', 'ARRECADACAO',
  'DETRAN', 'IPVA', 'CEOPAG', 'OPCAO A',
  'CLARO', 'TELEFONIA', 'INTERNET', 'TELECOM',
  'TARIFA', 'CESTA', 'IOF', 'JUROS', 'ANUIDADE', 'BANCARIA', 'CHEQUE ESPECIAL',
  'DEB.CTA.FATURA', 'MARILIA MORAES PETRY',
];

const CONTA_BOLETO_KEYWORDS = [
  'LIQUIDACAO DE PARCELA', 'LIQUIDACAO BOLETO', 'BOLETO',
  'SAQUE', 'CHEQUE COMPE', 'SAQUE DINHEIRO',
  'PEDRO DA SILVA MARTINS',
];

const CONSORCIO_KEYWORDS = ['CONSORCIO', 'CONSÓRCIO', 'SERELLO', 'FINANC', 'PARCELA'];

const CUSTO_ESPECIFICO_KEYWORDS = ['GILMAR DA SILVEIRA MAC', 'OLADIR DA SILVA GUEDES'];

const PAGAMENTO_KEYWORDS = [
  'PIX', 'PAGAMENTO PIX',
  'COMPRAS', 'COMPRA', 'VE0', 'CX',
  'RESTAURANTE', 'CHURRASCARIA', 'LANCHONETE', 'ALIMENTA', 'KY DALLA',
  'SUPERMERCADO', 'MERCADO', 'PADARIA', 'PIZZARIA', 'LANCHE',
];

/**
 * Verifica se a descrição contém qualquer das palavras-chave (case-insensitive).
 */
function containsAny(desc: string, keywords: string[]): boolean {
  return keywords.some((kw) => desc.includes(kw));
}

/**
 * Categoriza uma transação com base na descrição e valor.
 *
 * Ordem de prioridade (importante):
 * 1. Receitas (valor > 0)
 * 2. Impostos/Tributos (vem antes de Combustível pois IMPOSTOS contém POSTO)
 * 3. Pedágios/Tags
 * 4. Combustível/Posto
 * 5. Chapa
 * 6. Pró-labore
 * 7. Mecânica
 * 8. Conta/Boleto
 * 9. Consórcio
 * 10. Custo específico
 * 11. Pagamentos (genérico - PIX, compras)
 * 12. Não categorizado
 */
export function categorizar(descricao: string, valor: number): Categoria {
  // 1. Receitas
  if (valor > 0) {
    return 'RECEITAS OPERACIONAIS';
  }

  const desc = descricao.toUpperCase();

  // 2. Impostos / Tributos / Outros (ANTES de Combustível pois IMPOSTOS contém POSTO)
  if (containsAny(desc, IMPOSTO_KEYWORDS)) {
    return 'IMPOSTOS / TRIBUTOS / OUTROS';
  }

  // 3. Pedágios / Tags (antes de combustível pois algumas tags têm 'TAG')
  if (containsAny(desc, PEDAGIO_KEYWORDS) || /\bTAG\b/.test(desc)) {
    return 'PEDÁGIOS / TAGS';
  }

  // 4. Combustível / Posto (palavra SIM isolada também é combustível)
  if (containsAny(desc, COMBUSTIVEL_KEYWORDS) || /\bSIM\b/.test(desc)) {
    return 'COMBUSTÍVEL / POSTO';
  }

  // 5. Chapa
  if (CHAPA_NAMES.some((name) => desc.includes(name))) {
    return 'CHAPA / OPERACIONAL PF';
  }

  // 6. Pró-labore
  if (PRO_LABORE_NAMES.some((name) => desc.includes(name))) {
    return 'PRÓ-LABORE / SOCIETÁRIO';
  }

  // 7. Mecânica
  if (containsAny(desc, MECANICA_KEYWORDS) || desc.includes('VALMOR GODOI MACHADO')) {
    return 'MECÂNICA / MANUTENÇÃO';
  }

  // 8. Conta / Boleto
  if (containsAny(desc, CONTA_BOLETO_KEYWORDS)) {
    return 'CONTA / BOLETO';
  }

  // 9. Consórcio / Financiamento
  if (containsAny(desc, CONSORCIO_KEYWORDS)) {
    return 'CONSÓRCIO / FINANCIAMENTO';
  }

  // 10. Custo Operacional Específico
  if (containsAny(desc, CUSTO_ESPECIFICO_KEYWORDS)) {
    return 'CUSTO OPERACIONAL ESPECÍFICO';
  }

  // 11. Pagamentos (PIX, compras, alimentação)
  if (containsAny(desc, PAGAMENTO_KEYWORDS)) {
    return 'PAGAMENTOS';
  }

  // 12. Default
  return 'SAÍDAS NÃO CATEGORIZADAS';
}
