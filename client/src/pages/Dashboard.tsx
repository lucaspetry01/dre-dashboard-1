import { useState, useMemo } from 'react';
import dashboardData from '@/data/dashboard.json';
import detalhesData from '@/data/detalhes.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Upload, Calendar } from 'lucide-react';
import BarChartWithLabels from '@/components/BarChartWithLabels';
import CategoryIcon from '@/components/CategoryIcon';
import SaldoEvolutionChart from '@/components/SaldoEvolutionChart';
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
      // Usar data_full (formato YYYY-MM-DD) para comparação correta
      const dataObj = new Date(d.data_full + 'T00:00:00');
      const start = startDate ? new Date(startDate + 'T00:00:00') : new Date('1900-01-01');
      const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2100-12-31');
      
      return dataObj >= start && dataObj <= end;
    });
  }, [diario, startDate, endDate]);

  // Helper: parse data DD/MM/YYYY -> Date (declarado cedo para uso nos useMemo abaixo)
  const parseDataBr = (dataStr: string): Date | null => {
    if (!dataStr) return null;
    const parts = dataStr.split('/');
    if (parts.length !== 3) return null;
    const [dia, mes, ano] = parts;
    return new Date(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T00:00:00`);
  };

  // Filtrar detalhes (registros) por período
  const detalhesFiltrados = useMemo(() => {
    if (!startDate && !endDate) return detalhes;

    const start = startDate ? new Date(startDate + 'T00:00:00') : new Date('1900-01-01');
    const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2100-12-31');

    const filtered: Record<string, any> = {};
    Object.keys(detalhes).forEach(catName => {
      const cat = detalhes[catName];
      const registrosFiltrados = (cat?.registros || []).filter((r: any) => {
        const dataObj = parseDataBr(r.data);
        if (!dataObj) return false;
        return dataObj >= start && dataObj <= end;
      });

      if (registrosFiltrados.length > 0) {
        const total = registrosFiltrados.reduce((sum: number, r: any) => sum + (r.valor || 0), 0);
        filtered[catName] = {
          total,
          quantidade: registrosFiltrados.length,
          registros: registrosFiltrados,
        };
      }
    });
    return filtered;
  }, [detalhes, startDate, endDate]);

  // Calcular resumo filtrado a partir das transações individuais
  // (mesma fonte usada pelo detalhamento, garante consistência entre cards e categorias).
  // Quando não há filtro, lemos direto do `resumo` agregado pelo backend.
  const resumoFiltrado = useMemo(() => {
    if (!startDate && !endDate) {
      return {
        total_receitas: resumo.total_receitas,
        total_despesas: resumo.total_despesas,
        resultado: resumo.resultado,
        qtd_receitas: (resumo as { qtd_receitas?: number }).qtd_receitas ?? 0,
        qtd_despesas: (resumo as { qtd_despesas?: number }).qtd_despesas ?? 0,
      };
    }

    // Itera todos os registros filtrados (transações individuais por categoria)
    let receitas = 0;
    let despesas = 0;
    let qtdReceitas = 0;
    let qtdDespesas = 0;
    Object.values(detalhesFiltrados).forEach((cat: any) => {
      (cat?.registros || []).forEach((r: any) => {
        const v = Number(r.valor) || 0;
        if (v > 0) {
          receitas += v;
          qtdReceitas += 1;
        } else if (v < 0) {
          despesas += v;
          qtdDespesas += 1;
        }
      });
    });

    return {
      total_receitas: receitas,
      total_despesas: despesas,
      resultado: receitas + despesas,
      qtd_receitas: qtdReceitas,
      qtd_despesas: qtdDespesas,
    };
  }, [detalhesFiltrados, startDate, endDate, resumo]);

  // Calcular resumo do período ANTERIOR (mesmo intervalo de dias).
  // Também soma a partir das transações individuais para coerência com `resumoFiltrado`.
  const resumoAnterior = useMemo(() => {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const diffMs = end.getTime() - start.getTime();

    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diffMs);

    let receitas = 0;
    let despesas = 0;
    let qtd = 0;
    Object.values(detalhes).forEach((cat: any) => {
      (cat?.registros || []).forEach((r: any) => {
        const dataObj = parseDataBr(r.data);
        if (!dataObj) return;
        if (dataObj < prevStart || dataObj > prevEnd) return;
        const v = Number(r.valor) || 0;
        if (v > 0) receitas += v;
        else if (v < 0) despesas += v;
        qtd += 1;
      });
    });

    if (qtd === 0) return null;

    return {
      total_receitas: receitas,
      total_despesas: despesas,
      resultado: receitas + despesas,
      periodo_inicio: prevStart.toLocaleDateString('pt-BR'),
      periodo_fim: prevEnd.toLocaleDateString('pt-BR'),
    };
  }, [detalhes, startDate, endDate]);

  // Calcular variação percentual
  const calcularVariacao = (atual: number, anterior: number): { valor: number; positivo: boolean } | null => {
    if (anterior === 0 || !resumoAnterior) return null;
    const variacao = ((atual - anterior) / Math.abs(anterior)) * 100;
    return { valor: Math.abs(variacao), positivo: variacao >= 0 };
  };

  const variacaoReceitas = resumoAnterior ? calcularVariacao(resumoFiltrado.total_receitas, resumoAnterior.total_receitas) : null;
  const variacaoDespesas = resumoAnterior ? calcularVariacao(resumoFiltrado.total_despesas, resumoAnterior.total_despesas) : null;
  const variacaoResultado = resumoAnterior ? calcularVariacao(resumoFiltrado.resultado, resumoAnterior.resultado) : null;

  // Contagens reais vindas do resumo filtrado (já calcula via transações individuais).
  const qtdEntradas = resumoFiltrado.qtd_receitas;
  const qtdSaidas = resumoFiltrado.qtd_despesas;

  // Categorias filtradas (recalculadas com base nos detalhes filtrados)
  const categoriasFiltradas = useMemo(() => {
    if (!startDate && !endDate) return categorias;

    const totalDespesas = Object.values(detalhesFiltrados).reduce((sum: number, c: any) => {
      return c.total < 0 ? sum + Math.abs(c.total) : sum;
    }, 0);

    return Object.entries(detalhesFiltrados)
      .map(([nome, dados]: [string, any]) => ({
        nome,
        valor: dados.total,
        valor_abs: Math.abs(dados.total),
        quantidade: dados.quantidade,
        percentual: totalDespesas > 0 && dados.total < 0 ? (Math.abs(dados.total) / totalDespesas) * 100 : 0,
      }))
      .sort((a, b) => b.valor_abs - a.valor_abs);
  }, [categorias, detalhesFiltrados, startDate, endDate]);

  // Preparar dados para gráficos: o gráfico "Despesas por Categoria" mostra
  // apenas categorias com valor negativo (despesas). Receitas operacionais
  // permanecem no detalhamento abaixo (com ícone de cifrão verde).
  const categoriasChart = useMemo(() =>
    categoriasFiltradas
      .filter(cat => cat.valor < 0)
      .map(cat => ({
        ...cat,
        valor_display: cat.valor_abs,
      })),
    [categoriasFiltradas]
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

  // Lidar com upload de arquivo OFX (Sicredi e outros bancos)
  const handleOfxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string)?.split(',')[1];
          if (!base64Data) {
            toast.error('Erro ao ler arquivo OFX.');
            setIsUploading(false);
            return;
          }

          const response = await fetch('/api/trpc/ofx.processOFX', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              json: {
                fileBase64: base64Data,
                nomeArquivo: file.name,
              },
            }),
          });

          if (response.ok) {
            const result = await response.json();
            const data = result.result?.data?.json || result.result;
            const novos = data.totalNovos ?? 0;
            const dups = data.totalDuplicatas ?? 0;

            if (data.success) {
              toast.success(
                `OFX importado: ${novos} novas transações, ${dups} duplicatas ignoradas.`
              );
              // Atualizar dados do banco sem reload
              await utils.ofx.resumoCompleto.invalidate();
              await utils.ofx.temDados.invalidate();
            } else {
              toast.warning(data.mensagem || 'Nenhuma transação encontrada.');
            }
          } else {
            toast.error('Erro ao processar OFX. Verifique se é um arquivo válido.');
          }
        } catch (error) {
          toast.error('Erro ao processar OFX.');
          console.error(error);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Erro ao ler arquivo OFX.');
      console.error(error);
      setIsUploading(false);
    }
  };

  // Lidar com upload de arquivo XLS (formato antigo)
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
    setIsFiltering(true);
    setExpandedCategory(null);
    setTimeout(() => {
      setStartDate('');
      setEndDate('');
      setActiveQuickFilter(null);
      setTimeout(() => setIsFiltering(false), 200);
    }, 100);
  };

  const isLucro = resumoFiltrado.resultado >= 0;

  // Agrupar registros por descricao completa
  // Extrair nome proprio da descricao (ultima parte apos numeros/CPF)
  const extractNomeProprio = (descricao: string): string => {
    const parts = descricao.trim().split(/\s+/);
    
    // Procura por padrao de CPF (11 digitos) ou CNPJ (14 digitos)
    let cpfCnpjIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].replace(/[^0-9]/g, '');
      if (part.length === 11 || part.length === 14) {
        cpfCnpjIndex = i;
        break;
      }
    }
    
    // Se encontrou CPF/CNPJ, retorna tudo apos ele
    if (cpfCnpjIndex !== -1 && cpfCnpjIndex < parts.length - 1) {
      return parts.slice(cpfCnpjIndex + 1).join(' ');
    }
    
    // Se nao encontrou, retorna a descricao completa
    return descricao;
  };

  const groupRegistrosByDescription = (registros: any[]) => {
    if (!groupByDescription) return registros;
    
    const grouped = registros.reduce((acc: Record<string, any>, item: any) => {
      // Tenta agrupar por nome proprio primeiro
      let key = extractNomeProprio(item.descricao);
      
      // Se o nome proprio eh muito curto ou vazio, usa a descricao completa
      if (!key || key.trim().length < 3) {
        key = item.descricao;
      }
      
      if (!acc[key]) {
        acc[key] = {
          ...item,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
          {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Dashboard Financeiro</h1>
            {usandoBanco && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                Banco de dados ({resumoBanco!.totalRegistros} registros)
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-600">Transportes Moraes e Petry LTDA ME</p>
          <p className="text-xs sm:text-sm text-slate-500">
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

        {/* Controles de Filtro e Upload */}
        <Card className="mb-2 bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Filtros e Importação
              </div>
              <label>
                <Button
                  disabled={isUploading}
                  size="sm"
                  className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-sm"
                  asChild
                >
                  <span>
                    <Upload className="w-3 h-3" />
                    OFX
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtros Rápidos em Tags */}
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Filtros Rápidos</label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {/* Botão "Hoje" dobrado de tamanho e negrito */}
                <button
                  onClick={() => applyQuickFilter('today')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-bold transition-all whitespace-nowrap ${
                    activeQuickFilter === 'today'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Hoje
                </button>
                {/* Botão "Ontem" novo com toggle e estilo azul quando ativo */}
                <button
                  onClick={() => {
                    // Se já está selecionado, limpar ao clicar novamente (toggle)
                    if (activeQuickFilter === 'yesterday') {
                      resetFilters();
                      return;
                    }

                    setIsFiltering(true);
                    setExpandedCategory(null);
                    setTimeout(() => {
                      const referenceDate = new Date(REFERENCE_DATE);
                      const yesterdayDate = new Date(referenceDate);
                      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                      
                      setStartDate(yesterdayDate.toISOString().split('T')[0]);
                      setEndDate(yesterdayDate.toISOString().split('T')[0]);
                      setActiveQuickFilter('yesterday');
                      setTimeout(() => setIsFiltering(false), 200);
                    }, 100);
                  }}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-bold transition-all whitespace-nowrap ${
                    activeQuickFilter === 'yesterday'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Ontem
                </button>
                {/* Outros filtros rápidos */}
                {quickFilters.filter(f => f.id !== 'today').map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => applyQuickFilter(filter.id)}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
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
                    className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all whitespace-nowrap"
                  >
                    ✗ Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Datas Customizadas lado a lado em mobile */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-4 border-t border-slate-200">
              <div className="flex-1 min-w-0 sm:max-w-[180px]">
                <label className="block text-xs font-medium text-slate-700 mb-1">Data Inicial</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActiveQuickFilter(null);
                  }}
                  className="w-full text-sm h-10 px-2 overflow-hidden"
                />
              </div>
              <div className="flex-1 min-w-0 sm:max-w-[180px]">
                <label className="block text-xs font-medium text-slate-700 mb-1">Data Final</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActiveQuickFilter(null);
                  }}
                  className="w-full text-sm h-10 px-2 overflow-hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI HERO: 4 Cards em Grid 2x2 */}
        <div className={`grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-3 transition-opacity duration-300 ${isFiltering ? 'opacity-50' : 'opacity-100'}`}>
          {/* Card Lucro Líquido */}
          <Card className={`relative overflow-hidden border-2 shadow-xl transition-all duration-500 ${
            isLucro
              ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 border-emerald-400'
              : 'bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 border-rose-400'
          }`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white" />
              <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-white" />
            </div>
            <CardContent className="relative p-2 sm:p-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className={`p-0.5 rounded-lg ${isLucro ? 'bg-emerald-400/30' : 'bg-rose-400/30'}`}>
                    {isLucro ? <TrendingUp className="w-2.5 h-2.5 text-white" /> : <TrendingDown className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <p className="text-white/90 text-xs font-medium uppercase tracking-wider">
                    {isLucro ? 'Lucro' : 'Prejuízo'}
                  </p>
                </div>
                <div className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
                  {formatMoney(resumoFiltrado.resultado)}
                </div>
                {variacaoResultado && (
                  <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold w-fit">
                    {variacaoResultado.positivo ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    <span>{variacaoResultado.positivo ? '+' : '-'}{variacaoResultado.valor.toFixed(1)}%</span>
                  </div>
                )}
                <p className="text-white/70 text-xs">{isLucro ? 'POSITIVO' : 'NEGATIVO'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card Saldo da Conta */}
          <Card className="relative overflow-hidden border-2 shadow-lg bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 border-blue-400">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white" />
              <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-white" />
            </div>
            <CardContent className="relative p-2 sm:p-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="p-0.5 rounded-lg bg-blue-400/30">
                    <TrendingUp className="w-2.5 h-2.5 text-white" />
                  </div>
                  <p className="text-white/90 text-xs font-medium uppercase tracking-wider">Saldo</p>
                </div>
                <div className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
                  {formatMoney(saldoFinal ?? 0)}
                </div>
                <p className="text-white/70 text-xs">Último OFX</p>
              </div>
            </CardContent>
          </Card>

          {/* Card Receitas */}
          <Card className="bg-white border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-emerald-50 rounded-lg">
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
                  </div>
                  <p className="text-xs font-medium text-slate-600">Receitas</p>
                </div>
                {variacaoReceitas && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold px-1 py-0.5 rounded-full ${
                    variacaoReceitas.positivo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {variacaoReceitas.positivo ? '↑' : '↓'} {variacaoReceitas.valor.toFixed(1)}%
                  </div>
                )}
              </div>
              <div className="text-base sm:text-lg font-bold text-emerald-700 mb-0.5">
                {formatMoney(resumoFiltrado.total_receitas)}
              </div>
              <p className="text-xs text-slate-500">
                {qtdEntradas} entradas
              </p>
            </CardContent>
          </Card>

          {/* Card Despesas */}
          <Card className="bg-white border-l-4 border-l-rose-500 hover:shadow-md transition-shadow">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-rose-50 rounded-lg">
                    <TrendingDown className="w-2.5 h-2.5 text-rose-600" />
                  </div>
                  <p className="text-xs font-medium text-slate-600">Despesas</p>
                </div>
                {variacaoDespesas && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold px-1 py-0.5 rounded-full ${
                    variacaoDespesas.positivo ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {variacaoDespesas.positivo ? '↑' : '↓'} {variacaoDespesas.valor.toFixed(1)}%
                  </div>
                )}
              </div>
              <div className="text-base sm:text-lg font-bold text-rose-700 mb-0.5">
                {formatMoney(resumoFiltrado.total_despesas)}
              </div>
              <p className="text-xs text-slate-500">
                {qtdSaidas} saídas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Evolução de Saldo com Comparativo */}
        <Card className="bg-white border-slate-200 mb-2">
          <CardHeader>
            <CardTitle>Evolução de Saldo - Período vs Anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 300 }}>
              <SaldoEvolutionChart data={filteredDiario.slice(-10).map((d: any, idx: number) => ({ periodo: d.data_full, saldo: d.saldo || 0, saldoAnterior: idx > 0 ? filteredDiario[idx - 1].saldo || 0 : null, }))} formatMoney={formatMoney} />
            </div>
          </CardContent>
        </Card>

        {/* Secção Categorias (única visível após remoção das abas Fluxo Diário e Composição) */}
        <div className="w-full">
          <div>
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
            <Card className="mt-2 bg-white border-slate-200">
              <CardHeader>
                <CardTitle>Detalhamento de Categorias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoriasFiltradas.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <p>Nenhuma categoria encontrada no período selecionado.</p>
                    </div>
                  )}
                  {categoriasFiltradas.map((cat) => (
                    <div key={cat.nome} className="border border-slate-200 rounded-lg">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === cat.nome ? null : cat.nome)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <CategoryIcon categoryName={cat.nome} size="md" />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{cat.nome}</p>
                            <p className="text-sm text-slate-600">{cat.quantidade} transações</p>
                          </div>
                        </div>
                        <div className="text-right mr-4">
                          <p className="font-bold text-slate-900">{formatMoney(cat.valor)}</p>
                          <p className="text-sm text-slate-600">{(cat.percentual ?? 0).toFixed(1)}%</p>
                        </div>
                        {expandedCategory === cat.nome ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>

                      {expandedCategory === cat.nome && (
                        <div className="bg-slate-50 p-4 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={groupByDescription}
                                onChange={(e) => setGroupByDescription(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300"
                              />
                              <span className="text-sm text-slate-700">Agrupar por descricao</span>
                            </label>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {groupRegistrosByDescription(detalhesFiltrados[cat.nome]?.registros || detalhes[cat.nome]?.registros || []).map((item: any, idx: number) => (
                              <div key={idx} className="bg-white p-3 rounded border border-slate-100 text-sm">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{item.data}</p>
                                    <p className="text-slate-600 break-words">{item.descricao}</p>
                                    {item.documento && <p className="text-xs text-slate-500">Doc: {item.documento}</p>}
                                    {groupByDescription && item.count >= 1 && (
                                      <p className="text-xs text-emerald-600 mt-1">Agrupados: {item.count} registros</p>
                                    )}
                                  </div>
                                  <div className="text-right whitespace-nowrap">
                                    <p className="font-bold text-slate-900">{formatMoney(item.valor)}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
