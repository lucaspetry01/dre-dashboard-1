/**
 * Funções utilitárias para filtros e transformações do Dashboard
 * Extraído do Dashboard.tsx para reutilização e testes
 */

// Extrair nome próprio da descrição (remove CNPJ/CPF)
export const extractNomeProprio = (descricao: string): string => {
  const parts = descricao.trim().split(/\s+/);
  let cpfCnpjIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].replace(/[^0-9]/g, '');
    if (part.length === 11 || part.length === 14) {
      cpfCnpjIndex = i;
      break;
    }
  }
  if (cpfCnpjIndex !== -1 && cpfCnpjIndex < parts.length - 1) {
    return parts.slice(cpfCnpjIndex + 1).join(' ');
  }
  return descricao;
};

// Simplificar nomes de categorias para exibição
export const simplifyCategoriName = (name: string): string => {
  const mappings: Record<string, string> = {
    'RECEITAS OPERACIONAIS': 'Receita',
    'CONTA / BOLETO': 'Boleto',
    'COMBUSTÍVEL / POSTO': 'Combustível',
    'PAGAMENTOS': 'Pagamentos',
    'IMPOSTOS / TRIBUTOS / OUTROS': 'Impostos',
    'CHAPA / OPERACIONAL PF': 'Chapa',
    'PRÓ-LABORE / SOCIETÁRIO': 'Pró-labore',
    'MECÂNICA / MANUTENÇÃO': 'Mecânica',
    'SAÍDAS NÃO CATEGORIZADAS': 'Outros',
    'PEDÁGIOS / TAGS': 'Pedágios',
    'PEDAGIOS / ESTACIONAMENTOS': 'Pedágios',
    'CUSTO OPERACIONAL ESPECÍFICO': 'Custo Op'
  };
  return mappings[name] || name;
};

// Calcular bucket de conta baseado em hash da descrição
export const getAccountBucket = (value: string, accountOptionsLength: number): number => {
  const normalized = value.toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 1000;
  }
  return hash % accountOptionsLength;
};

// Agrupar registros por descrição
export const groupRegistrosByDescription = (registros: any[], groupByDescription: boolean): any[] => {
  if (!groupByDescription) return registros;
  const grouped = registros.reduce((acc: Record<string, any>, item: any) => {
    let key = extractNomeProprio(item.descricao);
    if (!key || key.trim().length < 3) {
      key = item.descricao;
    }
    if (!acc[key]) {
      acc[key] = {
        ...item,
        descricao: key,
        valor: 0,
        count: 0,
        originalItems: []
      };
    }
    acc[key].count += 1;
    acc[key].originalItems.push(item);
    acc[key].valor += Number(item.valor);
    return acc;
  }, {});
  return Object.values(grouped).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
};

// Filtrar detalhes por contas selecionadas
export const filterDetalhesByAccounts = (
  detalhes: Record<string, any>,
  selectedAccounts: string[],
  cnpjMap: Record<string, string>
): Record<string, any> => {
  if (selectedAccounts.length === 0) return detalhes;
  const entries = Object.entries(detalhes)
    .map(([categoria, data]: [string, any]) => {
      const registros = (data?.registros || []).filter((item: any) => {
        const itemCnpj = item?.cnpj || '';
        return selectedAccounts.some(accountId => cnpjMap[accountId] === itemCnpj);
      });
      return [categoria, {
        ...(data || {}),
        registros,
        total: registros.reduce((acc: number, item: any) => acc + Number(item.valor || 0), 0),
        quantidade: registros.length,
      }] as [string, any];
    })
    .filter(([, data]: [string, any]) => (data?.registros?.length ?? 0) > 0);
  return Object.fromEntries(entries) as Record<string, any>;
};

// Calcular categorias filtradas
export const calculateFilteredCategorias = (
  filteredDetalhes: Record<string, any>,
  categorias: any[]
): any[] => {
  return Object.entries(filteredDetalhes).map(([nome, data]: [string, any]) => ({
    nome,
    valor: data?.total || 0,
    valor_abs: Math.abs(data?.total || 0),
    percentual: 0,
    quantidade: data?.quantidade || 0,
  })).sort((a, b) => b.valor_abs - a.valor_abs);
};

// Calcular resumo filtrado
export const calculateFilteredResumo = (
  filteredDetalhes: Record<string, any>,
  resumo: any
): any => {
  const totals = Object.values(filteredDetalhes).reduce((acc: { receitas: number; despesas: number; qtdReceitas: number; qtdDespesas: number }, data: any) => {
    (data?.registros || []).forEach((item: any) => {
      const value = Number(item.valor || 0);
      if (value > 0) {
        acc.receitas += value;
        acc.qtdReceitas += 1;
      } else if (value < 0) {
        acc.despesas += Math.abs(value);
        acc.qtdDespesas += 1;
      }
    });
    return acc;
  }, { receitas: 0, despesas: 0, qtdReceitas: 0, qtdDespesas: 0 });

  return {
    ...resumo,
    total_receitas: totals.receitas,
    total_despesas: -totals.despesas,
    resultado: totals.receitas - totals.despesas,
    qtd_receitas: totals.qtdReceitas,
    qtd_despesas: totals.qtdDespesas,
  };
};
