import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ArrowLeft, Truck, Pencil, Eye, Trash2 } from 'lucide-react';

type Pasta = 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU';

const PASTAS: Pasta[] = ['IES', 'IJD', 'DAJ', 'MFF', 'IGU'];

// Imagens das placas
const PLACA_IMAGES: Record<Pasta, string> = {
  IES: '/manus-storage/pasted_file_ofnWe9_image_aeac23d2.png',
  MFF: '/manus-storage/placa_mff_no_bg_eb502184.png',
  IJD: '/manus-storage/placa_ijd_no_bg_0c6c2266.png',
  DAJ: '/manus-storage/pasted_file_vIHW2R_image_62640b07.png',
  IGU: '/manus-storage/pasted_file_1mKDij_image_89cc173d.png',
};

export default function Cargas() {
  const [, setLocation] = useLocation();
  const [selectedPasta, setSelectedPasta] = useState<Pasta | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'semana' | 'mes' | 'mesAnterior' | 'semestre' | null>(null);
  const [filterRota, setFilterRota] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    data: '',
    rota: '',
    rotaCustom: '',
    motorista: '',
    valorLitroDiesel: '',
    litrosCombustivel: '',
    chapa1: '',
    chapa2: '',
    custoOutros: '',
    manutencao: '',
    numeroProtocolo: '',
    valorFrete: '',
  });

  // Opções pré-definidas
  const ROTAS = ['GRAMADO', 'CAXIAS', 'FAZENDA', 'CD', 'POA', 'OUTROS'];
  const MOTORISTAS = ['FRED', 'CESAR', 'DOUGLAS', 'ALEX'];
  const CHAPAS = ['DOUGLAS', 'DJOE', 'LUCAS', 'PABLO', 'ALEX'];

  // Função de formatação de moeda brasileira
  const formatBRL = (value: number): string => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Funções de filtro por período
  const getDateRange = (period: 'semana' | 'mes' | 'mesAnterior' | 'semestre' | null) => {
    if (!period) return { start: null, end: null };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    
    if (period === 'semana') {
      start.setDate(today.getDate() - today.getDay());
    } else if (period === 'mes') {
      start.setDate(1);
    } else if (period === 'mesAnterior') {
      const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      prevMonthEnd.setHours(23, 59, 59, 999);
      return { start: prevMonthStart, end: prevMonthEnd };
    } else if (period === 'semestre') {
      start.setMonth(today.getMonth() < 6 ? 0 : 6);
      start.setDate(1);
    }
    
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const filterCargasByPeriod = (cargasData: any[] | undefined) => {
    if (!cargasData) return [];
    if (!filterPeriod) return cargasData;
    
    const { start, end } = getDateRange(filterPeriod);
    if (!start || !end) return cargasData;
    
    return cargasData.filter(carga => {
      const cargaDate = new Date(carga.data);
      return cargaDate >= start && cargaDate <= end;
    });
  };

  const filterCargasByRota = (cargasData: any[]) => {
    if (!filterRota) return cargasData;
    return cargasData.filter(carga => carga.rota === filterRota);
  };

  // Cálculo automático do valor do combustível
  const valorCombustivelCalculado =
    (parseFloat(formData.valorLitroDiesel) || 0) *
    (parseFloat(formData.litrosCombustivel) || 0);

  // Cálculo dinâmico de custos fixos
  const custoMotorista = 220; // Sempre R$ 220
  const custoChapa1 = formData.chapa1 && formData.chapa1.trim() !== '' ? 150 : 0; // R$ 150 se selecionada
  const custoChapa2 = formData.chapa2 && formData.chapa2.trim() !== '' ? 150 : 0; // R$ 150 se selecionada
  const custoFixo = custoMotorista + custoChapa1 + custoChapa2;
  const custoTotalCalculado = valorCombustivelCalculado + Number(formData.manutencao || 0) + Number(formData.custoOutros || 0) + custoFixo;
  
  // Cálculo de retenção e frete líquido
  const valorFrete = Number(formData.valorFrete || 0);
  const valorRetido = valorFrete * 0.1; // 10% de retenção
  const valorLiquidoFrete = valorFrete - valorRetido;
  const lucroCalculado = valorLiquidoFrete - custoTotalCalculado;
  const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set());
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: cargasPorPasta, isLoading: isLoadingPorPasta } = trpc.cargas.listarPorPasta.useQuery(
    selectedPasta || 'IES',
    { enabled: !!selectedPasta }
  );
  
  const { data: cargasTodas, isLoading: isLoadingTodas } = trpc.cargas.listarTodas.useQuery(
    undefined,
    { enabled: !selectedPasta }
  );
  
  // Usar cargas por pasta se selecionada, senão usar todas as cargas
  const cargas = selectedPasta ? cargasPorPasta : cargasTodas;
  const isLoading = selectedPasta ? isLoadingPorPasta : isLoadingTodas;

  const filteredCargas = filterCargasByRota(filterCargasByPeriod(cargas));

  // Totalizadores
  const totalFaturado = filteredCargas?.reduce((acc: number, c: any) => acc + Number(c.valorFrete || 0), 0) || 0;
  const totalCusto = filteredCargas?.reduce((acc: number, c: any) => acc + Number(c.custoTotal || 0), 0) || 0;
  const totalLucro = filteredCargas?.reduce((acc: number, c: any) => acc + Number(c.lucro || 0), 0) || 0;
  const qtdCargas = filteredCargas?.length || 0;

  // Mutations
  const createMutation = trpc.cargas.criar.useMutation({
    onSuccess: () => {
      if (selectedPasta) utils.cargas.listarPorPasta.invalidate(selectedPasta);
      handleCloseDialog();
      console.log('Carga registrada com sucesso!');
      setTimeout(() => window.location.reload(), 500);
    },
    onError: (error: any) => {
      console.error('Erro ao registrar carga:', error.message);
    },
  });

  const deleteMutation = trpc.cargas.deletar.useMutation({
    onSuccess: () => {
      if (selectedPasta) utils.cargas.listarPorPasta.invalidate(selectedPasta);
      setSelectedForDelete(new Set());
      console.log('Carga deletada com sucesso!');
      setTimeout(() => window.location.reload(), 500);
    },
    onError: (error: any) => {
      console.error('Erro ao deletar carga:', error.message);
    },
  });

  const updateMutation = trpc.cargas.atualizar.useMutation({
    onSuccess: () => {
      if (selectedPasta) utils.cargas.listarPorPasta.invalidate(selectedPasta);
      handleCloseDialog();
      console.log('Carga atualizada com sucesso!');
      setTimeout(() => window.location.reload(), 500);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar carga:', error.message);
    },
  });

  const handleEditCarga = (carga: any) => {
    const rotasPadrao = ['GRAMADO', 'CAXIAS', 'FAZENDA', 'CD'];
    const rotaEhPadrao = rotasPadrao.includes(carga.rota);
    const valorComb = Number(carga.valorCombustivel) || 0;
    const litros = Number(carga.litrosCombustivel) || 0;
    const valorLitro = litros > 0 ? formatBRL(valorComb / litros) : '';

    setEditingId(carga.id);
    // Converter data para string se for Date object
    const dataStr = typeof carga.data === 'string' ? carga.data : (carga.data instanceof Date ? carga.data.toISOString().split('T')[0] : '');
    setFormData({
      data: dataStr,
      rota: rotaEhPadrao ? carga.rota : 'OUTROS',
      rotaCustom: rotaEhPadrao ? '' : (carga.rota || ''),
      motorista: carga.motorista || '',
      valorLitroDiesel: valorLitro,
      litrosCombustivel: litros.toString(),
      chapa1: carga.chapa1 || '',
      chapa2: carga.chapa2 || '',
      custoOutros: (Number(carga.custoOutros) || 0).toString(),
      manutencao: (Number(carga.manutencao) || 0).toString(),
      numeroProtocolo: carga.numeroProtocolo || '',
      valorFrete: (Number(carga.valorFrete) || 0).toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rotaFinal = formData.rota === 'OUTROS' ? formData.rotaCustom : formData.rota;

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        rota: rotaFinal,
        motorista: formData.motorista,
        valorCombustivel: valorCombustivelCalculado,
        litrosCombustivel: parseFloat(formData.litrosCombustivel) || 0,
        chapa1: formData.chapa1,
        chapa2: formData.chapa2,
        custoOutros: parseFloat(formData.custoOutros) || 0,
        manutencao: parseFloat(formData.manutencao) || 0,
        numeroProtocolo: formData.numeroProtocolo,
        valorFrete: parseFloat(formData.valorFrete) || 0,
      });
    } else if (selectedPasta) {
      createMutation.mutate({
        pasta: selectedPasta,
        data: formData.data,
        rota: rotaFinal,
        motorista: formData.motorista,
        valorCombustivel: valorCombustivelCalculado,
        litrosCombustivel: parseFloat(formData.litrosCombustivel) || 0,
        chapa1: formData.chapa1,
        chapa2: formData.chapa2,
        custoOutros: parseFloat(formData.custoOutros) || 0,
        manutencao: parseFloat(formData.manutencao) || 0,
        numeroProtocolo: formData.numeroProtocolo,
        valorFrete: parseFloat(formData.valorFrete) || 0,
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      data: '',
      rota: '',
      rotaCustom: '',
      motorista: '',
      valorLitroDiesel: '',
      litrosCombustivel: '',
      chapa1: '',
      chapa2: '',
      custoOutros: '',
      manutencao: '',
      numeroProtocolo: '',
      valorFrete: '',
    });
  };

  const handleToggleCheckbox = (id: number) => {
    const newSet = new Set(selectedForDelete);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedForDelete(newSet);
  };

  const handleDeleteSelected = () => {
    selectedForDelete.forEach(id => {
      deleteMutation.mutate(id);
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            className="text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">Cargas</h1>
          </div>
        </div>
      </div>

      {/* Filtros - Sem títulos, uma linha cada */}
      <div className="mb-6 space-y-2">
        {/* Filtros por Período */}
        <div className="flex gap-1 flex-wrap items-center">
          {(['semana', 'mes', 'mesAnterior', 'semestre'] as const).map((period) => (
            <Button
              key={period}
              onClick={() => setFilterPeriod(filterPeriod === period ? null : period)}
              variant={filterPeriod === period ? 'default' : 'outline'}
              size="sm"
              className={`text-xs py-1 px-2 h-auto ${
                filterPeriod === period
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {period === 'semana' ? 'Semana' : period === 'mes' ? 'Mês Atual' : period === 'mesAnterior' ? 'Mês Anterior' : 'Semestre'}
            </Button>
          ))}
          {filterPeriod && (
            <Button
              onClick={() => setFilterPeriod(null)}
              variant="ghost"
              size="sm"
              className="text-xs py-1 px-2 h-auto text-slate-400 hover:text-slate-200"
            >
              ✕
            </Button>
          )}
          {filterPeriod && (
            <span className="text-xs text-slate-400 ml-2">
              {filterPeriod === 'semana' && `Semana de ${new Date().toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' })}`}
              {filterPeriod === 'mes' && `${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
              {filterPeriod === 'mesAnterior' && (() => {
                const prevMonth = new Date();
                prevMonth.setMonth(prevMonth.getMonth() - 1);
                return prevMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              })()}
              {filterPeriod === 'semestre' && `${new Date().getMonth() < 6 ? '1º' : '2º'} semestre de ${new Date().getFullYear()}`}
            </span>
          )}
        </div>

        {/* Filtros por Rota */}
        <div className="flex gap-0.5 flex-nowrap overflow-x-auto">
          {ROTAS.map((rota) => (
            <Button
              key={rota}
              onClick={() => setFilterRota(filterRota === rota ? null : rota)}
              variant={filterRota === rota ? 'default' : 'outline'}
              size="sm"
              className={`text-xs py-1 px-1.5 h-auto whitespace-nowrap ${
                filterRota === rota
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {rota}
            </Button>
          ))}
          {filterRota && (
            <Button
              onClick={() => setFilterRota(null)}
              variant="ghost"
              size="sm"
              className="text-xs py-1 px-2 h-auto text-slate-400 hover:text-slate-200"
            >
              ✕
            </Button>
          )}
        </div>

        {/* Card de Resultado de Filtros ou Imagem de Boas-vindas */}
        {(filterPeriod || filterRota || selectedPasta) && (
          <Card className="bg-slate-700/50 border-slate-600 mt-2">
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Faturado</p>
                  <p className="text-blue-400 font-semibold text-sm">R$ {formatBRL(totalFaturado)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Custo</p>
                  <p className="text-red-400 font-semibold text-sm">R$ {formatBRL(totalCusto)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Lucro</p>
                  <p className={`font-semibold text-sm ${totalLucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    R$ {formatBRL(totalLucro)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Layout: Pastas 30% esquerda, Imagem 70% direita */}
      <div className="grid grid-cols-10 gap-6 mb-6 h-80">
        {/* Coluna Esquerda: Pastas (30% = 3 colunas de 10) */}
        <div className="col-span-3 flex flex-col gap-3">
          {PASTAS.map((pasta) => (
            <Button
              key={pasta}
              onClick={() => setSelectedPasta(selectedPasta === pasta ? null : pasta)}
              variant={selectedPasta === pasta ? 'default' : 'outline'}
              className={`flex-1 text-base font-semibold transition-all ${
                selectedPasta === pasta
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {pasta}
            </Button>
          ))}
        </div>

        {/* Coluna Direita: Imagem (70% = 7 colunas de 10) */}
        <div className="col-span-7 flex items-center justify-center">
          {selectedPasta ? (
            <Card className="w-full bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <img
                  src={PLACA_IMAGES[selectedPasta]}
                  alt={`Placa ${selectedPasta}`}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </CardContent>
            </Card>
          ) : filterPeriod || filterRota ? (
            <div className="text-center text-slate-400">
              <p className="text-lg">Selecione uma placa para visualizar</p>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <img
                src="/manus-storage/pasted_file_9QIUXp_image_0d61aab3.png"
                alt="TR.PETRY Logística e Transporte"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
      </div>



      {/* Formulário e Tabela de Cargas - Ocupando todo o espaço */}
      <div className="grid grid-cols-1 gap-6 flex-1 min-h-[500px]">
        <Card className="bg-slate-800 border-slate-700 flex flex-col flex-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Cargas - {selectedPasta} {filterPeriod && `(${filterPeriod === 'semana' ? 'Semana' : filterPeriod === 'mes' ? 'Mês' : 'Semestre'})`} {filterRota && `- ${filterRota}`}</CardTitle>
            <div className="flex gap-2">
              {selectedForDelete.size > 0 && (
                <>
                  <Button
                    size="icon"
                    className="bg-purple-600 hover:bg-purple-700 text-white h-9 w-9"
                    onClick={() => setIsViewDialogOpen(true)}
                    title="Visualizar resumo"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {selectedForDelete.size === 1 && (
                    <Button
                      size="icon"
                      className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9"
                      onClick={() => {
                        const id = Array.from(selectedForDelete)[0];
                        const carga = cargas?.find((c: any) => c.id === id);
                        if (carga) {
                          handleEditCarga(carga);
                          setSelectedForDelete(new Set());
                        }
                      }}
                      title="Editar carga"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    className="bg-red-600 hover:bg-red-700 text-white h-9 w-9"
                    onClick={handleDeleteSelected}
                    title="Excluir cargas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                {selectedForDelete.size === 0 && selectedPasta && (
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        handleCloseDialog();
                        // Definir a data de hoje no formato YYYY-MM-DD
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = String(today.getMonth() + 1).padStart(2, '0');
                        const day = String(today.getDate()).padStart(2, '0');
                        const todayString = `${year}-${month}-${day}`;
                        setFormData(prev => ({ ...prev, data: todayString }));
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Carga
                    </Button>
                  </DialogTrigger>
                )}
                {selectedForDelete.size === 0 && !selectedPasta && (
                  <Button
                    size="sm"
                    className="bg-slate-600 text-slate-400 cursor-not-allowed"
                    disabled
                    title="Selecione uma placa para criar nova carga"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Carga
                  </Button>
                )}
              <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingId ? 'Editar Carga' : 'Nova Carga'} - {selectedPasta}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Data - Bloqueada ao editar em mobile */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Data</label>
                    <Input
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      autoFocus={true}
                      disabled={editingId ? true : false}
                      required
                    />
                  </div>



                  {/* Rota - Select com opções pré-definidas */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Rota</label>
                    <select
                      value={formData.rota}
                      onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 h-10"
                      required
                    >
                      <option value="">Selecione a rota</option>
                      {ROTAS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {formData.rota === 'OUTROS' && (
                      <Input
                        type="text"
                        placeholder="Digite a rota personalizada"
                        value={formData.rotaCustom}
                        onChange={(e) => setFormData({ ...formData, rotaCustom: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        required
                      />
                    )}
                  </div>

                  {/* Motorista - Select */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Motorista</label>
                    <select
                      value={formData.motorista}
                      onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 h-10"
                      required
                    >
                      <option value="">Selecione o motorista</option>
                      {MOTORISTAS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Combustível - Cálculo automático */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Valor Litro Diesel (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.valorLitroDiesel}
                        onChange={(e) => setFormData({ ...formData, valorLitroDiesel: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Litros Combustível</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.litrosCombustivel}
                        onChange={(e) => setFormData({ ...formData, litrosCombustivel: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  {/* Valor Combustível Calculado (somente leitura) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Valor Combustível (calculado automaticamente)
                    </label>
                    <Input
                      type="text"
                      value={`R$ ${formatBRL(valorCombustivelCalculado)}`}
                      readOnly
                      disabled
                      className="bg-slate-800 border-slate-600 text-green-400 font-semibold cursor-not-allowed"
                    />
                  </div>

                  {/* Chapas - Selects */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Chapa 1 {formData.chapa1 && formData.chapa1.trim() !== '' && <span className="text-green-400 text-xs">(+R$ 150)</span>}</label>
                      <select
                        value={formData.chapa1}
                        onChange={(e) => setFormData({ ...formData, chapa1: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 h-10"
                      >
                        <option value="">Nenhum</option>
                        {CHAPAS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Chapa 2 {formData.chapa2 && formData.chapa2.trim() !== '' && <span className="text-green-400 text-xs">(+R$ 150)</span>}</label>
                      <select
                        value={formData.chapa2}
                        onChange={(e) => setFormData({ ...formData, chapa2: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 h-10"
                      >
                        <option value="">Nenhum</option>
                        {CHAPAS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Custos */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Manutenção (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.manutencao}
                        onChange={(e) => setFormData({ ...formData, manutencao: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Custos Outros (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.custoOutros}
                        onChange={(e) => setFormData({ ...formData, custoOutros: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  {/* Protocolo e Frete */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Número Protocolo</label>
                      <Input
                        type="text"
                        placeholder="Ex: PROTO-001"
                        value={formData.numeroProtocolo}
                        onChange={(e) => setFormData({ ...formData, numeroProtocolo: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Valor Frete (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.valorFrete}
                        onChange={(e) => setFormData({ ...formData, valorFrete: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Resumo de Custos e Retenção */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Valor Frete:</span>
                      <span className="text-blue-400 font-semibold">R$ {formatBRL(valorFrete)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Valor Retido (10%):</span>
                      <span className="text-yellow-400 font-semibold">R$ {formatBRL(valorRetido)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Valor Líquido Frete:</span>
                      <span className="text-green-400 font-semibold">R$ {formatBRL(valorLiquidoFrete)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-600">
                      <span className="text-slate-300">Custo Total:</span>
                      <span className="text-white font-semibold">R$ {formatBRL(custoTotalCalculado)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-600">
                      <span className="text-slate-300">Lucro:</span>
                      {valorFrete === 0 ? (
                        <span className="text-slate-400 text-sm">Preencha o Frete</span>
                      ) : (
                        <span className={`font-semibold ${lucroCalculado >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          R$ {formatBRL(lucroCalculado)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botão Salvar */}
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingId ? 'Atualizar Carga' : 'Salvar Carga'}
                  </Button>
                </form>
              </DialogContent>
              </Dialog>

              {/* Dialog de Visualização - Resumo Totais */}
              <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <Eye className="w-5 h-5 text-purple-400" />
                      Resumo - {selectedPasta}
                    </DialogTitle>
                  </DialogHeader>
                  {(() => {
                    const totalFaturado = cargas?.reduce((acc: number, c: any) => acc + Number(c.valorFrete || 0), 0) || 0;
                    const totalCusto = cargas?.reduce((acc: number, c: any) => acc + Number(c.custoTotal || 0), 0) || 0;
                    const totalLucro = cargas?.reduce((acc: number, c: any) => acc + Number(c.lucro || 0), 0) || 0;
                    const qtdCargas = cargas?.length || 0;
                    return (
                      <div className="space-y-4 py-4">
                        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <p className="text-slate-400 text-xs uppercase tracking-wide">Total de Cargas</p>
                          <p className="text-white text-2xl font-bold mt-1">{qtdCargas}</p>
                        </div>
                        <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700/50">
                          <p className="text-blue-300 text-xs uppercase tracking-wide">Total Faturado</p>
                          <p className="text-white text-2xl font-bold mt-1">R$ {formatBRL(totalFaturado)}</p>
                        </div>
                        <div className="bg-red-900/30 rounded-lg p-4 border border-red-700/50">
                          <p className="text-red-300 text-xs uppercase tracking-wide">Total Custo</p>
                          <p className="text-white text-2xl font-bold mt-1">R$ {formatBRL(totalCusto)}</p>
                        </div>
                        <div className={`rounded-lg p-4 border ${totalLucro >= 0 ? 'bg-green-900/30 border-green-700/50' : 'bg-red-900/40 border-red-700/50'}`}>
                          <p className={`text-xs uppercase tracking-wide ${totalLucro >= 0 ? 'text-green-300' : 'text-red-300'}`}>Total Lucro</p>
                          <p className={`text-2xl font-bold mt-1 ${totalLucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {formatBRL(totalLucro)}</p>
                        </div>
                      </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center text-slate-400">Carregando cargas...</div>
            ) : cargas && cargas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead className="border-b border-slate-700">
                    <tr>
                      <th className="text-left py-1 px-1 w-6"></th>
                      <th className="text-left py-1 px-1 text-xs">Data</th>
                      <th className="text-left py-1 px-1 text-xs">Rota</th>
                      <th className="text-left py-1 px-1 text-xs">Motorista</th>
                      <th className="text-left py-1 px-1 text-xs">Placa</th>
                      <th className="text-right py-1 px-1 text-xs">Frete</th>
                      <th className="text-right py-1 px-1 text-xs">Custo</th>
                      <th className="text-right py-1 px-1 text-xs">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCargas?.map((carga: any) => {
                      // Garantir que a data seja parseada corretamente
                      let dataObj: Date;
                      if (carga.data instanceof Date) {
                        dataObj = carga.data;
                      } else if (typeof carga.data === 'string') {
                        // Se for string YYYY-MM-DD, criar a data sem timezone issues
                        const [year, month, day] = carga.data.split('-').map(Number);
                        dataObj = new Date(year, month - 1, day);
                      } else {
                        dataObj = new Date();
                      }
                      const dateParts = dataObj.toLocaleDateString('pt-BR').split('/');
                      const dataEncurtada = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]?.slice(-2)}`;
                      return (
                      <tr key={carga.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="py-1 px-1">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={selectedForDelete.has(carga.id)}
                            onChange={() => handleToggleCheckbox(carga.id)}
                          />
                        </td>
                        <td className="py-1 px-1 text-xs">{dataEncurtada}</td>
                        <td className="py-1 px-1 text-xs">{carga.rota}</td>
                        <td className="py-1 px-1 text-xs">{carga.motorista}</td>
                        <td className="py-1 px-1 text-xs font-semibold">{carga.pasta}</td>
                        <td className="text-right py-1 px-1 text-xs">R$ {formatBRL(Number(carga.valorFrete || 0))}</td>
                        <td className="text-right py-1 px-1 text-xs">R$ {formatBRL(Number(carga.custoTotal || 0))}</td>
                        <td className={`text-right py-1 px-1 text-xs font-semibold ${Number(carga.lucro || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          R$ {formatBRL(Number(carga.lucro || 0))}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>

                </table>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                {cargas && cargas.length === 0 ? 'Nenhuma carga registrada nesta pasta' : 'Nenhuma carga encontrada com os filtros selecionados'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Totalizador Geral */}
        {filteredCargas && filteredCargas.length > 0 && !selectedPasta && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Total Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-slate-400 text-xs mb-1">Faturado</p>
                  <p className="text-blue-400 font-bold text-base">R$ {formatBRL(totalFaturado)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-slate-400 text-xs mb-1">Custo</p>
                  <p className="text-red-400 font-bold text-base">R$ {formatBRL(totalCusto)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-slate-400 text-xs mb-1">Lucro</p>
                  <p className={`font-bold text-base ${totalLucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    R$ {formatBRL(totalLucro)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
