import { useMemo } from 'react';

/**
 * Hook para filtrar dados de detalhes e categorias por conta selecionada.
 * Encapsula toda a lógica de filtragem por CNPJ.
 */
export function useFilteredData(
  detalhes: Record<string, any>,
  categorias: any[],
  resumo: any,
  selectedAccounts: string[],
  cnpjMap: Record<string, string>
) {
  // Filtrar detalhes por conta selecionada
  const filteredDetalhes = useMemo(() => {
    if (selectedAccounts.length === 0) return detalhes;
    
    const entries = Object.entries(detalhes as Record<string, any>)
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
  }, [detalhes, selectedAccounts, cnpjMap]);

  // Recalcular categorias baseado nos detalhes filtrados
  const filteredCategorias = useMemo(() => {
    if (selectedAccounts.length === 0) return categorias;
    
    return Object.entries(filteredDetalhes)
      .map(([nome, data]: [string, any]) => ({
        nome,
        valor: data?.total || 0,
        valor_abs: Math.abs(data?.total || 0),
        percentual: 0,
        quantidade: data?.quantidade || 0,
      }))
      .sort((a, b) => b.valor_abs - a.valor_abs);
  }, [filteredDetalhes, selectedAccounts, categorias]);

  // Recalcular resumo baseado nos detalhes filtrados
  const filteredResumo = useMemo(() => {
    const totals = Object.values(filteredDetalhes).reduce(
      (acc: { receitas: number; despesas: number; qtdReceitas: number; qtdDespesas: number }, data: any) => {
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
      },
      { receitas: 0, despesas: 0, qtdReceitas: 0, qtdDespesas: 0 }
    );

    return {
      ...resumo,
      total_receitas: totals.receitas,
      total_despesas: -totals.despesas,
      resultado: totals.receitas - totals.despesas,
      qtd_receitas: totals.qtdReceitas,
      qtd_despesas: totals.qtdDespesas,
    };
  }, [filteredDetalhes, resumo]);

  return {
    filteredDetalhes,
    filteredCategorias,
    filteredResumo,
  };
}
