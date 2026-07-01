import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Truck, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

interface Carga {
  id: number;
  data: string;
  rota: string;
  motorista: string;
  placa: string;
  valorFrete: number;
  valorRetido: number;
  valorCombustivel: number;
  litrosCombustivel: number;
  chapa1: string;
  chapa2: string;
  manutencao: number;
  custoOutros: number;
  pedagio: number;
  numeroProtocolo: string;
}

interface DetailedAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cargas: Carga[];
  pasta: string;
}

export function DetailedAnalyticsModal({
  isOpen,
  onClose,
  cargas,
  pasta,
}: DetailedAnalyticsModalProps) {
  const analytics = useMemo(() => {
    if (!cargas.length) {
      return {
        totalCargas: 0,
        totalFaturado: 0,
        totalCusto: 0,
        totalLucro: 0,
        custoDiesel: 0,
        custoChapa: 0,
        custoRetido: 0,
        custoOutros: 0,
        custoPedagio: 0,
        manutencao: 0,
        custoPercentual: 0,
        lucroPercentual: 0,
      };
    }

    const totalCargas = cargas.length;
    const totalFaturado = cargas.reduce((sum, c) => sum + (Number(c.valorFrete) || 0), 0);
    
    const custoDiesel = cargas.reduce((sum, c) => sum + (Number(c.valorCombustivel) || 0), 0);
    const custoChapa = cargas.reduce((sum, c) => {
      const chapa1 = c.chapa1 ? 180 : 0;
      const chapa2 = c.chapa2 ? 180 : 0;
      return sum + chapa1 + chapa2;
    }, 0);
    const custoRetido = cargas.reduce((sum, c) => sum + (Number(c.valorRetido) || 0), 0);
    const custoOutros = cargas.reduce((sum, c) => sum + (Number(c.custoOutros) || 0), 0);
    const custoPedagio = cargas.reduce((sum, c) => sum + (Number(c.pedagio) || 0), 0);
    const manutencao = cargas.reduce((sum, c) => sum + (Number(c.manutencao) || 0), 0);
    
    const totalCusto = custoDiesel + custoChapa + custoRetido + custoOutros + custoPedagio + manutencao;
    const totalLucro = totalFaturado - totalCusto;
    const custoPercentual = totalFaturado > 0 ? (totalCusto / totalFaturado) * 100 : 0;
    const lucroPercentual = totalFaturado > 0 ? (totalLucro / totalFaturado) * 100 : 0;

    return {
      totalCargas,
      totalFaturado,
      totalCusto,
      totalLucro,
      custoDiesel,
      custoChapa,
      custoRetido,
      custoOutros,
      custoPedagio,
      manutencao,
      custoPercentual,
      lucroPercentual,
    };
  }, [cargas]);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const costBreakdown = [
    { label: 'Diesel', value: analytics.custoDiesel, color: 'from-blue-600 to-blue-400', icon: '⛽' },
    { label: 'Chapa', value: analytics.custoChapa, color: 'from-purple-600 to-purple-400', icon: '🔧' },
    { label: 'Retido', value: analytics.custoRetido, color: 'from-yellow-600 to-yellow-400', icon: '📋' },
    { label: 'Motorista', value: analytics.custoOutros, color: 'from-orange-600 to-orange-400', icon: '📦' },
    { label: 'Pedágio', value: analytics.custoPedagio, color: 'from-cyan-600 to-sky-400', icon: '🛣️' },
    { label: 'Manutenção', value: analytics.manutencao, color: 'from-red-600 to-red-400', icon: '🔨' },
  ];

  const maxCost = Math.max(...costBreakdown.map(c => c.value), 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 w-full max-w-[calc(100vw-16px)] md:max-w-[860px] lg:max-w-[1040px] max-h-[95vh] overflow-y-auto overflow-x-hidden p-3 rounded-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            📊 Análise - {pasta}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 w-full">
          {/* Métricas Principais - Compacto */}
          <div className="flex flex-row flex-nowrap gap-2 overflow-x-auto">
            <Card className="flex-1 min-w-[160px] max-w-[calc(33.333%-0.75rem)] bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-700/50 p-2">
              <div className="text-[10px] text-green-300 font-semibold uppercase tracking-wide">Faturado</div>
              <div className="text-xs font-bold text-green-100 truncate">{formatBRL(analytics.totalFaturado)}</div>
            </Card>

            <Card className="flex-1 min-w-[160px] max-w-[calc(33.333%-0.75rem)] bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-700/50 p-2">
              <div className="text-[10px] text-red-300 font-semibold uppercase tracking-wide">Custo</div>
              <div className="text-xs font-bold text-red-100 truncate">{formatBRL(analytics.totalCusto)}</div>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-red-200">
                <TrendingDown className="w-3 h-3 text-red-300" />
                <span>{analytics.custoPercentual.toFixed(0)}% do faturado</span>
              </div>
            </Card>

            <Card className={`flex-1 min-w-[160px] max-w-[calc(33.333%-0.75rem)] bg-gradient-to-br ${analytics.totalLucro >= 0 ? 'from-emerald-900/40 to-emerald-800/20 border-emerald-700/50' : 'from-rose-900/40 to-rose-800/20 border-rose-700/50'} p-2`}>
              <div className={`text-[10px] ${analytics.totalLucro >= 0 ? 'text-emerald-300' : 'text-rose-300'} font-semibold uppercase tracking-wide`}>Lucro</div>
              <div className={`text-xs font-bold ${analytics.totalLucro >= 0 ? 'text-emerald-100' : 'text-rose-100'} truncate`}>{formatBRL(analytics.totalLucro)}</div>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold">
                <TrendingUp className={`w-3 h-3 ${analytics.totalLucro >= 0 ? 'text-emerald-300' : 'text-rose-300'}`} />
                <span className={analytics.totalLucro >= 0 ? 'text-emerald-200' : 'text-rose-200'}>
                  Margem {analytics.lucroPercentual.toFixed(0)}%
                </span>
              </div>
            </Card>
          </div>

          {/* Distribuição de Custos */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-2">
            <h3 className="text-sm font-bold text-slate-100 mb-1">📈 Custos</h3>
            <div className="space-y-1">
              {costBreakdown.map((item) => {
                const percentage = analytics.totalCusto > 0 ? (item.value / analytics.totalCusto) * 100 : 0;
                const barWidth = analytics.totalCusto > 0 ? (item.value / maxCost) * 100 : 0;
                
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-semibold text-slate-300 truncate flex-1">
                        {item.icon} {item.label}
                      </span>
                      <div className="text-right flex-shrink-0 whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-100">{formatBRL(item.value)}</span>
                        <span className="text-sm text-slate-400 ml-1">({percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Insights */}
          {analytics.lucroPercentual < 10 && (
            <Card className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-yellow-700/50 p-1.5">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-300">⚠️ Atenção</p>
                  <p className="text-xs text-yellow-200 mt-0.5 leading-tight">
                    Margem de lucro abaixo de 10%.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
