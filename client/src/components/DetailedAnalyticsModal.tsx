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
        manutencao: 0,
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
    const manutencao = cargas.reduce((sum, c) => sum + (Number(c.manutencao) || 0), 0);
    
    const totalCusto = custoDiesel + custoChapa + custoRetido + custoOutros + manutencao;
    const totalLucro = totalFaturado - totalCusto;
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
      manutencao,
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
    { label: 'Outros', value: analytics.custoOutros, color: 'from-orange-600 to-orange-400', icon: '📦' },
    { label: 'Manutenção', value: analytics.manutencao, color: 'from-red-600 to-red-400', icon: '🔨' },
  ];

  const maxCost = Math.max(...costBreakdown.map(c => c.value), 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            📊 Análise Detalhada - {pasta}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-700/50 p-4">
              <div className="text-sm text-blue-300 font-semibold mb-2">Total de Cargas</div>
              <div className="text-3xl font-bold text-blue-100">{analytics.totalCargas}</div>
              <div className="text-xs text-blue-400 mt-2">📦 Registros</div>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-700/50 p-4">
              <div className="text-sm text-green-300 font-semibold mb-2">Faturado</div>
              <div className="text-2xl font-bold text-green-100">{formatBRL(analytics.totalFaturado)}</div>
              <div className="text-xs text-green-400 mt-2">💰 Receita</div>
            </Card>

            <Card className="bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-700/50 p-4">
              <div className="text-sm text-red-300 font-semibold mb-2">Custo Total</div>
              <div className="text-2xl font-bold text-red-100">{formatBRL(analytics.totalCusto)}</div>
              <div className="text-xs text-red-400 mt-2">💸 Despesas</div>
            </Card>

            <Card className={`bg-gradient-to-br ${analytics.totalLucro >= 0 ? 'from-emerald-900/40 to-emerald-800/20 border-emerald-700/50' : 'from-rose-900/40 to-rose-800/20 border-rose-700/50'} p-4`}>
              <div className={`text-sm ${analytics.totalLucro >= 0 ? 'text-emerald-300' : 'text-rose-300'} font-semibold mb-2`}>Lucro Líquido</div>
              <div className={`text-2xl font-bold ${analytics.totalLucro >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>
                {formatBRL(analytics.totalLucro)}
              </div>
              <div className={`text-xs ${analytics.totalLucro >= 0 ? 'text-emerald-400' : 'text-rose-400'} mt-2`}>
                {analytics.totalLucro >= 0 ? '📈' : '📉'} {analytics.lucroPercentual.toFixed(1)}%
              </div>
            </Card>
          </div>

          {/* Distribuição de Custos */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">📊 Distribuição de Custos</h3>
            <div className="space-y-3">
              {costBreakdown.map((item) => {
                const percentage = analytics.totalCusto > 0 ? (item.value / analytics.totalCusto) * 100 : 0;
                const barWidth = analytics.totalCusto > 0 ? (item.value / maxCost) * 100 : 0;
                
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-300">
                        {item.icon} {item.label}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-100">{formatBRL(item.value)}</span>
                        <span className="text-xs text-slate-400 ml-2">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
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

          {/* Tabela de Cargas */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">📋 Detalhamento por Carga</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-300 font-semibold">Data</th>
                    <th className="text-left py-2 px-3 text-slate-300 font-semibold">Rota</th>
                    <th className="text-left py-2 px-3 text-slate-300 font-semibold">Motorista</th>
                    <th className="text-right py-2 px-3 text-slate-300 font-semibold">Frete</th>
                    <th className="text-right py-2 px-3 text-slate-300 font-semibold">Custo</th>
                    <th className="text-right py-2 px-3 text-slate-300 font-semibold">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {cargas.map((carga) => {
                    const custoDiesel = Number(carga.valorCombustivel) || 0;
                    const custoChapa = (carga.chapa1 ? 180 : 0) + (carga.chapa2 ? 180 : 0);
                    const custoRetido = Number(carga.valorRetido) || 0;
                    const custoOutros = Number(carga.custoOutros) || 0;
                    const manutencao = Number(carga.manutencao) || 0;
                    const totalCusto = custoDiesel + custoChapa + custoRetido + custoOutros + manutencao;
                    const frete = Number(carga.valorFrete) || 0;
                    const lucro = frete - totalCusto;

                    return (
                      <tr key={carga.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="py-2 px-3 text-slate-300">{carga.data}</td>
                        <td className="py-2 px-3 text-slate-300">{carga.rota}</td>
                        <td className="py-2 px-3 text-slate-300">{carga.motorista}</td>
                        <td className="py-2 px-3 text-right text-green-400 font-semibold">{formatBRL(frete)}</td>
                        <td className="py-2 px-3 text-right text-red-400 font-semibold">{formatBRL(totalCusto)}</td>
                        <td className={`py-2 px-3 text-right font-semibold ${lucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatBRL(lucro)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Insights */}
          {analytics.lucroPercentual < 10 && (
            <Card className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-yellow-700/50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-300">⚠️ Atenção</p>
                  <p className="text-xs text-yellow-200 mt-1">
                    Margem de lucro abaixo de 10%. Considere revisar custos ou aumentar valores de frete.
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
