import { useEffect, useState } from 'react';
import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Upload, Calendar, Clock, Sun, Zap, Search, X } from 'lucide-react';
import BarChartWithLabels from '@/components/BarChartWithLabels';
import CategoryIcon from '@/components/CategoryIcon';
import { TransacaoCategoriaSelector } from '@/components/TransacaoCategoriaSelector';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useMemo, useRef } from 'react';

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
      const lastDay = resumoBanco!.diario[resumoBanco!.diario.length - 1];
      return new Date(lastDay.data_full);
    }
    if (dashboardData.diario && dashboardData.diario.length > 0) {
      const lastDay = dashboardData.diario[dashboardData.diario.length - 1];
      return new Date(lastDay.data_full);
    }
    return new Date('2026-05-27');
  })();

  // Estados locais
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByDescription, setGroupByDescription] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calcular dias desde a última transação
  const daysSinceLastTransaction = Math.floor((new Date().getTime() - REFERENCE_DATE.getTime()) / (1000 * 60 * 60 * 24));

  // Formatar moeda
  const formatMoney = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Calcular categorias com dados
  const categoriasComDados = useMemo(() => {
    return categorias
      .filter((cat) => {
        const categoryData = detalhes[cat.nome];
        return categoryData && categoryData.registros && categoryData.registros.length > 0;
      })
      .sort((a, b) => Math.abs(b.valor_abs) - Math.abs(a.valor_abs));
  }, [categorias, detalhes]);

  // Buscar transações por query
  const transacoesEncontradas = useMemo(() => {
    if (!searchQuery.trim()) return [];

    for (const [categoryName, categoryData] of Object.entries(detalhes)) {
      const items = (categoryData as any)?.registros || [];
      const found = items.find((item: any) => 
        item.descricao.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (found) {
        return items.filter((item: any) =>
          item.descricao.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }
    return [];
  }, [searchQuery, detalhes]);

  // Limpar busca
  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-50">Dashboard Financeiro</h1>
        <p className="text-slate-400 text-sm md:text-base">
          Transportes Moraes e Petry LTDA ME
        </p>
        <p className="text-slate-500 text-xs md:text-sm">
          Período completo: {resumo.periodo_inicio} à {resumo.periodo_fim}
        </p>
        {usandoBanco && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            Banco de dados ({resumoBanco!.totalRegistros} registros)
          </span>
        )}
      </div>

      {/* Filtros e Importação */}
      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <CardTitle className="text-sm">Filtros e Importação</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar transação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {searchQuery && transacoesEncontradas.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              {transacoesEncontradas.map((item: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedTransaction(item);
                    setShowTransactionDetails(true);
                  }}
                  className="w-full text-left p-2 hover:bg-slate-700 rounded transition-colors text-xs"
                >
                  <p className="text-slate-200 font-medium">{item.descricao}</p>
                  <p className="text-slate-400 text-xs">{item.data} • {formatMoney(item.valor)}</p>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <Search className="w-4 h-4 mr-1" />
              Buscar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Upload className="w-4 h-4 mr-1" />
              OFX
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-700 bg-gradient-to-br from-emerald-900/30 to-emerald-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs md:text-sm mb-1">LUCRO</p>
                <p className="text-2xl md:text-3xl font-bold text-emerald-400">{formatMoney(resumo.resultado)}</p>
                <p className="text-slate-500 text-xs mt-1">POSITIVO</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-gradient-to-br from-blue-900/30 to-blue-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs md:text-sm mb-1">SALDO</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-400">
                  {saldoFinal !== undefined ? formatMoney(saldoFinal) : 'N/A'}
                </p>
                <p className="text-slate-500 text-xs mt-1">Último OFX</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs md:text-sm mb-1">Receitas</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-100">{formatMoney(resumo.total_receitas)}</p>
                <p className="text-slate-500 text-xs mt-1">{resumo.qtd_receitas} entradas</p>
              </div>
              <TrendingUp className="w-8 h-8 text-slate-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs md:text-sm mb-1">Despesas</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-100">{formatMoney(resumo.total_despesas)}</p>
                <p className="text-slate-500 text-xs mt-1">{resumo.qtd_despesas} saídas</p>
              </div>
              <TrendingDown className="w-8 h-8 text-slate-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-sm md:text-base">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartWithLabels data={categorias} formatMoney={formatMoney} />
        </CardContent>
      </Card>

      {/* Detalhes por Categoria */}
      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-sm md:text-base">Detalhes por Categoria</CardTitle>
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
                          <div key={idx} className="flex justify-between items-start text-xs gap-2 p-2 bg-slate-800/50 rounded">
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
                              {!isGrouped && item.id && (
                                <div className="w-40">
                                  <TransacaoCategoriaSelector
                                    transacaoId={item.id}
                                    categoriaAtual={item.categoria || categoria.nome}
                                    descricao={item.descricao}
                                    onSuccess={() => {
                                      utils.ofx.resumoCompleto.invalidate();
                                      toast.success('Categoria atualizada!');
                                    }}
                                  />
                                </div>
                              )}
                              <span className="text-slate-100 font-semibold text-xs whitespace-nowrap">{formatMoney(item.valor)}</span>
                            </div>
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

      {/* Transaction Details Dialog */}
      <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-xs mb-1">Descrição</p>
                <p className="text-slate-100 font-medium">{selectedTransaction.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Data</p>
                  <p className="text-slate-100">{selectedTransaction.data}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Valor</p>
                  <p className="text-slate-100 font-semibold">{formatMoney(selectedTransaction.valor)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
