import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Upload, Calendar, Clock, Sun, Zap, Search, X, Fuel, Truck, Landmark, Building2, Wallet, SlidersHorizontal, Bell, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BarChartWithLabels from '@/components/BarChartWithLabels';
import CategoryIcon from '@/components/CategoryIcon';
import MonthCard from '@/components/MonthCard';
import { CategoryDetailView } from '@/components/CategoryDetailView';
import { MovimentarCategoriaButton } from '@/components/MovimentarCategoriaButton';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useFilteredData } from '@/hooks/useFilteredData';
import { useDateFilter } from '@/hooks/useDateFilter';
import { useAccountFilter } from '@/hooks/useAccountFilter';

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4', '#84CC16'
];

const CNPJ_MAP: Record<string, string> = {
  'mp': '24.853.275/0001-36',
  'mmp': '51.621.925/0001-90',
};

const ACCOUNT_OPTIONS = [
  { id: 'mp', label: 'M&P', icon: Landmark, tone: 'from-amber-500/15 to-amber-400/5 border-amber-400/40' },
  { id: 'mmp', label: 'MMP', icon: Landmark, tone: 'from-amber-500/15 to-amber-400/5 border-amber-400/40' },
];

// ─────────────────────────────────────────────────────────────
// Funções Utilitárias
// ─────────────────────────────────────────────────────────────

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

const getAccountBucket = (value: string) => {
  const normalized = value.toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 1000;
  }
  return hash % ACCOUNT_OPTIONS.length;
};

const getAccountIdForItem = (item: any) => 
  ACCOUNT_OPTIONS[getAccountBucket(item?.descricao || item?.categoria || 'bank')].id;

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

const formatMoney = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const parseRegistroDate = (data: string): string => {
  if (!data) return '';
  const parts = data.split('/');
  if (parts.length === 3) {
    return `${parts[0]}/${parts[1]}`;
  }
  return data;
};

// ─────────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: resumoBanco } = trpc.ofx.resumoCompleto.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Dados
  const usandoBanco = !!(resumoBanco && resumoBanco.totalRegistros > 0);
  const resumo = usandoBanco ? resumoBanco!.resumo : dashboardData.resumo;
  const saldoFinal = usandoBanco ? resumoBanco!.saldoFinal : undefined;
  const categorias = usandoBanco ? resumoBanco!.categorias : dashboardData.categorias;
  const diario = usandoBanco ? resumoBanco!.diario : dashboardData.diario;
  const timeline_categorias = (dashboardData as unknown as { timeline_categorias?: unknown[] }).timeline_categorias ?? [];
  const detalhes = (usandoBanco ? resumoBanco!.detalhes : detalhesData) as Record<string, any>;

  // Hooks customizados
  const { selectedAccounts, toggleAccount } = useAccountFilter();
  const dateFilter = useDateFilter(
    usandoBanco && resumoBanco?.diario.length > 0
      ? resumoBanco!.diario[resumoBanco!.diario.length - 1].data_full
      : dashboardData.diario.length > 0
      ? dashboardData.diario[dashboardData.diario.length - 1].data_full
      : '2026-05-27'
  );
  const { filteredDetalhes, filteredCategorias, filteredResumo } = useFilteredData(
    detalhes,
    categorias,
    resumo,
    selectedAccounts,
    CNPJ_MAP
  );

  // Estados locais
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [groupByDescription, setGroupByDescription] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [lastImportInfo, setLastImportInfo] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [hasNewCategoryChanges, setHasNewCategoryChanges] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const monthsScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ao mês com dados
  const lastMonthWithData = useMemo(() => {
    if (!usandoBanco || !resumoBanco?.diario || resumoBanco.diario.length === 0) return null;
    const lastDate = resumoBanco.diario[resumoBanco.diario.length - 1].data_full;
    const lastDateObj = new Date(lastDate + 'T00:00:00');
    const monthIndex = lastDateObj.getMonth();
    return dateFilter.months[monthIndex]?.id || null;
  }, [usandoBanco, resumoBanco, dateFilter.months]);

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

  // Handlers
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Digite algo para buscar');
      return;
    }
    toast.info(`Buscando: ${searchQuery}`);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const base64 = content.split(',')[1] || content;

        const result = await utils.client.ofx.processOFX.mutate({
          fileBase64: base64,
          nomeArquivo: file.name,
        });

        if (result.success) {
          toast.success(`${result.totalNovos} transações importadas!`);
          setHasNewNotification(true);
          setLastImportInfo(result);
          utils.ofx.resumoCompleto.invalidate();
        } else {
          toast.error(result.mensagem || 'Erro ao processar OFX');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Erro ao ler arquivo');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleCategoryChange = () => {
    setHasNewCategoryChanges(true);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    try {
      await utils.ofx.resumoCompleto.invalidate();
      setSyncProgress(100);
      setHasNewCategoryChanges(false);
      toast.success('Sincronizado!');
    } catch (error) {
      toast.error('Erro ao sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };

  const { data: uploadsHistory } = trpc.ofx.listUploads.useQuery();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-100">Balanço Financeiro TR. Petry Ltda.</h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="relative"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {hasNewCategoryChanges && <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="relative"
              onClick={() => setNotificationOpen(true)}
            >
              <Bell className="w-4 h-4" />
              {hasNewNotification && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="mt-3 flex gap-2">
            <Input
              ref={searchInputRef}
              placeholder="Buscar transação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-slate-800 border-slate-700"
            />
            <Button size="sm" onClick={handleSearch}>
              Buscar
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Section */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Importar Extrato OFX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
              <span className="text-sm text-slate-400">
                {isUploading ? 'Processando...' : 'Clique ou arraste um arquivo OFX'}
              </span>
              <input
                type="file"
                accept=".ofx"
                onChange={handleUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </CardContent>
        </Card>

        {/* Filter Section */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Account Filter */}
            <div className="flex gap-2 flex-wrap">
              {ACCOUNT_OPTIONS.map(account => (
                <Button
                  key={account.id}
                  size="sm"
                  variant={selectedAccounts.includes(account.id) ? 'default' : 'outline'}
                  onClick={() => toggleAccount(account.id)}
                  className="text-xs"
                >
                  {account.label}
                </Button>
              ))}
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2 flex-wrap">
              {dateFilter.quickFilters.map(filter => (
                <Button
                  key={filter.id}
                  size="sm"
                  variant={dateFilter.activeQuickFilter === filter.id ? 'default' : 'outline'}
                  onClick={() => dateFilter.applyQuickFilter(filter.id)}
                  className="text-xs"
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Month Filter */}
            <div ref={monthsScrollRef} className="flex gap-2 overflow-x-auto pb-2">
              {dateFilter.months.map(month => (
                <MonthCard
                  key={month.id}
                  id={`month-${month.id}`}
                  month={month.label}
                  value={0}
                  isSelected={dateFilter.selectedMonths.includes(month.id)}
                  onClick={() => dateFilter.toggleMonth(month.id)}
                />
              ))}
            </div>

            {/* Date Range */}
            {(dateFilter.startDate || dateFilter.endDate) && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>{dateFilter.startDate} a {dateFilter.endDate}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dateFilter.clearFilters}
                  className="ml-auto"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-red-900/20 border-red-800/50">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-red-400 mb-1">LUCRO</p>
                  <p className="text-lg font-bold text-red-400">{formatMoney(filteredResumo.resultado)}</p>
                  <p className="text-xs text-red-600 mt-1">NEGATIVO</p>
                </div>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-900/20 border-blue-800/50">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-blue-400 mb-1">SALDO</p>
                  <p className="text-lg font-bold text-blue-400">{formatMoney(saldoFinal || 0)}</p>
                  {saldoFinal && <p className="text-xs text-blue-600 mt-1">{new Date().toLocaleDateString('pt-BR')}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-900/20 border-green-800/50">
            <CardContent className="pt-4">
              <div>
                <p className="text-xs text-green-400 mb-1">RECEITAS</p>
                <p className="text-lg font-bold text-green-400">{formatMoney(filteredResumo.total_receitas)}</p>
                <p className="text-xs text-green-600 mt-1">{filteredResumo.qtd_receitas} entradas</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-900/20 border-red-800/50">
            <CardContent className="pt-4">
              <div>
                <p className="text-xs text-red-400 mb-1">DESPESAS</p>
                <p className="text-lg font-bold text-red-400">{formatMoney(filteredResumo.total_despesas)}</p>
                <p className="text-xs text-red-600 mt-1">{filteredResumo.qtd_despesas} saídas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm">Gráfico de Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartWithLabels data={filteredCategorias} colors={COLORS} />
            </CardContent>
          </Card>

          {/* Category Details */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm">Categorias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCategorias.slice(0, 10).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-slate-800/50">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CategoryIcon categoryName={cat.nome} />
                    <span className="truncate">{simplifyCategoriName(cat.nome)}</span>
                  </div>
                  <span className="font-bold text-slate-300 flex-shrink-0">{formatMoney(cat.valor)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Category Details View */}
        <CategoryDetailView
          categoriasComDados={filteredCategorias}
          detalhes={filteredDetalhes}
          expandedCategory={expandedCategory}
          setExpandedCategory={setExpandedCategory}
          groupByDescription={groupByDescription}
          setGroupByDescription={setGroupByDescription}
          startDate={dateFilter.startDate}
          endDate={dateFilter.endDate}
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

      {/* Notification Dialog */}
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
