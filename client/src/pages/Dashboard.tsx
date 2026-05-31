'use client';
import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Upload, Calendar, Clock, Sun, Zap, Search, X, Fuel } from 'lucide-react';
import BarChartWithLabels from '@/components/BarChartWithLabels';
import CategoryIcon from '@/components/CategoryIcon';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useState, useMemo, useRef } from 'react';

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

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  // Sem filtro pré-setado: dashboard abre mostrando todo o período disponível
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [groupByDescription, setGroupByDescription] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Opções de filtros rápidos baseadas no último dia do extrato (27/05/2026)
  const quickFilters = [
    { id: 'hoje', label: 'Hoje', days: 0 },
    { id: '7d', label: '7d', days: 7 },
    { id: '15d', label: '15d', days: 15 },
    { id: 'mes', label: 'Mês', days: 30 },
    { id: 'trim', label: 'Trim', days: 90 },
    { id: 'sem', label: 'Sem', days: 180 },
    { id: 'ano', label: 'Ano', days: 365 },
    { id: 'tudo', label: 'Tudo', days: null },
  ];

  // Aplicar filtro rápido
  const applyQuickFilter = (filterId: string) => {
    const filter = quickFilters.find(f => f.id === filterId);
    if (!filter) return;
    
    setActiveQuickFilter(filterId);
    
    if (filter.days === null) {
      setStartDate('');
      setEndDate('');
      return;
    }

    const refDate = new Date(REFERENCE_DATE + 'T00:00:00');
    const start = new Date(refDate);
    start.setDate(start.getDate() - filter.days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(REFERENCE_DATE);
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
    setIsFiltering(false);
  };

  // Filtrar diário por data
  const filteredDiario = useMemo(() => {
    if (!startDate && !endDate) return diario;
    return diario.filter(d => {
      if (startDate && d.data_full < startDate) return false;
      if (endDate && d.data_full > endDate) return false;
      return true;
    });
  }, [diario, startDate, endDate]);

  // Calcular resumo filtrado
  const resumoFiltrado = useMemo(() => {
    const result = {
      receitas: 0,
      despesas: 0,
      lucro: 0,
      resultado: 0,
      periodo_inicio: resumo.periodo_inicio,
      periodo_fim: resumo.periodo_fim,
    };

    filteredDiario.forEach(d => {
      if (d.valor > 0) {
        result.receitas += d.valor;
      } else if (d.valor < 0) {
        result.despesas += Math.abs(d.valor);
      }
    });

    result.lucro = result.receitas - result.despesas;
    result.resultado = result.receitas - result.despesas;

    return result;
  }, [filteredDiario, resumo]);

  // Categorias com dados
  const categoriasComDados = useMemo(() => {
    return categorias.filter(cat => cat.valor_abs > 0);
  }, [categorias]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 entrance-fade delay-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white">Dashboard Financeiro</h1>
            <Button
              variant="outline"
              size="icon"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition-colors"
              title="Combustível (em desenvolvimento)"
              onClick={() => toast.info('Funcionalidade em desenvolvimento')}
            >
              <Fuel className="w-5 h-5" />
            </Button>
            {usandoBanco && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                Banco de dados ({resumoBanco!.totalRegistros} registros)
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">Transportes Moraes e Petry LTDA ME</p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {(startDate && endDate) ? (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                <Calendar className="w-3 h-3" />
                {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            ) : (
              <>Período completo: {resumo.periodo_inicio} a {resumo.periodo_fim}</>
            )}
          </p>
        </div>

        {/* Filtros e Importação */}
        <Card className="border-slate-700 bg-slate-900/50 mb-6 entrance-animate delay-1" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Filtros e Importação
            </CardTitle>
            <div className="flex gap-1.5">
              <Button
                onClick={() => setSearchOpen(true)}
                className="btn-3d bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-2 flex-shrink-0"
              >
                <Search className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
              <label className="btn-3d bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2 rounded-md font-semibold cursor-pointer flex items-center gap-1 flex-shrink-0">
                <Upload className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">OFX</span>
                <input
                  type="file"
                  accept=".ofx,.OFX"
                  onChange={handleOfxUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {/* Filtros Rápidos em Tags */}
            <div className="mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-0.5">Filtros</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => applyQuickFilter(filter.id)}
                    className={`btn-3d px-2 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap entrance-animate ${
                      activeQuickFilter === filter.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
                {(startDate || endDate) && (
                  <button
                    onClick={resetFilters}
                    className="btn-3d col-span-2 sm:col-span-1 px-2 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-all whitespace-nowrap entrance-animate"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Datas Customizadas lado a lado em mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <div className="flex-1 min-w-0 sm:max-w-[160px]">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-0.5">Início</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActiveQuickFilter(null);
                  }}
                  className="w-full text-xs h-8 px-2 overflow-hidden"
                />
              </div>
              <div className="flex-1 min-w-0 sm:max-w-[160px]">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-0.5">Fim</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActiveQuickFilter(null);
                  }}
                  className="w-full text-xs h-8 px-2 overflow-hidden"
                />
              </div>

            </div>
          </CardContent>
        </Card>

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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 entrance-animate" style={{ animationDelay: '0.2s' }}>
          {/* Card Lucro */}
          <div className="kpi-card-3d bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg p-4 sm:p-6 text-white shadow-lg">
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
          </div>

          {/* Card Saldo */}
          <div className="kpi-card-3d bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg p-4 sm:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">🏦 SALDO</span>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">{saldoFinal ? formatMoney(saldoFinal) : 'R$ 0,00'}</div>
            <div className="text-xs sm:text-sm opacity-90">Último OFX</div>
          </div>

          {/* Card Receitas */}
          <div className="kpi-card-3d bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 sm:p-6 text-white shadow-lg border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">📈 Receitas</span>
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">{formatMoney(resumoFiltrado.receitas)}</div>
            <div className="text-xs sm:text-sm opacity-90">{resumo.qtd_receitas} entradas</div>
          </div>

          {/* Card Despesas */}
          <div className="kpi-card-3d bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 sm:p-6 text-white shadow-lg border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold opacity-90">📉 Despesas</span>
              <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-1">-{formatMoney(resumoFiltrado.despesas)}</div>
            <div className="text-xs sm:text-sm opacity-90">{resumo.qtd_despesas} saídas</div>
          </div>
        </div>

        {/* Gráfico de Despesas por Categoria */}
        <Card className="border-slate-700 bg-slate-900/50 mb-6 kpi-card-3d entrance-animate" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-base sm:text-lg text-slate-100">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-2 px-3">
            <BarChartWithLabels
              data={categoriasComDados
                .filter(cat => cat.valor < 0)
                .map(cat => ({
                  nome: simplifyCategoriName(cat.nome),
                  nomeOriginal: cat.nome,
                  valor_display: cat.valor_abs
                }))}
              formatMoney={formatMoney}
              onCategoryClick={(_nome: string, item: any) => {
                const original = item?.nomeOriginal;
                if (!original) return;
                setExpandedCategory(original);
                setTimeout(() => {
                  const element = document.getElementById(`category-${original}`);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
            />
          </CardContent>
        </Card>

        {/* Detalhamento por Categoria */}
        <Card className="border-slate-700 bg-slate-900/50 kpi-card-3d entrance-animate" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-slate-100">Detalhamento de Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoriasComDados.map((categoria) => {
                const categoryData = detalhes[categoria.nome];
                const items = categoryData?.registros || [];
                const isExpanded = expandedCategory === categoria.nome;

                return (
                  <div key={categoria.nome} id={`category-${categoria.nome}`} className="border border-slate-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : categoria.nome)}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CategoryIcon categoryName={categoria.nome} />
                        <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">{simplifyCategoriName(categoria.nome)}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0">({items.length})</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-100 whitespace-nowrap">{formatMoney(categoria.valor_abs)}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-700 bg-slate-900/30 p-3 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={groupByDescription}
                            onChange={(e) => setGroupByDescription(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-400 bg-slate-800 cursor-pointer"
                          />
                          <span className="text-xs text-slate-300">Agrupar por descrição</span>
                        </label>
                        {groupRegistrosByDescription(items, groupByDescription).map((item: any, idx: number) => {
                          const isGrouped = item.count > 1;
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
                              <span className="text-slate-100 font-semibold text-xs flex-shrink-0 whitespace-nowrap">{formatMoney(item.valor)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
