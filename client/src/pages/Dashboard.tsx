import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Upload, Calendar, Clock, Sun, Zap, Search, X, Fuel, MoreVertical, Truck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BarChartWithLabels from '@/components/BarChartWithLabels';
import CategoryIcon from '@/components/CategoryIcon';
import MonthCard from '@/components/MonthCard';
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

  // State
  const REFERENCE_DATE = '2026-06-05';
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [groupByDescriptionMap, setGroupByDescriptionMap] = useState<Record<string, boolean>>({});

  const months = [
    { id: 'jan', month: 0, label: 'Jan' },
    { id: 'fev', month: 1, label: 'Fev' },
    { id: 'mar', month: 2, label: 'Mar' },
    { id: 'abr', month: 3, label: 'Abr' },
    { id: 'mai', month: 4, label: 'Mai' },
    { id: 'jun', month: 5, label: 'Jun' },
    { id: 'jul', month: 6, label: 'Jul' },
    { id: 'ago', month: 7, label: 'Ago' },
    { id: 'set', month: 8, label: 'Set' },
    { id: 'out', month: 9, label: 'Out' },
    { id: 'nov', month: 10, label: 'Nov' },
    { id: 'dez', month: 11, label: 'Dez' },
  ];

  // Aplicar filtro rápido
  const applyQuickFilter = (filter: string) => {
    const refDate = new Date(REFERENCE_DATE + 'T00:00:00');
    
    if (filter === 'hoje') {
      const start = new Date(refDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(refDate);
      end.setHours(23, 59, 59, 999);
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      setActiveQuickFilter('hoje');
      setSelectedMonths([]);
      setIsFiltering(true);
    }
  };

  // Buscar registro
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Digite algo para buscar');
      return;
    }

    for (const [categoryName, categoryData] of Object.entries(detalhes)) {
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
      periodo_inicio: resumo.periodo_inicio,
      periodo_fim: resumo.periodo_fim,
    };

    // Se não há filtro de data, usar os totais do resumo (que incluem TODAS as transações)
    if (!startDate && !endDate) {
      result.receitas = resumo.total_receitas || 0;
      result.despesas = Math.abs(resumo.total_despesas || 0);
      result.qtd_receitas = resumo.qtd_receitas || 0;
      result.qtd_despesas = resumo.qtd_despesas || 0;
    } else {
      // Se há filtro, calcular a partir das transações reais em detalhes
      const startObj = startDate ? new Date(startDate + 'T00:00:00') : null;
      const endObj = endDate ? new Date(endDate + 'T23:59:59') : null;

      Object.values(detalhes).forEach((categoryData: any) => {
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
  }, [detalhes, resumo, startDate, endDate]);

  // Calcular período anterior (para comparação)
  const resumoAnterior = useMemo(() => {
    const result = {
      receitas: 0,
      despesas: 0,
      lucro: 0,
    };

    if (!startDate || !endDate) return result;

    const startObj = new Date(startDate + 'T00:00:00');
    const endObj = new Date(endDate + 'T23:59:59');
    const daysDiff = Math.ceil((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24));

    const prevStart = new Date(startObj);
    prevStart.setDate(prevStart.getDate() - daysDiff - 1);

    const prevEnd = new Date(startObj);
    prevEnd.setDate(prevEnd.getDate() - 1);

    Object.values(detalhes).forEach((categoryData: any) => {
      const items = categoryData?.registros || [];
      items.forEach((item: any) => {
        const itemDate = parseRegistroDate(item.data);
        if (!itemDate) return;
        if (itemDate < prevStart || itemDate > prevEnd) return;

        const valor = Number(item.valor) || 0;
        if (valor > 0) {
          result.receitas += valor;
        } else if (valor < 0) {
          result.despesas += Math.abs(valor);
        }
      });
    });

    result.lucro = result.receitas - result.despesas;
    return result;
  }, [detalhes, startDate, endDate]);

  // Calcular variação percentual
  const calcularVariacao = (atual: number, anterior: number): number => {
    if (anterior === 0) return 0;
    return ((atual - anterior) / Math.abs(anterior)) * 100;
  };

  // Calcular categorias filtradas
  const categoriasFiltradas = useMemo(() => {
    const result: Array<{ nome: string; valor: number; valor_abs: number; quantidade: number }> = [];

    Object.entries(categorias).forEach(([nome]) => {
      let total = 0;
      let count = 0;
      const startObj = startDate ? new Date(startDate + 'T00:00:00') : null;
      const endObj = endDate ? new Date(endDate + 'T23:59:59') : null;

      const categoryData = detalhes[nome];
      if (!categoryData) return;

      const items = categoryData.registros || [];
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
  }, [categorias, detalhes, startDate, endDate]);

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
        {/* Header - Reformulado para Mobile */}
        <div className="mb-4 sm:mb-6 entrance-fade delay-0">
          {/* Linha 1: Título + Botões */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h1 className="text-xl sm:text-4xl font-bold text-slate-900 dark:text-white flex-1 truncate">Dashboard Financeiro</h1>
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
              <Button
                onClick={() => {
                  if (activeQuickFilter === 'hoje') {
                    resetFilters();
                  } else {
                    applyQuickFilter('hoje');
                  }
                }}
                variant={activeQuickFilter === 'hoje' ? 'default' : 'outline'}
                className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold h-8 flex-1 sm:flex-none"
              >
                Hoje
              </Button>
            </div>
          </div>

          {/* Linha 2: Empresa + Período + Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">Transportes Moraes e Petry LTDA ME</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {(startDate && endDate) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium whitespace-nowrap">
                    <Calendar className="w-3 h-3" />
                    {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Período: {resumo.periodo_inicio} a {resumo.periodo_fim}</span>
                )}
              </p>
              {usandoBanco && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium whitespace-nowrap">
                  {resumoBanco!.totalRegistros} reg.
                </span>
              )}
            </div>
          </div>
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
          <div className="kpi-card-3d rounded-lg p-4 sm:p-6 text-white shadow-lg bg-gradient-to-br from-blue-500 to-blue-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">🏦 SALDO</span>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">{formatMoney(saldoFinal || 0)}</div>
            <div className="text-xs sm:text-sm opacity-90">
              {saldoFinal ? (
                <>Atualização: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
              ) : (
                <>Nenhuma atualização</>
              )}
            </div>
          </div>

          {/* Card Receitas */}
          <div className="kpi-card-3d rounded-lg p-4 sm:p-6 text-white shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">✅ RECEITAS</span>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">{formatMoney(resumoFiltrado.receitas)}</div>
            <div className="text-xs sm:text-sm opacity-90">{resumoFiltrado.qtd_receitas} entradas</div>
          </div>

          {/* Card Despesas */}
          <div className="kpi-card-3d rounded-lg p-4 sm:p-6 text-white shadow-lg bg-gradient-to-br from-red-500 to-red-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">🌞 DESPESAS</span>
              <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">-{formatMoney(resumoFiltrado.despesas)}</div>
            <div className="text-xs sm:text-sm opacity-90">{resumoFiltrado.qtd_despesas} saídas</div>
          </div>
        </div>

        {/* MonthCards */}
        <div className="mb-6 entrance-animate" style={{ animationDelay: '0.2s' }}>
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {months.map((month) => {
              // Calcular lucro do mês
              const monthStart = new Date('2026-01-01');
              monthStart.setMonth(month.month);
              monthStart.setDate(1);
              
              const monthEnd = new Date(monthStart);
              monthEnd.setMonth(monthEnd.getMonth() + 1);
              monthEnd.setDate(0);
              
              const monthStartStr = monthStart.toISOString().split('T')[0];
              const monthEndStr = monthEnd.toISOString().split('T')[0];
              
              let monthLucro = 0;
              Object.values(detalhes).forEach((categoryData: any) => {
                const items = categoryData?.registros || [];
                items.forEach((item: any) => {
                  const itemDate = parseRegistroDate(item.data);
                  if (!itemDate) return;
                  if (itemDate < new Date(monthStartStr + 'T00:00:00')) return;
                  if (itemDate > new Date(monthEndStr + 'T23:59:59')) return;
                  monthLucro += Number(item.valor) || 0;
                });
              });
              
              return (
                <MonthCard
                  key={month.id}
                  month={month.label}
                  monthId={month.id}
                  lucro={monthLucro}
                  isSelected={selectedMonths.includes(month.id)}
                  onClick={() => {
                    if (selectedMonths.includes(month.id)) {
                      setSelectedMonths(selectedMonths.filter(m => m !== month.id));
                    } else {
                      setSelectedMonths([...selectedMonths, month.id]);
                    }
                    setActiveQuickFilter(null);
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Filtros */}
        <Card className="bg-slate-900/50 border-slate-700 mb-6 entrance-animate" style={{ animationDelay: '0.3s' }}>
          <CardContent className="pt-4 sm:pt-6">
            <div className="space-y-3">
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-300 block mb-0.5 -mt-0.5">Período</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="mm/dd/yyyy"
                      value={startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                      readOnly
                      className="bg-slate-800 border-slate-700 text-slate-100 text-xs sm:text-sm h-9 pr-8"
                    />
                    <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="mm/dd/yyyy"
                      value={endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                      readOnly
                      className="bg-slate-800 border-slate-700 text-slate-100 text-xs sm:text-sm h-9 pr-8"
                    />
                    <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </div>

              {(isFiltering || selectedMonths.length > 0) && (
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="w-full text-xs sm:text-sm h-8"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detalhamento de Categorias */}
        <div className="space-y-3 entrance-animate" style={{ animationDelay: '0.4s' }}>
          {categoriasFiltradas.map((categoria) => {
            const categoryData = detalhes[categoria.nome];
            if (!categoryData) return null;

            const items = categoryData.registros || [];
            const isExpanded = expandedCategory === categoria.nome;
            const groupByDescription = groupByDescriptionMap[categoria.nome] || false;
            const groupedItems = groupRegistrosByDescription(items, groupByDescription);

            return (
              <Card key={categoria.nome} id={`category-${categoria.nome}`} className="bg-slate-900/50 border-slate-700">
                <CardHeader
                  className="cursor-pointer hover:bg-slate-800/50 p-4 sm:p-6"
                  onClick={() => setExpandedCategory(isExpanded ? null : categoria.nome)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CategoryIcon categoryName={categoria.nome} />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base text-slate-100 truncate">{simplifyCategoriName(categoria.nome)}</CardTitle>
                        <p className="text-xs text-slate-500">{categoria.quantidade} registro{categoria.quantidade !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm sm:text-base font-bold ${categoria.valor >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {categoria.valor >= 0 ? '+' : ''}{formatMoney(categoria.valor)}
                      </span>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-4 sm:p-6 border-t border-slate-700">
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`group-${categoria.nome}`}
                        checked={groupByDescription}
                        onChange={(e) => setGroupByDescriptionMap({ ...groupByDescriptionMap, [categoria.nome]: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 cursor-pointer"
                      />
                      <label htmlFor={`group-${categoria.nome}`} className="text-xs sm:text-sm text-slate-300 cursor-pointer">
                        Agrupar por descrição
                      </label>
                    </div>

                    <div className="space-y-2">
                      {groupedItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-slate-800/50 rounded text-xs sm:text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 truncate">{item.descricao}</p>
                            {groupByDescription && item.count > 1 && (
                              <p className="text-xs text-emerald-400 font-medium">{item.count} registros</p>
                            )}
                            {item.data && (
                              <p className="text-xs text-slate-500">{item.data}</p>
                            )}
                          </div>
                          <span className={`font-semibold flex-shrink-0 ml-2 ${Number(item.valor) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {Number(item.valor) >= 0 ? '+' : ''}{formatMoney(Number(item.valor))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Gráfico de Despesas por Categoria */}
        {categoriasFiltradas.filter(c => c.valor < 0).length > 0 && (
          <div className="mt-6 entrance-animate" style={{ animationDelay: '0.5s' }}>
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <BarChartWithLabels
                  data={categoriasFiltradas
                    .filter(c => c.valor < 0)
                    .map((c, idx) => ({
                      nome: c.nome,
                      valor_display: Math.abs(c.valor),
                      fill: COLORS[idx % COLORS.length]
                    }))}
                  formatMoney={formatMoney}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
