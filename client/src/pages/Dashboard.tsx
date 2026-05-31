import { useState, useMemo, useRef } from 'react';
import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Upload, Calendar, Clock, Sun, Zap, Search, X } from 'lucide-react';
import BarChartWithLabels from '@/components/BarChartWithLabels';
import CategoryIcon from '@/components/CategoryIcon';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Paleta usada pelo BarChartWithLabels (mantida para coerência visual futura)
const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4', '#84CC16'
];

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
    { id: 'today', label: 'Hoje', days: 1 },
    { id: 'week', label: '7d', days: 7 },
    { id: '15days', label: '15d', days: 15 },
    { id: 'month', label: 'Mês', days: 30 },
    { id: 'quarter', label: 'Trim', days: 90 },
    { id: 'semester', label: 'Sem', days: 180 },
    { id: 'year', label: 'Ano', days: 365 },
    { id: 'all', label: 'Tudo', days: 0 },
  ];

  // Aplicar filtro rápido baseado no último dia disponível
  // Com toggle: clicar no mesmo filtro novamente limpa o filtro
  const applyQuickFilter = (filterId: string) => {
    // Se o filtro já está ativo, limpar ao clicar novamente (toggle)
    if (activeQuickFilter === filterId) {
      resetFilters();
      return;
    }

    setIsFiltering(true);
    setExpandedCategory(null); // Fechar categoria expandida ao filtrar
    
    setTimeout(() => {
      if (filterId === 'all') {
        setStartDate('');
        setEndDate('');
        setActiveQuickFilter('all');
      } else {
        const filter = quickFilters.find(f => f.id === filterId);
        if (filter) {
          const referenceDate = new Date(REFERENCE_DATE);
          const endDateObj = referenceDate;
          const startDateObj = new Date(referenceDate);
          startDateObj.setDate(startDateObj.getDate() - filter.days + 1);

          setStartDate(startDateObj.toISOString().split('T')[0]);
          setEndDate(endDateObj.toISOString().split('T')[0]);
          setActiveQuickFilter(filterId);
        }
      }
      setTimeout(() => setIsFiltering(false), 200);
    }, 100);
  };

  // Função de busca: encontra registro e scroll até ele
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.toLowerCase();
    let found: any = null;
    
    // Buscar em todas as categorias
    for (const cat of categorias) {
      const categoryData = detalhes[cat.nome];
      const items = categoryData?.registros || [];
      const foundItem = items.find((item: any) => 
        item.descricao && item.descricao.toLowerCase().includes(query)
      );
      if (foundItem) {
        found = { ...foundItem, categoria: cat.nome };
        break;
      }
    }
    
    if (found) {
      setSearchOpen(false);
      setSearchQuery('');
      setExpandedCategory(found.categoria);
      
      setTimeout(() => {
        const element = document.getElementById(`category-${found.categoria}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
      toast.success(`Encontrado: ${found.descricao}`);
    } else {
      toast.error('Nenhum registro encontrado');
    }
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
      entradas: 0,
      saidas: 0,
    };

    // Somar valores das categorias
    for (const cat of categorias) {
      if (cat.valor > 0) {
        result.receitas += cat.valor;
        result.entradas += cat.quantidade || 1;
      } else {
        result.despesas += Math.abs(cat.valor);
        result.saidas += cat.quantidade || 1;
      }
    }

    result.lucro = result.receitas - result.despesas;
    return result;
  }, [filteredDiario]);

  // Calcular variação de receitas e despesas
  const variacao = useMemo(() => {
    const allDays = diario.length;
    const filteredDays = filteredDiario.length;
    const avgReceitas = allDays > 0 ? resumo.total_receitas / allDays : 0;
    const avgDespesas = allDays > 0 ? Math.abs(resumo.total_despesas) / allDays : 0;

    const expectedReceitas = avgReceitas * filteredDays;
    const expectedDespesas = avgDespesas * filteredDays;

    const variacaoReceitas = expectedReceitas > 0 
      ? ((resumoFiltrado.receitas - expectedReceitas) / expectedReceitas) * 100 
      : 0;
    const variacaoDespesas = expectedDespesas > 0 
      ? ((resumoFiltrado.despesas - expectedDespesas) / expectedDespesas) * 100 
      : 0;

    return { variacaoReceitas, variacaoDespesas };
  }, [resumo, filteredDiario, diario]);

  // Categorias filtradas (com dados)
  const categoriasComDados = useMemo(() => {
    return categorias.filter(cat => {
      const categoryData = detalhes[cat.nome];
      const items = categoryData?.registros || [];
      return items.length > 0;
    });
  }, [categorias, detalhes]);

  // Upload OFX
  const processOFXMutation = trpc.ofx.processOFX.useMutation();
  
  const handleOfxUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      await processOFXMutation.mutateAsync({ 
        fileBase64: base64,
        nomeArquivo: file.name 
      });
      toast.success('OFX importado com sucesso!');
      utils.ofx.resumoCompleto.invalidate();
    } catch (error) {
      toast.error('Erro ao importar OFX');
      console.error(error);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 entrance-fade">
      {/* Header */}
      <div className="mb-6 entrance-fade" style={{ animationDelay: '0s' }}>
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-100 mb-2">Dashboard Financeiro</h1>
        <p className="text-sm sm:text-base text-slate-400">Transportes Moraes e Petry LTDA ME</p>
        <p className="text-xs sm:text-sm text-slate-500">Período completo: {filteredDiario.length > 0 ? `${filteredDiario[0].data_full} à ${filteredDiario[filteredDiario.length - 1].data_full}` : 'Sem dados'}</p>
      </div>

      {/* Filtros e Importação */}
      <Card className="mb-6 border-slate-700 bg-slate-900/50 entrance-fade" style={{ animationDelay: '0.1s' }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">
              <Calendar className="w-5 h-5" />
              Filtros e Importação
            </div>
            <div className="flex gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
              <Button
                onClick={() => setSearchOpen(true)}
                size="sm"
                className="gap-1 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
              >
                <Search className="w-3 h-3" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
              <label>
                <Button
                  disabled={isUploading}
                  size="sm"
                  className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                  asChild
                >
                  <span>
                    <Upload className="w-3 h-3" />
                    <span className="hidden sm:inline">OFX</span>
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".ofx"
                  onChange={handleOfxUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </CardTitle>
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
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold mb-1">{formatMoney(resumoFiltrado.receitas)}</div>
          <div className="text-xs sm:text-sm opacity-75">{resumoFiltrado.entradas} entradas</div>
          {variacao.variacaoReceitas !== 0 && (
            <div className={`text-xs mt-1 ${variacao.variacaoReceitas > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {variacao.variacaoReceitas > 0 ? '↑' : '↓'} {Math.abs(variacao.variacaoReceitas).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Card Despesas */}
        <div className="kpi-card-3d bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 sm:p-6 text-white shadow-lg border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold opacity-90">📉 Despesas</span>
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold mb-1">-{formatMoney(resumoFiltrado.despesas)}</div>
          <div className="text-xs sm:text-sm opacity-75">{resumoFiltrado.saidas} saídas</div>
          {variacao.variacaoDespesas !== 0 && (
            <div className={`text-xs mt-1 ${variacao.variacaoDespesas > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {variacao.variacaoDespesas > 0 ? '↑' : '↓'} {Math.abs(variacao.variacaoDespesas).toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* Despesas por Categoria */}
      <Card className="mb-6 border-slate-700 bg-slate-900/50 kpi-card-3d entrance-animate" style={{ animationDelay: '0.3s' }}>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-slate-100">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartWithLabels
            data={categorias
              .filter(cat => cat.valor < 0)
              .map(cat => ({
                nome: cat.nome,
                valor_display: cat.valor_abs
              }))}
            formatMoney={formatMoney}
          />
        </CardContent>
      </Card>

      {/* Detalhamento por Categoria */}
      <Card className="border-slate-700 bg-slate-900/50 kpi-card-3d entrance-animate" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg text-slate-100">Detalhamento de Categorias</CardTitle>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={groupByDescription}
                onChange={(e) => setGroupByDescription(e.target.checked)}
                className="w-4 h-4 rounded border-slate-400 bg-slate-800 cursor-pointer"
              />
              <span className="text-xs sm:text-sm text-slate-300 whitespace-nowrap">Agrupar por descrição</span>
            </label>
          </div>
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
                    <div className="flex items-center gap-2 flex-1">
                      <CategoryIcon categoryName={categoria.nome} />
                      <span className="text-sm font-semibold text-slate-100">{categoria.nome}</span>
                      <span className="text-xs text-slate-400">({items.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">{formatMoney(categoria.valor_abs)}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-700 bg-slate-900/30 p-3 space-y-2">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start text-xs sm:text-sm">
                          <div className="flex-1">
                            <p className="text-slate-200 font-medium">{item.descricao}</p>
                            <p className="text-slate-500 text-xs">{item.data || 'N/A'}</p>
                          </div>
                          <span className="text-slate-100 font-semibold ml-2">{formatMoney(item.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
