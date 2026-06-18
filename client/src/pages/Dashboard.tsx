'use client';
import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Upload, Calendar, Clock, Sun, Zap, Search, X, Fuel, MoreVertical, Truck, Landmark, Building2, Wallet, SlidersHorizontal, Bell, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BarChartWithLabels from '@/components/BarChartWithLabels';
import CategoryIcon from '@/components/CategoryIcon';
import MonthCard from '@/components/MonthCard';
import { CategoryDetailView } from '@/components/CategoryDetailView';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: resumoBanco } = trpc.ofx.resumoCompleto.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

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
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [lastImportInfo, setLastImportInfo] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasNewCategoryChanges, setHasNewCategoryChanges] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const monthsScrollRef = useRef<HTMLDivElement>(null);

  const filteredDetalhes = useMemo(() => {
    // TODO: Implementar filtro de banco
    // Por enquanto, retornar todos os detalhes sem filtrar
    // if (selectedAccounts.length === 0) return detalhes;
    // const entries = Object.entries(detalhes as Record<string, any>)
    //   .map(([categoria, data]: [string, any]) => {
    //     const registros = (data?.registros || []).filter((item: any) =>
    //       selectedAccounts.includes(getAccountIdForItem(item))
    //     );
    //     return [categoria, {
    //       ...(data || {}),
    //       registros,
    //       total: registros.reduce((acc: number, item: any) => acc + Number(item.valor || 0), 0),
    //       quantidade: registros.length,
    //     }] as [string, any];
    //   })
    //   .filter(([, data]: [string, any]) => (data?.registros?.length ?? 0) > 0);
    // return Object.fromEntries(entries) as Record<string, any>;
    return detalhes;
  }, [detalhes]);

  const filteredCategorias = useMemo(() => {
    // TODO: Implementar filtro de banco
    // Por enquanto, retornar todas as categorias sem filtrar
    // if (selectedAccounts.length === 0) return categorias;

    return categorias;
    // TODO: Implementar filtro de banco
    // return Object.entries(filteredDetalhes).map(([nome, data]: [string, any]) => ({
    //   nome,
    //   valor: data?.total || 0,
    //   valor_abs: Math.abs(data?.total || 0),
    //   percentual: 0,
    //   quantidade: data?.quantidade || 0,
    // })).sort((a, b) => b.valor_abs - a.valor_abs);
  }, [categorias]);

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
    // TODO: Implementar filtro de banco (BB, Itaú, Nubank)
    // Por enquanto, apenas deixar o botão visual sem funcionalidade
    // setSelectedAccounts((prev) =>
    //   prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    // );
  };

  const quickFilters = [
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

  const lastMonthWithData = useMemo(() => {
    if (!usandoBanco || !resumoBanco?.diario || resumoBanco.diario.length === 0) return null;
    const lastDate = resumoBanco.diario[resumoBanco.diario.length - 1].data_full;
    const lastDateObj = new Date(lastDate + 'T00:00:00');
    const monthIndex = lastDateObj.getMonth();
    return months[monthIndex]?.id || null;
  }, [usandoBanco, resumoBanco]);

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

  const applyQuickFilter = (filterId: string) => {
    const filter = quickFilters.find(f => f.id === filterId);
    const monthFilter = months.find(m => m.id === filterId);
    
    if (!filter && !monthFilter) return;
    
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
    
    setSelectedMonths([]);
    setActiveQuickFilter(filterId);
    
    const refDate = new Date(REFERENCE_DATE + 'T00:00:00');
    
    if ((filter as any).daysFromNow) {
      const start = new Date(refDate);
      start.setFullYear(start.getFullYear());
      start.setMonth(0);
      start.setDate(1);
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(REFERENCE_DATE);
      return;
    }

    const start = new Date(refDate);
    start.setDate(start.getDate() - (filter as any).days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(REFERENCE_DATE);
  };

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

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setActiveQuickFilter(null);
    setSelectedMonths([]);
    setIsFiltering(false);
  };

  useMemo(() => {
    if (selectedMonths.length === 0 && !activeQuickFilter) {
      setStartDate('');
      setEndDate('');
      return;
    }
    
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

  const filteredDiario = useMemo(() => {
    if (!startDate && !endDate) return diario;
    return diario.filter(d => {
      if (startDate && d.data_full < startDate) return false;
      if (endDate && d.data_full > endDate) return false;
      return true;
    });
  }, [diario, startDate, endDate]);

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

    if (!startDate && !endDate) {
      result.receitas = filteredResumo.total_receitas || 0;
      result.despesas = Math.abs(filteredResumo.total_despesas || 0);
      result.qtd_receitas = filteredResumo.qtd_receitas || 0;
      result.qtd_despesas = filteredResumo.qtd_despesas || 0;
    } else {
      const startObj = startDate ? new Date(startDate + 'T00:00:00') : null;
      const endObj = endDate ? new Date(endDate + 'T23:59:59') : null;

      Object.values(filteredDetalhes || {}).forEach((categoryData: any) => {
          const items = categoryData?.registros ?? [];
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

  const lucroByMonth = useMemo(() => {
    const result: Record<string, number> = {};
    
    months.forEach(month => {
      const monthNum = month.month;
      const year = 2026;
      let receitas = 0;
      let despesas = 0;
      
      Object.values(filteredDetalhes || {}).forEach((categoryData: any) => {
  const items = categoryData?.registros ?? [];
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

const categoriasComDados = useMemo(() => {
  if (!startDate && !endDate) {
    // Recalcula sempre a partir dos detalhes reais para garantir consistência
    const result: any[] = [];
    Object.entries(filteredDetalhes || {}).forEach(([nome, data]: [string, any]) => {
      const items = data?.registros ?? [];
      let total = 0;
      items.forEach((item: any) => { total += Number(item.valor) || 0; });
      if (items.length > 0 && total !== 0) {
        result.push({
          nome,
          valor: total,
          valor_abs: Math.abs(total),
          quantidade: items.length,
        });
      }
    });
    return result.sort((a, b) => b.valor_abs - a.valor_abs);
  }

    const startObj = startDate ? new Date(startDate + 'T00:00:00') : null;
    const endObj = endDate ? new Date(endDate + 'T23:59:59') : null;
    const result: any[] = [];

    Object.entries(filteredDetalhes || {}).forEach(([nome, data]: [string, any]) => {
  const items = data?.registros ?? [];
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

  const uploadMutation = trpc.ofx.processOFX.useMutation();
  const { data: uploadsHistory } = trpc.ofx.historicoUploads.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const handleOfxUploadEvent = async (event: any) => {
      const file = event.detail?.file;
      if (!file) return;

      setIsUploading(true);
      try {
        const text = await file.text();
        const result = await uploadMutation.mutateAsync({ fileBase64: btoa(text), nomeArquivo: file.name });
        if (result.success) {
          setHasNewNotification(true);
          setLastImportInfo(result);
        }
        toast.success('OFX importado com sucesso!');
        await utils.ofx.resumoCompleto.invalidate();
      } catch (error) {
        toast.error('Erro ao importar OFX');
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    };

    window.addEventListener('ofx-upload', handleOfxUploadEvent);
    return () => window.removeEventListener('ofx-upload', handleOfxUploadEvent);
  }, [uploadMutation, utils]);

  const handleOfxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const result = await uploadMutation.mutateAsync({ fileBase64: btoa(text), nomeArquivo: file.name });
      if (result.success) {
        setHasNewNotification(true);
        setLastImportInfo(result);
      }
      toast.success('OFX importado com sucesso!');
      await utils.ofx.resumoCompleto.invalidate();
    } catch (error) {
      toast.error('Erro ao importar OFX');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNotificationClick = () => {
    setNotificationOpen(true);
    setHasNewNotification(false);
  };

  const syncMutation = trpc.ofx.aplicarRegrasRetroativas.useMutation();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Aplicar regras retroativamente
      const result = await syncMutation.mutateAsync();
      
      // Invalidar cache para recarregar dados
      await utils.ofx.resumoCompleto.invalidate();
      setHasNewCategoryChanges(false);
      
      if (result.sucesso) {
        toast.success(`Sincronizado! ${result.mensagem}`);
      } else {
        toast.error(result.mensagem);
      }
    } catch (error) {
      toast.error('Erro ao sincronizar dados');
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCategoryChange = () => {
    setHasNewCategoryChanges(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6 pb-28">
      <div className="max-w-7xl mx-auto">
        {/* BLOCO SUPERIOR: Cabeçalho */}
        <div className="mb-4 entrance-fade delay-0">

          {/* Título centralizado */}
          <div className="text-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              Balanço Financeiro TR. Petry Ltda.
            </h1>
          </div>

          {/* Barra de busca + avatar + sino */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar transação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onClick={() => setSearchOpen(true)}
                readOnly
                className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              />
            </div>
            <button className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              TM
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 relative hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sincronizar dados"
            >
              <RefreshCw className={`w-4 h-4 text-slate-300 ${isSyncing ? 'animate-spin' : ''}`} />
              {hasNewCategoryChanges && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-slate-900 animate-pulse" />
              )}
            </button>
            <button
              onClick={handleNotificationClick}
              className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 relative hover:bg-slate-700 transition-colors"
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {hasNewNotification && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900 animate-pulse" />
              )}
            </button>
          </div>

          {/* Inputs de Data */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-400 mb-1">Início</label>
              <div className="relative flex items-center">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setActiveQuickFilter(null); }}
                  className="w-full text-xs h-9 px-2 pr-8 bg-slate-800 border-slate-700 text-slate-100 rounded-lg"
                />
                <Calendar className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-400 mb-1">Fim</label>
              <div className="relative flex items-center">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setActiveQuickFilter(null); }}
                  className="w-full text-xs h-9 px-2 pr-8 bg-slate-800 border-slate-700 text-slate-100 rounded-lg"
                />
                <Calendar className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Filtro de Contas / Bancos */}
          <div className="flex flex-wrap gap-2 mb-3">
            {accountOptions.map((account) => {
              const Icon = account.icon;
              // TODO: Implementar filtro de banco
              const isActive = false; // selectedAccounts.includes(account.id);
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    // TODO: Implementar filtro de banco
                    // toggleAccount(account.id);
                  }}
                  className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {account.label}
                  {/* TODO: Mostrar X quando filtro estiver ativo */}
                  {/* {isActive && <X className="w-3 h-3 opacity-70" />} */}
                </button>
              );
            })}
          </div>

          {/* Barra de Meses */}
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

          {/* Botão Limpar Filtros */}
          {(startDate || endDate || selectedMonths.length > 0) && (
            <button
              onClick={resetFilters}
              className="w-full mt-2 px-2 py-1.5 rounded-lg text-xs font-semibold bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-all"
            >
              Limpar Filtros
            </button>
          )}
        </div>

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
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
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

        {/* Detalhamento de Categorias */}
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
              // ← Agora qualquer categoria pode ser movida (não apenas OUTROS e PAGAMENTOS)
              const podeMovimentar = !isGrouped && !!transacaoId;

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
                    {podeMovimentar && (
                      <MovimentarCategoriaButton
                        transacaoId={transacaoId}
                        categoriaAtual={categoriaAtual}
                        descricao={item.descricao}
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

      {/* Dialog de Notificacoes */}
      <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
        <DialogContent className="bg-slate-900 border border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Ultimas Importacoes OFX
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploadsHistory && uploadsHistory.length > 0 ? (
              uploadsHistory.slice(0, 5).map((upload: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-100 truncate">{upload.nomeArquivo}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                      {new Date(upload.createdAt).toLocaleDateString('pt-BR')} {new Date(upload.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-700/50 p-2 rounded">
                      <p className="text-slate-400">Processados</p>
                      <p className="text-green-400 font-bold">{upload.totalProcessado}</p>
                    </div>
                    <div className="bg-slate-700/50 p-2 rounded">
                      <p className="text-slate-400">Novos</p>
                      <p className="text-blue-400 font-bold">{upload.totalNovos}</p>
                    </div>
                    <div className="bg-slate-700/50 p-2 rounded">
                      <p className="text-slate-400">Duplicatas</p>
                      <p className="text-yellow-400 font-bold">{upload.totalDuplicatas}</p>
                    </div>
                  </div>
                  {upload.periodoInicio && upload.periodoFim && (
                    <p className="text-xs text-slate-400 mt-2">
                      Periodo: {upload.periodoInicio} a {upload.periodoFim}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma importacao realizada</p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-400">
              Total de registros no banco: <span className="text-blue-400 font-bold">{resumoBanco?.totalRegistros || 0}</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente: botão de mover transação com modal de regra
// ─────────────────────────────────────────────────────────────
function MovimentarCategoriaButton({
  transacaoId,
  categoriaAtual,
  descricao,
  onSuccess,
}: {
  transacaoId: number;
  categoriaAtual: string;
  descricao: string;
  onSuccess: () => void;
}) {
  const mutation = trpc.ofx.moverComRegra.useMutation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [tipoRegra, setTipoRegra] = useState<'KEYWORD' | 'NOME_EXATO' | 'SEM_REGRA'>('SEM_REGRA');
  const [valorRegra, setValorRegra] = useState('');

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

  // Sugestão de keyword: primeira palavra com mais de 3 letras que não seja número
  const sugestaoKeyword = descricao
    .trim()
    .split(/\s+/)
    .find(p => p.length > 3 && !/^\d+$/.test(p)) ?? descricao.split(' ')[0];

  const abrirModal = (categoria: string) => {
    setNovaCategoria(categoria);
    setMenuOpen(false);
    setValorRegra(sugestaoKeyword);
    setTipoRegra('SEM_REGRA');
    setModalOpen(true);
  };

  const confirmar = useCallback(() => {
    mutation.mutate(
      {
        transacaoId,
        novaCategoria,
        criarRegra: tipoRegra !== 'SEM_REGRA',
        tipoRegra: tipoRegra !== 'SEM_REGRA' ? tipoRegra : undefined,
        valorRegra: tipoRegra !== 'SEM_REGRA' ? valorRegra : undefined,
      },
      {
        onSuccess: (result) => {
          if (result.sucesso) {
            toast.success(
              tipoRegra !== 'SEM_REGRA'
                ? `Movido para "${novaCategoria}" e regra criada!`
                : `Movido para "${novaCategoria}"`
            );
            setModalOpen(false);
            onSuccess();
            handleCategoryChange();
          } else {
            toast.error(result.mensagem || 'Erro ao mover');
          }
        },
        onError: () => toast.error('Erro ao mover transação'),
      }
    );
  }, [transacaoId, novaCategoria, tipoRegra, valorRegra, mutation, onSuccess]);

  return (
    <>
      {/* Menu de seleção de categoria */}
      <Select open={menuOpen} onOpenChange={setMenuOpen}>
        <SelectTrigger className="w-8 h-6 p-0 border-0 bg-slate-700 hover:bg-slate-600">
          <MoreVertical className="w-3 h-3" />
        </SelectTrigger>
        <SelectContent>
          {categoriasDisponiveis
            .filter(cat => cat !== categoriaAtual)
            .map(cat => (
              <SelectItem key={cat} value={cat} onPointerDown={() => abrirModal(cat)}>
                {cat}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Modal de confirmação e criação de regra */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-100 text-sm">
              Mover para: <span className="text-blue-400">{novaCategoria}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs text-slate-300">
            {/* Descrição da transação */}
            <p className="text-slate-400 break-words italic">"{descricao}"</p>

            <p className="font-semibold text-slate-200">Criar regra automática?</p>
            <p className="text-slate-500 text-xs">
              Uma regra faz com que futuras transações similares sejam categorizadas automaticamente.
            </p>

            {/* Opção: sem regra */}
            <button
              onClick={() => setTipoRegra('SEM_REGRA')}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                tipoRegra === 'SEM_REGRA'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-500'
              }`}
            >
              🚫 Só mover essa transação
            </button>

            {/* Opção: keyword */}
            <button
              onClick={() => setTipoRegra('KEYWORD')}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                tipoRegra === 'KEYWORD'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-500'
              }`}
            >
              🔑 Criar regra por palavra-chave
              <span className="block text-slate-500 text-xs mt-0.5">
                Ex: toda transação com "FARMACIA" vai para esta categoria
              </span>
            </button>

            {/* Opção: nome exato */}
            <button
              onClick={() => setTipoRegra('NOME_EXATO')}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                tipoRegra === 'NOME_EXATO'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-500'
              }`}
            >
              🎯 Criar regra por nome exato
              <span className="block text-slate-500 text-xs mt-0.5">
                Só transações com descrição idêntica serão afetadas
              </span>
            </button>

            {/* Input do valor da regra */}
            {tipoRegra !== 'SEM_REGRA' && (
              <div>
                <label className="text-slate-400 mb-1 block">
                  {tipoRegra === 'KEYWORD' ? 'Palavra-chave:' : 'Nome exato:'}
                </label>
                <input
                  type="text"
                  value={valorRegra}
                  onChange={e => setValorRegra(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={mutation.isPending || (tipoRegra !== 'SEM_REGRA' && !valorRegra.trim())}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
