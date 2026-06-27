import { useState, useCallback, useMemo } from 'react';

interface QuickFilter {
  id: string;
  label: string;
  days?: number;
  daysFromNow?: boolean;
}

/**
 * Hook para gerenciar filtros de data (quick filters e seleção de meses).
 * Encapsula toda a lógica de cálculo de datas e aplicação de filtros.
 */
export function useDateFilter(referenceDate: string) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const quickFilters: QuickFilter[] = [
    { id: 'hoje', label: 'Hoje', days: 0 },
    { id: 'sem', label: 'Sem', days: 7 },
    { id: 'trim', label: 'Trim', days: 90 },
    { id: 'ano', label: 'Ano', daysFromNow: true },
  ];

  const months = [
    { id: 'jan', label: 'Jan', month: 0 },
    { id: 'fev', label: 'Fev', month: 1 },
    { id: 'mar', label: 'Mar', month: 2 },
    { id: 'abr', label: 'Abr', month: 3 },
    { id: 'mai', label: 'Mai', month: 4 },
    { id: 'jun', label: 'Jun', month: 5 },
    { id: 'jul', label: 'Jul', month: 6 },
    { id: 'ago', label: 'Ago', month: 7 },
    { id: 'set', label: 'Set', month: 8 },
    { id: 'out', label: 'Out', month: 9 },
    { id: 'nov', label: 'Nov', month: 10 },
    { id: 'dez', label: 'Dez', month: 11 },
  ];

  const applyQuickFilter = useCallback((filterId: string) => {
    const filter = quickFilters.find(f => f.id === filterId);
    const monthFilter = months.find(m => m.id === filterId);

    if (!filter && !monthFilter) return;

    // Se é um filtro de mês, adicionar/remover da lista
    if (monthFilter) {
      setSelectedMonths(prev => {
        if (prev.includes(filterId)) {
          return prev.filter(m => m !== filterId);
        } else {
          return [...prev, filterId];
        }
      });
      setActiveQuickFilter(null);
      return;
    }

    // Se é um quick filter, limpar meses e aplicar
    setSelectedMonths([]);
    setActiveQuickFilter(filterId);

    const refDate = new Date(referenceDate + 'T00:00:00');

    // Filtro "Ano" - do início do ano até hoje
    if ((filter as any).daysFromNow) {
      const start = new Date(refDate);
      start.setFullYear(start.getFullYear());
      start.setMonth(0);
      start.setDate(1);

      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(referenceDate);
      return;
    }

    // Outros filtros - últimos N dias
    const start = new Date(refDate);
    start.setDate(start.getDate() - (filter as any).days);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(referenceDate);
  }, [referenceDate, quickFilters, months]);

  const clearFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setActiveQuickFilter(null);
    setSelectedMonths([]);
  }, []);

  const toggleMonth = useCallback((monthId: string) => {
    applyQuickFilter(monthId);
  }, [applyQuickFilter]);

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    activeQuickFilter,
    setActiveQuickFilter,
    selectedMonths,
    setSelectedMonths,
    quickFilters,
    months,
    applyQuickFilter,
    clearFilters,
    toggleMonth,
  };
}
