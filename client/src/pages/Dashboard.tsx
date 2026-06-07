'use client';
import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Upload, Calendar, Clock, Sun, Zap, Search, X, Fuel, MoreVertical, Truck, Landmark, Building2, Wallet, SlidersHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BarChartWithLabels from '@/components/BarChartWithLabels';
import CategoryIcon from '@/components/CategoryIcon';
import MonthCard from '@/components/MonthCard';
import { CategoryDetailView } from '@/components/CategoryDetailView';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';

// Paleta usada pelo BarChartWithLabels (mantida para coerência visual futura)
const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4', '#84CC16'
];

// Extrair nome proprio da descricao
const extractNomeProprio = (descricao: string): string => {
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
const simplifyCategoriName = (name: string): string => {
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

// Agrupar registros por descricao
const accountOptions = [
  { id: 'bb', label: 'BB', icon: Landmark, tone: 'from-amber-500/15 to-amber-400/5 border-amber-400/40' },
  { id: 'itau', label: 'Itaú', icon: Building2, tone: 'from-blue-500/15 to-blue-400/5 border-blue-400/40' },
  { id: 'nubank', label: 'Nubank', icon: Wallet, tone: 'from-violet-500/15 to-violet-400/5 border-violet-400/40' },
];

const getAccountBucket = (value: string) => {
  const normalized = value.toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 1000;
  }
  return hash % accountOptions.length;
};

const getAccountIdForItem = (item: any) => accountOptions[getAccountBucket(item?.descricao || item?.categoria || 'bank')].id;

const groupRegistrosByDescription = (registros: any[], groupByDescription: boolean) => {
  if (!groupByDescription) return registros;
  const grouped = registros.reduce((acc: Record<string, any>, item: any) => {
    let key = extractNomeProprio(item.descricao);
    if (!key || key.trim().length < 3) {
      key = item.descricao;
    }
    if (!acc[key]) {
      acc[key] = {
        ...item,
        descricao: key, // Usar nome próprio como descrição do grupo
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  // Buscar resumo do banco. Se houver dados → usa banco. Senão → JSON estático.
  const utils = trpc.useUtils();
  const { data: resumoBanco } = trpc.ofx.resumoCompleto.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Quando há dados no banco usamos eles; senão caímos no JSON estático (compat).
  const usandoBanco = !!(resumoBanco && resumoBanco.totalRegistros > 0);
  const resumo = usandoBanco ? resumoBanco!.resumo : dashboardData.resumo;
  const saldoFinal = usandoBanco ? resumoBanco!.saldoFinal : undefined;
  const categorias = usandoBanco ? resumoBanco!.categorias : dashboardData.categorias;
  const diario = usandoBanco ? resumoBanco!.diario : dashboardData.diario;
  const timeline_categorias = (dashboardData as unknown as { timeline_categorias?: unknown[] }).timeline_categorias ?? [];
  const detalhes = (usandoBanco ? resumoBanco!.detalhes : detalhesData) as Record<string, any>;

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [groupByDescription, setGroupByDescription] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const monthsScrollRef = useRef<HTMLDivElement>(null);

  const filteredDetalhes = useMemo(() => {
    if (selectedAccounts.length === 0) return detalhes;

    const entries = Object.entries(detalhes as Record<string, any>)
      .map(([categoria, data]: [string, any]) => {
        const registros = (data?.registros || []).filter((item: any) =>
          selectedAccounts.includes(getAccountIdForItem(item))
        );

        return [categoria, {
          ...(data || {}),
          registros,
          total: registros.reduce((acc: number, item: any) => acc + Number(item.valor || 0), 0),
          quantidade: registros.length,
        }] as [string, any];
      })
      .filter(([, data]: [string, any]) => (data?.registros?.length ?? 0) > 0);

    return Object.fromEntries(entries) as Record<string, any>;
  }, [detalhes, selectedAccounts]);

  const filteredCategorias = useMemo(() => {
    if (selectedAccounts.length === 0) return categorias;

    return Object.entries(filteredDetalhes).map(([nome, data]: [string, any]) => ({
      nome,
      valor: data?.total || 0,
      valor_abs: Math.abs(data?.total || 0),
      percentual: 0,
      quantidade: data?.quantidade || 0,
    })).sort((a, b) => b.valor_abs - a.valor_abs);
  }, [categorias, filteredDetalhes, selectedAccounts]);

  const filteredResumo = useMemo(() => {
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
  }, [filteredDetalhes, resumo]);

  // Data de referência: último dia disponível (banco → JSON → hardcoded)
  const REFERENCE_DATE = (() => {
    if (usandoBanco && resumoBanco!.diario.length > 0) {
      return resumoBanco!.diario[resumoBanco!.diario.length - 1].data_full;
    }
    if (dashboardData.diario.length > 0) {
      return dashboardData.diario[dashboardData.diario.length - 1].data_full;
    }
    return '2026-05-27';
  })();

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  };

  // Opções de filtros rápidos baseadas no último dia do extrato (27/05/2026)
  const quickFilters = [
    { id: 'hoje', label: 'Hoje', days: 0 },
    { id: 'sem', label: 'Sem', days: 7 },
    { id: 'trim', label: 'Trim', days: 90 },
    { id: 'ano', label: 'Ano', daysFromNow: true },
  ];

  // Meses para filtro
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

  // Calcular último mês com registros para auto-scroll
  const lastMonthWithData = useMemo(() => {
    if (!usandoBanco || !resumoBanco?.diario || resumoBanco.diario.length === 0) return null;
    const lastDate = resumoBanco.diario[resumoBanco.diario.length - 1].data_full;
    const lastDateObj = new Date(lastDate + 'T00:00:00');
    const monthIndex = lastDateObj.getMonth();
    return months[monthIndex]?.id || null;
  }, [usandoBanco, resumoBanco]);

  // Auto-scroll para o último mês com dados
  useMemo(() => {
    if (lastMonthWithData && monthsScrollRef.current) {
      setTimeout(() => {
        const monthElement = document.getElementById(`month-${lastMonthWithData}`);
        if (monthElement && monthsScrollRef.current) {
          const containerWidth = monthsScrollRef.current.clientWidth;
          const elementLeft = monthElement.offsetLeft;
          const elementWidth = monthElement.clientWidth;
          const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
          monthsScrollRef.current.scrollLeft = Math.max(0, scrollPosition);
        }
      }, 100);
    }
  }, [lastMonthWithData]);

  // Aplicar filtro rápido
  const applyQuickFilter = (filterId: string) => {
    const filter = quickFilters.find(f => f.id === filterId);
    const monthFilter = months.find(m => m.id === filterId);
    
    if (!filter && !monthFilter) return;
    
    // Se é filtro de mês, adicionar/remover da seleção
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
    
    // Para filtros rápidos (Hoje, Sem, Trim, Ano), limpar seleção de meses
    setSelectedMonths([]);
    setActiveQuickFilter(filterId);
    
    const refDate = new Date(REFERENCE_DATE + 'T00:00:00');
    
    // Se é filtro de ano (daysFromNow), calcular a partir do ano atual
    if ((filter as any).daysFromNow) {
      const start = new Date(refDate);
      start.setFullYear(start.getFullYear()); // Ano atual
      start.setMonth(0); // Janeiro
      start.setDate(1); // Dia 1
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(REFERENCE_DATE);
      return;
    }

    const start = new Date(refDate);
    start.setDate(start.getDate() - (filter as any).days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(REFERENCE_DATE);
  };

  // Buscar registro
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Digite algo para buscar');
      return;
    }

    for (const [categoryName, categoryData] of Object.entries(filteredDetalhes)) {
      const items = (categoryData as any)?.registros || [];
      const found = items.find((item: any) => 
        item.descricao.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (found) {
        setSearchOpen(false);
        setSearchQuery('');
        setExpandedCategory(categoryName);
        
        setTimeout(() => {
          const element = document.getElementById(`category-${categoryName}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
        toast.success(`Encontrado: ${found.descricao}`);
        return;
      }
    }
    
    toast.error('Nenhum registro encontrado');
  };

  // Formatar moeda
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Resetar filtros
  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setActiveQuickFilter(null);
    setSelectedMonths([]);
    setIsFiltering(false);
  };

  // Efeito: quando meses são selecionados, calcular o período
  useMemo(() => {
    // Se não há meses selecionados E não há filtro rápido ativo, limpar datas
    if (selectedMonths.length === 0 && !activeQuickFilter) {
      setStartDate('');
      setEndDate('');
      return;
    }
    
    // Se há filtro rápido ativo (Hoje, Sem, etc), não sobrescrever as datas
    if (activeQuickFilter) {
      return;
    }

    const refDate = new Date(REFERENCE_DATE + 'T00:00:00');
    const selectedMonthNumbers = selectedMonths.map(m => months.find(month => month.id === m)?.month).filter(m => m !== undefined);
    
    if (selectedMonthNumbers.length === 0) return;

    const minMonth = Math.min(...selectedMonthNumbers);
    const maxMonth = Math.max(...selectedMonthNumbers);

    const start = new Date(refDate);
    start.setMonth(minMonth);
    start.setDate(1);

    const end = new Date(refDate);
    end.setMonth(maxMonth + 1);
    end.setDate(0);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, [selectedMonths, activeQuickFilter]);

  // Filtrar diário por data
  const filteredDiario = useMemo(() => {
    if (!startDate && !endDate) return diario;
    return diario.filter(d => {
      if (startDate && d.data_full < startDate) return false;
      if (endDate && d.data_full > endDate) return false;
      return true;
    });
  }, [diario, startDate, endDate]);

  // Helper: converte data "dd/MM/yyyy" ou "dd/MM" para Date
  const parseRegistroDate = (dataStr: string): Date | null => {
    if (!dataStr) return null;
    const parts = dataStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    }
    if (parts.length === 2) {
      const [day, month] = parts;
      return new Date(`2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    }
    return null;
  };

  // Calcular resumo filtrado
  const resumoFiltrado = useMemo(() => {
    const result = {
      receitas: 0,
      despesas: 0,
      lucro: 0,
      resultado: 0,
      qtd_receitas: 0,
      qtd_despesas: 0,
      periodo_inicio: filteredResumo.periodo_inicio,
      periodo_fim: filteredResumo.periodo_fim,
    };

    // Se não há filtro de data, usar os totais do resumo (que incluem TODAS as transações)
    if (!startDate && !endDate) {
      result.receitas = filteredResumo.total_receitas || 0;
      result.despesas = Math.abs(filteredResumo.total_despesas || 0);
      result.qtd_receitas = filteredResumo.qtd_receitas || 0;
      result.qtd_despesas = filteredResumo.qtd_despesas || 0;
    } else {
      // Se há filtro, calcular a partir das transações reais em detalhes
      const startObj = startDate ? new Date(startDate + 'T00:00:00') : null;
      const endObj = endDate ? new Date(endDate + 'T23:59:59') : null;

      Object.values(filteredDetalhes).forEach((categoryData: any) => {
        const items = categoryData?.registros || [];
        items.forEach((item: any) => {
          const itemDate = parseRegistroDate(item.data);
          if (!itemDate) return;
          if (startObj && itemDate < startObj) return;
          if (endObj && itemDate > endObj) return;

          const valor = Number(item.valor) || 0;
          if (valor > 0) {
            result.receitas += valor;
            result.qtd_receitas += 1;
          } else if (valor < 0) {
            result.despesas += Math.abs(valor);
            result.qtd_despesas += 1;
          }
        });
      });
    }

    result.lucro = result.receitas - result.despesas;
    result.resultado = result.receitas - result.despesas;

    return result;
  }, [filteredDetalhes, filteredResumo, startDate, endDate]);

  // Calcular lucro por mês para MonthCards
  const lucroByMonth = useMemo(() => {
    const result: Record<string, number> = {};
    
    months.forEach(month => {
      const monthNum = month.month;
      const year = 2026;
      let receitas = 0;
      let despesas = 0;
      
      Object.values(filteredDetalhes).forEach((categoryData: any) => {
        const items = categoryData?.registros || [];
        items.forEach((item: any) => {
          const itemDate = parseRegistroDate(item.data);
          if (!itemDate) return;
          if (itemDate.getMonth() !== monthNum || itemDate.getFullYear() !== year) return;
          
          const valor = Number(item.valor) || 0;
          if (valor > 0) {
            receitas += valor;
          } else if (valor < 0) {
            despesas += Math.abs(valor);
          }
        });
      });
      
      result[month.id] = receitas - despesas;
    });
    
    return result;
  }, [filteredDetalhes]);

  // Categorias com dados (respeitando filtros de data)
  const categoriasComDados = useMemo(() => {
    if (!startDate && !endDate) {
      return filteredCategorias.filter(cat => cat.valor_abs > 0);
    }

    const startObj = startDate ? new Date(startDate + 'T00:00:00') : null;
    const endObj = endDate ? new Date(endDate + 'T23:59:59') : null;
    const result: any[] = [];

    Object.entries(filteredDetalhes).forEach(([nome, data]: [string, any]) => {
      const items = data?.registros || [];
      let total = 0;
      let count = 0;

      items.forEach((item: any) => {
        const itemDate = parseRegistroDate(item.data);
        if (!itemDate) return;
        if (startObj && itemDate < startObj) return;
        if (endObj && itemDate > endObj) return;
        total += Number(item.valor) || 0;
        count++;
      });

      if (count > 0 && total !== 0) {
        result.push({
          nome,
          valor: total,
          valor_abs: Math.abs(total),
          quantidade: count,
        });
      }
    });

    return result.sort((a, b) => b.valor_abs - a.valor_abs);
  }, [filteredCategorias, filteredDetalhes, startDate, endDate]);

  // Upload OFX
  const uploadMutation = trpc.ofx.processOFX.useMutation();
  const handleOfxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      await uploadMutation.mutateAsync({ fileBase64: btoa(text), nomeArquivo: file.name });
      toast.success('OFX importado com sucesso!');
      await utils.ofx.resumoCompleto.invalidate();
    } catch (error) {
      toast.error('Erro ao importar OFX');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6 pb-28">
      <div className="max-w-7xl mx-auto">
        {/* BLOCO SUPERIOR: Cabeçalho + Filtros Operacionais (Elementos Soltos) */}
        <div className="mb-2 sm:mb-3 entrance-fade delay-0">
          {/* Linha 1: Título + Botões Buscar/OFX */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white flex-1 truncate">Dashboard Financeiro</h1>
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <Button
                onClick={() => setSearchOpen(true)}
                className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 h-8 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <Search className="w-3 h-3" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
              <label className="btn-3d bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md font-semibold cursor-pointer flex items-center gap-1 h-8 text-xs sm:text-sm flex-1 sm:flex-none">
                <Upload className="w-3 h-3" />
                <span>OFX</span>
                <input
                  type="file"
                  accept=".ofx,.txt,application/x-ofx,text/plain,application/octet-stream"
                  onChange={handleOfxUpload}
                  disabled={isUploading}
                  className="hidden"
                  capture={false}
                  multiple={false}
                />
              </label>
            </div>
          </div>

          {/* Linha 2: Razão Social */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-3 truncate">Transportes Moraes e Petry LTDA ME</p>

          {/* Linha 3: Inputs de Data (Início | Fim) lado a lado */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">Início</label>
              <div className="relative flex items-center">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActiveQuickFilter(null);
                  }}
                  className="w-full text-xs h-8 px-2 pr-8 overflow-hidden bg-slate-800 border-slate-700 text-slate-100"
                />
                <Calendar className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">Fim</label>
              <div className="relative flex items-center">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActiveQuickFilter(null);
                  }}
                  className="w-full text-xs h-8 px-2 pr-8 overflow-hidden bg-slate-800 border-slate-700 text-slate-100"
                />
                <Calendar className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3 shadow-inner">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Contas / Bancos
            </div>
            <div className="flex flex-wrap gap-2">
              {accountOptions.map((account) => {
                const Icon = account.icon;
                const isActive = selectedAccounts.includes(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => toggleAccount(account.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? `bg-slate-100 text-slate-950 ring-2 ring-cyan-400/80 ${account.tone}`
                        : 'border-slate-700 bg-slate-800/90 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600' : 'text-slate-300'}`} />
                    {account.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Selecione uma ou mais contas para filtrar o resumo visual do dashboard. Sem seleção, o painel mostra tudo.</p>
          </div>

          {/* Barra de Meses Horizontal com Scroll - Economiza Espaço Vertical */}
          <div 
            ref={monthsScrollRef}
            className="flex gap-1.5 mb-2 overflow-x-auto pb-2" 
            style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {months.map((month) => (
              <div 
                key={month.id} 
                id={`month-${month.id}`}
                className="flex-shrink-0" 
                style={{ width: '80px', minWidth: '80px' }}
              >
                <MonthCard
                  month={month.label}
                  monthId={month.id}
                  lucro={lucroByMonth[month.id] || 0}
                  isSelected={selectedMonths.includes(month.id)}
                  onClick={() => applyQuickFilter(month.id)}
                />
              </div>
            ))}
          </div>

          {/* Botão Limpar */}
          {(startDate || endDate || selectedMonths.length > 0) && (
            <button
              onClick={resetFilters}
              className="w-full mt-2 px-2 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-all whitespace-nowrap entrance-animate"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Botões de Buscar e Upload - Movidos para o header */}

        {/* Modal de Busca */}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Buscar Registro</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2">
              <Input
                ref={searchInputRef}
                placeholder="Digite uma palavra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-slate-800 border-slate-700 text-slate-100"
                autoFocus
              />
              <Button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>



        {/* KPI HERO: 4 Cards em Grid 2x2 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 entrance-animate" style={{ animationDelay: '0.1s' }}>
          {/* Card Lucro */}
          <div className={`kpi-card-3d rounded-lg p-4 sm:p-6 text-white shadow-lg ${
            resumoFiltrado.lucro >= 0
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
              : 'bg-gradient-to-br from-red-500 to-red-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">💰 LUCRO</span>
              {resumoFiltrado.lucro >= 0 ? (
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">{formatMoney(resumoFiltrado.lucro)}</div>
            <div className="text-xs sm:text-sm opacity-90">{resumoFiltrado.lucro >= 0 ? 'POSITIVO' : 'NEGATIVO'}</div>
            {(startDate || endDate) && (
              <div className="text-xs opacity-75 mt-2 pt-2 border-t border-white/20">
                {startDate && endDate ? `${startDate.split('-')[2]}/${startDate.split('-')[1]} a ${endDate.split('-')[2]}/${endDate.split('-')[1]}` : 'Período customizado'}
              </div>
            )}
          </div>

          {/* Card Saldo */}
          <div className={`kpi-card-3d rounded-lg p-4 sm:p-6 text-white shadow-lg ${
            saldoFinal !== null && saldoFinal !== undefined && saldoFinal < 0
              ? 'bg-gradient-to-br from-red-500 to-red-700'
              : 'bg-gradient-to-br from-blue-500 to-blue-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">🏦 SALDO</span>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">{saldoFinal ? formatMoney(saldoFinal) : 'R$ 0,00'}</div>
            <div className="text-xs sm:text-sm opacity-90">
              {resumoBanco?.lastImportDate
                ? `${new Date(resumoBanco.lastImportDate).toLocaleDateString('pt-BR')} ${new Date(resumoBanco.lastImportDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Nenhuma atualização'}
            </div>
          </div>

          {/* Card Receitas */}
          <div className="kpi-card-3d bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg p-4 sm:p-6 text-white shadow-lg border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">📈 Receitas</span>
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">{formatMoney(resumoFiltrado.receitas)}</div>
            <div className="text-xs sm:text-sm opacity-90">{resumoFiltrado.qtd_receitas} entradas</div>
            {(startDate || endDate) && (
              <div className="text-xs opacity-75 mt-2 pt-2 border-t border-emerald-400/30">
                {startDate && endDate ? `${startDate.split('-')[2]}/${startDate.split('-')[1]} a ${endDate.split('-')[2]}/${endDate.split('-')[1]}` : 'Período customizado'}
              </div>
            )}
          </div>

          {/* Card Despesas */}
          <div className="kpi-card-3d bg-gradient-to-br from-red-600 to-red-800 rounded-lg p-4 sm:p-6 text-white shadow-lg border border-red-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">📉 Despesas</span>
              <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">-{formatMoney(resumoFiltrado.despesas)}</div>
            <div className="text-xs sm:text-sm opacity-90">{resumoFiltrado.qtd_despesas} saídas</div>
            {(startDate || endDate) && (
              <div className="text-xs opacity-75 mt-2 pt-2 border-t border-red-400/30">
                {startDate && endDate ? `${startDate.split('-')[2]}/${startDate.split('-')[1]} a ${endDate.split('-')[2]}/${endDate.split('-')[1]}` : 'Período customizado'}
              </div>
            )}
          </div>
        </div>



        {/* Detalhamento de Categorias com Toggle Gráfico/Lista */}
        <CategoryDetailView
          categoriasComDados={categoriasComDados}
          detalhes={filteredDetalhes}
          expandedCategory={expandedCategory}
          setExpandedCategory={setExpandedCategory}
          groupByDescription={groupByDescription}
          setGroupByDescription={setGroupByDescription}
          startDate={startDate}
          endDate={endDate}
          formatMoney={formatMoney}
          simplifyCategoriName={simplifyCategoriName}
          parseRegistroDate={parseRegistroDate}
          groupRegistrosByDescription={groupRegistrosByDescription}
          onCategoryClick={(_nome: string, item: any) => {
            const original = item?.nomeOriginal;
            if (!original) return;
            setExpandedCategory(original);
            setTimeout(() => {
              const element = document.getElementById(`category-${original}`);
              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          renderDetailContent={(items: any[], categoryName: string) => {
            return groupRegistrosByDescription(items, groupByDescription).map((item: any, idx: number) => {
              const isGrouped = item.count > 1;
              const transacaoId = item.id;
              const categoriaAtual = item.categoria;
              const podeMovimentar = ['OUTROS', 'PAGAMENTOS'].includes(categoriaAtual);
              
              return (
                <div key={idx} className="flex justify-between items-start text-xs gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 font-medium text-xs break-words">{item.descricao}</p>
                    {isGrouped && (
                      <p className="text-slate-500 text-xs">Agrupado: {item.count} transacoes</p>
                    )}
                    {!isGrouped && (
                      <p className="text-slate-500 text-xs">{item.data || 'N/A'}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-slate-100 font-semibold text-xs whitespace-nowrap">{formatMoney(item.valor)}</span>
                    {podeMovimentar && !isGrouped && transacaoId && (
                      <MovimentarCategoriaButton
                        transacaoId={transacaoId}
                        categoriaAtual={categoriaAtual}
                        onSuccess={() => utils.ofx.resumoCompleto.invalidate()}
                      />
                    )}
                  </div>
                </div>
              );
            });
          }}
        />

      </div>
    </div>
  );
}


/**
 * Componente para mover transação entre categorias
 */
function MovimentarCategoriaButton({
  transacaoId,
  categoriaAtual,
  onSuccess,
}: {
  transacaoId: number;
  categoriaAtual: string;
  onSuccess: () => void;
}) {
  const mutation = trpc.ofx.atualizarCategoria.useMutation();
  const [open, setOpen] = useState(false);

  // Lista de todas as categorias disponíveis
  const categoriasDisponiveis = [
    'RECEITAS OPERACIONAIS',
    'COMBUSTÍVEL / POSTO',
    'CHAPA / OPERACIONAL PF',
    'PRÓ-LABORE / SOCIETÁRIO',
    'MECÂNICA / MANUTENÇÃO',
    'PEDÁGIOS / TAGS',
    'IMPOSTOS / TRIBUTOS / OUTROS',
    'CONTA / BOLETO',
    'CONSÓRCIO / FINANCIAMENTO',
    'CUSTO OPERACIONAL ESPECÍFICO',
    'PAGAMENTOS',
    'SAÍDAS NÃO CATEGORIZADAS',
  ];

  const handleMover = useCallback(
    (novaCategoria: string) => {
      if (novaCategoria === categoriaAtual) return;
      
      mutation.mutate(
        { transacaoId, novaCategoria },
        {
          onSuccess: (result) => {
            if (result.sucesso) {
              toast.success(`Movido para ${novaCategoria}`);
              setOpen(false);
              onSuccess();
            } else {
              toast.error(result.mensagem || 'Erro ao mover');
            }
          },
          onError: () => {
            toast.error('Erro ao mover transação');
          },
        }
      );
    },
    [transacaoId, categoriaAtual, mutation, onSuccess]
  );

  return (
    <Select open={open} onOpenChange={setOpen}>
      <SelectTrigger className="w-8 h-6 p-0 border-0 bg-slate-700 hover:bg-slate-600">
        <MoreVertical className="w-3 h-3" />
      </SelectTrigger>
      <SelectContent>
        {categoriasDisponiveis
          .filter(cat => cat !== categoriaAtual)
          .map(cat => (
            <SelectItem key={cat} value={cat} onSelect={() => handleMover(cat)}>
              {cat}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
