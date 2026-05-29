import { useState, useMemo } from 'react';
import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp, Upload, Calendar } from 'lucide-react';
import BarChartWithLabels from '@/components/BarChartWithLabels';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4', '#84CC16'
];

export default function Dashboard() {
  const { resumo, categorias, diario, timeline_categorias } = dashboardData;
  const detalhes = detalhesData as Record<string, any>;
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

  // Opções de filtros rápidos baseadas no último dia do extrato (27/05/2026)
  const quickFilters = [
    { id: 'today', label: 'Hoje', days: 1 },
    { id: 'week', label: 'Última Semana', days: 7 },
    { id: '15days', label: 'Últimos 15 dias', days: 15 },
    { id: 'month', label: 'Último Mês', days: 30 },
    { id: 'quarter', label: 'Último Trimestre', days: 90 },
    { id: 'semester', label: 'Último Semestre', days: 180 },
    { id: 'year', label: 'Último Ano', days: 365 },
    { id: 'all', label: 'Todo o Período', days: 0 },
  ];

  // Aplicar filtro rápido baseado no último dia disponível
  const applyQuickFilter = (filterId: string) => {
    if (filterId === 'all') {
      setStartDate('');
      setEndDate('');
      setActiveQuickFilter('all');
      return;
    }

    const filter = quickFilters.find(f => f.id === filterId);
    if (!filter) return;

    // Usar a data final do extrato como referência (mais recente)
    const referenceDate = new Date('2026-05-27');
    const endDateObj = referenceDate;
    const startDateObj = new Date(referenceDate);
    startDateObj.setDate(startDateObj.getDate() - filter.days + 1);

    setStartDate(startDateObj.toISOString().split('T')[0]);
    setEndDate(endDateObj.toISOString().split('T')[0]);
    setActiveQuickFilter(filterId);
  };

  // Formatar moeda
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Filtrar dados por data
  const filteredDiario = useMemo(() => {
    if (!startDate && !endDate) return diario;
    
    return diario.filter(d => {
      const dataObj = new Date(d.data.split('/').reverse().join('-'));
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-12-31');
      
      return dataObj >= start && dataObj <= end;
    });
  }, [diario, startDate, endDate]);

  // Calcular resumo filtrado
  const resumoFiltrado = useMemo(() => {
    // Se não há filtro de data, usar o resumo total do JSON
    if (!startDate && !endDate) {
      return {
        total_receitas: resumo.total_receitas,
        total_despesas: resumo.total_despesas,
        resultado: resumo.resultado
      };
    }
    
    // Se há filtro, calcular a partir dos dados diários filtrados
    const receitas = filteredDiario.filter(d => d.valor > 0).reduce((sum, d) => sum + d.valor, 0);
    const despesas = filteredDiario.filter(d => d.valor < 0).reduce((sum, d) => sum + d.valor, 0);
    
    return {
      total_receitas: receitas,
      total_despesas: despesas,
      resultado: receitas + despesas
    };
  }, [filteredDiario, startDate, endDate, resumo]);

  // Preparar dados para gráficos
  const categoriasChart = useMemo(() => 
    categorias.map(cat => ({
      ...cat,
      valor_display: cat.valor_abs
    })),
    [categorias]
  );

  const diarioChart = useMemo(() =>
    filteredDiario.map(d => ({
      ...d,
      data_short: d.data,
      receita: d.valor > 0 ? d.valor : 0,
      despesa: d.valor < 0 ? Math.abs(d.valor) : 0
    })),
    [filteredDiario]
  );

  // Lidar com upload de arquivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string)?.split(',')[1];
          if (!base64Data) {
            toast.error('Erro ao ler arquivo.');
            setIsUploading(false);
            return;
          }

          // Enviar para servidor via tRPC
          const response = await fetch('/api/trpc/upload.processXLS', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              json: {
                fileBase64: base64Data,
                existingTransactions: diario.map(d => ({
                  data: d.data,
                  descricao: d.data_full || d.data,
                  documento: '',
                  valor: d.valor,
                  saldo: d.saldo,
                  tipo: d.valor < 0 ? 'saida' : 'entrada',
                }))
              }
            })
          });

          if (response.ok) {
            const result = await response.json();
            const processResult = result.result;
            
            toast.success(
              `Importação concluída! ${processResult.totalNew} novos registros, ${processResult.totalDuplicates} duplicados ignorados.`
            );
            
            // Recarregar a página para atualizar os dados
            setTimeout(() => window.location.reload(), 2000);
          } else {
            toast.error('Erro ao processar arquivo. Verifique o formato.');
          }
        } catch (error) {
          toast.error('Erro ao processar arquivo.');
          console.error(error);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Erro ao ler arquivo.');
      console.error(error);
      setIsUploading(false);
    }
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setActiveQuickFilter(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard Financeiro</h1>
          <p className="text-slate-600">Transportes Moraes e Petry LTDA ME • {resumo.periodo_inicio} a {resumo.periodo_fim}</p>
        </div>

        {/* Controles de Filtro e Upload */}
        <Card className="mb-6 bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Filtros e Importação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtros Rápidos em Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Filtros Rápidos</label>
              <div className="flex flex-wrap gap-2">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => applyQuickFilter(filter.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeQuickFilter === filter.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
                {(startDate || endDate) && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                  >
                    ✕ Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Datas Customizadas + Upload */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data Inicial (Customizado)</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActiveQuickFilter(null);
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data Final (Customizado)</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActiveQuickFilter(null);
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <label className="w-full">
                  <Button
                    disabled={isUploading}
                    className="w-full gap-2"
                    asChild
                  >
                    <span>
                      <Upload className="w-4 h-4" />
                      {isUploading ? 'Importando...' : 'Importar XLS'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total de Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 mb-1">
                {formatMoney(resumoFiltrado.total_receitas)}
              </div>
              <p className="text-sm text-green-600">
                {!startDate && !endDate ? (resumo.total_receitas > 0 ? '42 transações' : '0 transações') : `${filteredDiario.filter(d => d.valor > 0).length} transações`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-900 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Total de Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700 mb-1">
                {formatMoney(resumoFiltrado.total_despesas)}
              </div>
              <p className="text-sm text-red-600">
                {!startDate && !endDate ? (resumo.total_despesas < 0 ? '349 transações' : '0 transações') : `${filteredDiario.filter(d => d.valor < 0).length} transações`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Resultado Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold mb-1 ${resumoFiltrado.resultado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatMoney(resumoFiltrado.resultado)}
              </div>
              <p className="text-sm text-blue-600">
                Período: {startDate || resumo.periodo_inicio} a {endDate || resumo.periodo_fim}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="categorias" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
            <TabsTrigger value="diario">Fluxo Diário</TabsTrigger>
            <TabsTrigger value="pizza">Composição</TabsTrigger>
          </TabsList>

          {/* Tab: Categorias */}
          <TabsContent value="categorias">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 400 }}>
                  <BarChartWithLabels data={categoriasChart} formatMoney={formatMoney} />
                </div>
              </CardContent>
            </Card>

            {/* Detalhamento de Categorias */}
            <Card className="mt-6 bg-white border-slate-200">
              <CardHeader>
                <CardTitle>Detalhamento de Categorias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categorias.map((cat) => (
                    <div key={cat.nome} className="border border-slate-200 rounded-lg">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === cat.nome ? null : cat.nome)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 text-left">
                          <p className="font-medium text-slate-900">{cat.nome}</p>
                          <p className="text-sm text-slate-600">{cat.quantidade} transações</p>
                        </div>
                        <div className="text-right mr-4">
                          <p className="font-bold text-slate-900">{formatMoney(cat.valor)}</p>
                          <p className="text-sm text-slate-600">{cat.percentual}%</p>
                        </div>
                        {expandedCategory === cat.nome ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>

                      {expandedCategory === cat.nome && (
                        <div className="bg-slate-50 p-4 border-t border-slate-200">
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {detalhes[cat.nome]?.map((item: any, idx: number) => (
                              <div key={idx} className="bg-white p-3 rounded border border-slate-100 text-sm">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{item.data}</p>
                                    <p className="text-slate-600 break-words">{item.descricao}</p>
                                    {item.documento && <p className="text-xs text-slate-500">Doc: {item.documento}</p>}
                                  </div>
                                  <div className="text-right whitespace-nowrap">
                                    <p className="font-bold text-slate-900">{formatMoney(item.valor)}</p>
                                    <p className="text-xs text-slate-500">Saldo: {formatMoney(item.saldo)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Fluxo Diário */}
          <TabsContent value="diario">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle>Evolução Diária de Entradas e Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={diarioChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data_short" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatMoney(value as number)} />
                      <Legend />
                      <Line type="monotone" dataKey="receita" stroke="#10B981" name="Receitas" />
                      <Line type="monotone" dataKey="despesa" stroke="#EF4444" name="Despesas" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Composição */}
          <TabsContent value="pizza">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle>Composição de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoriasChart}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ categoria, percentual }) => `${categoria} (${percentual}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="valor_abs"
                      >
                        {categoriasChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatMoney(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
