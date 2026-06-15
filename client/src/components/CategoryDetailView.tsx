import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, BarChart3, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CategoryIcon from './CategoryIcon';
import BarChartWithLabels from './BarChartWithLabels';

interface CategoryData {
  nome: string;
  valor: number;
  valor_abs: number;
  registros: any[];
}

interface CategoryDetailViewProps {
  categoriasComDados: CategoryData[];
  detalhes: Record<string, any>;
  expandedCategory: string | null;
  setExpandedCategory: (category: string | null) => void;
  groupByDescription: boolean;
  setGroupByDescription: (group: boolean) => void;
  startDate: string;
  endDate: string;
  formatMoney: (value: number) => string;
  simplifyCategoriName: (name: string) => string;
  parseRegistroDate: (date: string) => Date | null;
  groupRegistrosByDescription: (items: any[], group: boolean) => any[];
  onCategoryClick?: (nome: string, item: any) => void;
  renderDetailContent?: (items: any[], categoryName: string) => React.ReactNode;
}

export function CategoryDetailView({
  categoriasComDados,
  detalhes,
  expandedCategory,
  setExpandedCategory,
  groupByDescription,
  setGroupByDescription,
  startDate,
  endDate,
  formatMoney,
  simplifyCategoriName,
  parseRegistroDate,
  groupRegistrosByDescription,
  onCategoryClick,
  renderDetailContent,
}: CategoryDetailViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');

  // Calcular total de despesas para porcentagem
  const totalDespesas = useMemo(() => {
    return categoriasComDados
      .filter(cat => cat.valor < 0)
      .reduce((sum, cat) => sum + cat.valor_abs, 0);
  }, [categoriasComDados]);

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    return categoriasComDados
      .filter(cat => cat.valor < 0)
      .map(cat => ({
        nome: simplifyCategoriName(cat.nome),
        nomeOriginal: cat.nome,
        valor_display: cat.valor_abs
      }));
  }, [categoriasComDados, simplifyCategoriName]);

  // Renderizar vista de lista com barras de progresso (apenas despesas)
  const renderListView = () => (
    <div className="space-y-2">
      {categoriasComDados
        .filter(cat => cat.valor < 0) // Mostrar apenas despesas
        .map((categoria) => {
        const categoryData = detalhes[categoria.nome];
        const allItems = categoryData?.registros || [];
        
        // Filtrar items por data se houver filtro ativo
        const items = (!startDate && !endDate) ? allItems : allItems.filter((item: any) => {
          const itemDate = parseRegistroDate(item.data);
          if (!itemDate) return false;
          const startObj = startDate ? new Date(startDate + 'T00:00:00') : null;
          const endObj = endDate ? new Date(endDate + 'T23:59:59') : null;
          if (startObj && itemDate < startObj) return false;
          if (endObj && itemDate > endObj) return false;
          return true;
        });

        const isExpanded = expandedCategory === categoria.nome;
        const categoryValue = Math.abs(items.reduce((sum: number, item: any) => sum + Number(item.valor), 0));
        const percentage = totalDespesas > 0 ? ((categoryValue / totalDespesas) * 100).toFixed(0) : 0;
        
        // Cor derivada do valor (mais saturada para maiores valores)
        const getProgressColor = () => {
          if (categoria.valor >= 0) return 'from-emerald-500/30 to-emerald-600/20';
          return 'from-red-500/30 to-red-600/20';
        };

        return (
          <div 
            key={categoria.nome} 
            id={`category-${categoria.nome}`} 
            className={`relative rounded-lg overflow-hidden border border-slate-700 transition-all duration-200 ${
              isExpanded ? 'bg-slate-800/50' : 'bg-slate-900/30 hover:bg-slate-800/30'
            }`}
          >
            {/* Barra de progresso de fundo */}
            <div 
              className={`absolute inset-0 bg-gradient-to-r ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />

            {/* Conteúdo do card */}
            <div className="relative z-10">
              <button
                onClick={() => {
                  setExpandedCategory(isExpanded ? null : categoria.nome);
                  if (onCategoryClick && !isExpanded) {
                    onCategoryClick(categoria.nome, { nomeOriginal: categoria.nome });
                  }
                }}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CategoryIcon categoryName={categoria.nome} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                    {simplifyCategoriName(categoria.nome)}
                  </span>
                  <span className="text-xs text-slate-400 flex-shrink-0">({items.length})</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-100 whitespace-nowrap">
                    {formatMoney(categoryValue)} | <span className="text-slate-300 font-semibold text-xxs">{percentage}%</span>
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Conteúdo expandido */}
              {isExpanded && (
                <div className="border-t border-slate-700 bg-slate-900/50 p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={groupByDescription}
                      onChange={(e) => setGroupByDescription(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-400 bg-slate-800 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300">Agrupar por descrição</span>
                  </label>
                  {renderDetailContent ? (
                    renderDetailContent(items, categoria.nome)
                  ) : (
                    <div className="text-xs text-slate-400">Sem detalhes disponíveis</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Renderizar vista de gráfico
  const renderChartView = () => (
    <BarChartWithLabels
      data={chartData}
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
  );

  return (
    <Card className="border-slate-700 bg-slate-900/50 kpi-card-3d entrance-animate">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg text-slate-100">
          Detalhamento de Categorias
        </CardTitle>
        
        {/* Toggle Gráfico/Lista */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 ${
              viewMode === 'chart'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            title="Visualizar como gráfico"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Gráfico</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            title="Visualizar como lista"
          >
            <List className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Lista</span>
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'list' ? renderListView() : renderChartView()}
      </CardContent>
    </Card>
  );
}
