import { useMemo, useState } from 'react';
import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import BarChartWithLabels from '@/components/BarChartWithLabels';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4', '#84CC16'
];

export default function Dashboard() {
  const { resumo, categorias, diario, timeline_categorias } = dashboardData;
  const detalhes = detalhesData as Record<string, any>;
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Formatar moeda
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Preparar dados para gráficos
  const categoriasChart = useMemo(() => 
    categorias.map(cat => ({
      ...cat,
      valor_display: cat.valor_abs
    })),
    [categorias]
  );

  const diarioChart = useMemo(() =>
    diario.map(d => ({
      ...d,
      data_short: d.data,
      receita: d.valor > 0 ? d.valor : 0,
      despesa: d.valor < 0 ? Math.abs(d.valor) : 0
    })),
    [diario]
  );



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Dashboard Financeiro
          </h1>
          <p className="text-slate-600">
            Transportes Moraes e Petry LTDA ME • {resumo.periodo_inicio} a {resumo.periodo_fim}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Receitas */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total de Receitas
                </CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatMoney(resumo.total_receitas)}
              </div>
              <p className="text-xs text-slate-500 mt-2">42 transações</p>
            </CardContent>
          </Card>

          {/* Despesas */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total de Despesas
                </CardTitle>
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {formatMoney(resumo.total_despesas)}
              </div>
              <p className="text-xs text-slate-500 mt-2">349 transações</p>
            </CardContent>
          </Card>

          {/* Resultado */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Resultado Líquido
                </CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatMoney(resumo.resultado)}
              </div>
              <p className="text-xs text-slate-500 mt-2">Período: 27/04 a 27/05</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <Tabs defaultValue="categorias" className="space-y-4">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
            <TabsTrigger value="diario">Fluxo Diário</TabsTrigger>
            <TabsTrigger value="pizza">Composição</TabsTrigger>
          </TabsList>

          {/* Gráfico de Categorias COM LABELS */}
          <TabsContent value="categorias">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartWithLabels data={categoriasChart} formatMoney={formatMoney} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gráfico Diário */}
          <TabsContent value="diario">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Saldo ao Longo do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={diarioChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="data_short" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => formatMoney(Number(value))}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="saldo" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Saldo"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gráfico Pizza */}
          <TabsContent value="pizza">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Composição de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={categoriasChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ nome, percentual }) => `${nome}: ${percentual.toFixed(1)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="valor_display"
                    >
                      {categoriasChart.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatMoney(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tabela Expansível de Categorias */}
        <Card className="border-0 shadow-lg mt-8">
          <CardHeader>
            <CardTitle>Detalhamento de Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoriasChart.map((cat, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Cabeçalho da Categoria */}
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.nome ? null : cat.nome)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <div className="text-left">
                        <h3 className="font-semibold text-slate-900">{cat.nome}</h3>
                        <p className="text-sm text-slate-500">{cat.quantidade} transações</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatMoney(cat.valor)}</p>
                        <p className="text-sm text-slate-500">{cat.percentual.toFixed(2)}%</p>
                      </div>
                      {expandedCategory === cat.nome ? (
                        <ChevronUp className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                  </button>

                  {/* Registros Detalhados */}
                  {expandedCategory === cat.nome && (
                    <div className="bg-white border-t border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="text-left py-2 px-4 font-semibold text-slate-700">Data</th>
                              <th className="text-left py-2 px-4 font-semibold text-slate-700">Descrição</th>
                              <th className="text-left py-2 px-4 font-semibold text-slate-700">Documento</th>
                              <th className="text-right py-2 px-4 font-semibold text-slate-700">Valor</th>
                              <th className="text-right py-2 px-4 font-semibold text-slate-700">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalhes[cat.nome]?.registros.map((reg: any, ridx: number) => (
                              <tr key={ridx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-2 px-4 text-slate-900 font-medium">{reg.data}</td>
                                <td className="py-2 px-4 text-slate-700 break-words" style={{ maxWidth: '400px' }}>{reg.descricao}</td>
                                <td className="py-2 px-4 text-slate-600 text-xs">{reg.documento}</td>
                                <td className="py-2 px-4 text-right font-semibold text-slate-900">
                                  {formatMoney(reg.valor)}
                                </td>
                                <td className="py-2 px-4 text-right text-slate-600">
                                  {formatMoney(reg.saldo)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
