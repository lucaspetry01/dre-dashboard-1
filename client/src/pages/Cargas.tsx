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
  const [selectedPasta, setSelectedPasta] = useState<Pasta>('IES');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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
  const ROTAS = ['GRAMADO', 'CAXIAS', 'FAZENDA', 'CD', 'OUTROS'];
  const MOTORISTAS = ['FRED', 'CESAR', 'DOUGLAS', 'ALEX'];
  const CHAPAS = ['DOUGLAS', 'DJOE', 'LUCAS', 'PABLO', 'ALEX'];

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
  const lucroCalculado = Number(formData.valorFrete || 0) - custoTotalCalculado;
  const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set());
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: cargas, isLoading } = trpc.cargas.listarPorPasta.useQuery(
    selectedPasta
  );

  // Mutations
  const createMutation = trpc.cargas.criar.useMutation({
    onSuccess: () => {
      utils.cargas.listarPorPasta.invalidate(selectedPasta);
      handleCloseDialog();
      console.log('Carga registrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao registrar carga:', error.message);
    },
  });

  const deleteMutation = trpc.cargas.deletar.useMutation({
    onSuccess: () => {
      utils.cargas.listarPorPasta.invalidate(selectedPasta);
      setSelectedForDelete(new Set());
      console.log('Carga deletada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao deletar carga:', error.message);
    },
  });

  const updateMutation = trpc.cargas.atualizar.useMutation({
    onSuccess: () => {
      utils.cargas.listarPorPasta.invalidate(selectedPasta);
      handleCloseDialog();
      console.log('Carga atualizada com sucesso!');
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
    const valorLitro = litros > 0 ? (valorComb / litros).toFixed(2) : '';

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
    } else {
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
      <div className="flex items-center justify-between mb-8">
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

      {/* Layout: Pastas 30% esquerda, Imagem 70% direita */}
      <div className="grid grid-cols-10 gap-6 mb-8 h-80">
        {/* Coluna Esquerda: Pastas (30% = 3 colunas de 10) */}
        <div className="col-span-3 flex flex-col gap-3">
          {PASTAS.map((pasta) => (
            <Button
              key={pasta}
              onClick={() => setSelectedPasta(pasta)}
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
          <Card className="w-full bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <img
                src={PLACA_IMAGES[selectedPasta]}
                alt={`Placa ${selectedPasta}`}
                className="w-full h-64 object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Formulário e Tabela de Cargas - Ocupando todo o espaço */}
      <div className="grid grid-cols-1 gap-6 flex-1 min-h-[500px]">
        <Card className="bg-slate-800 border-slate-700 flex flex-col flex-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Cargas - {selectedPasta}</CardTitle>
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
                {selectedForDelete.size === 0 && (
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleCloseDialog()}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Carga
                    </Button>
                  </DialogTrigger>
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

                  {/* Mostrar apenas data ao editar em mobile */}
                  {editingId && (
                    <div className="md:hidden bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
                      <p className="text-sm text-slate-300">Editando registro de <span className="font-semibold text-white">{String(formData.data)}</span></p>
                      <p className="text-xs text-slate-400 mt-1">Edite os valores abaixo</p>
                    </div>
                  )}

                  {/* Rota - Select com opções pré-definidas */}
                  <div className={editingId ? 'hidden md:block' : ''}>
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
                  <div className={editingId ? 'hidden md:block' : ''}>
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
                  <div className={`grid grid-cols-2 gap-4 ${editingId ? 'hidden md:grid' : ''}`}>
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
                  <div className={editingId ? 'hidden md:block' : ''}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Valor Combustível (calculado automaticamente)
                    </label>
                    <Input
                      type="text"
                      value={`R$ ${valorCombustivelCalculado.toFixed(2)}`}
                      readOnly
                      disabled
                      className="bg-slate-800 border-slate-600 text-green-400 font-semibold cursor-not-allowed"
                    />
                  </div>

                  {/* Chapas - Selects */}
                  <div className={`grid grid-cols-2 gap-4 ${editingId ? 'hidden md:grid' : ''}`}>
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
                  <div className={`grid grid-cols-2 gap-4 ${editingId ? 'hidden md:grid' : ''}`}>
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
                  <div className={`grid grid-cols-2 gap-4 ${editingId ? 'hidden md:grid' : ''}`}>
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

                  {/* Resumo de Custos */}
                  <div className={`bg-slate-700/50 rounded-lg p-4 space-y-3 mb-4 ${editingId ? 'hidden md:block' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Custo Total:</span>
                      <span className="text-white font-semibold">R$ {custoTotalCalculado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Valor Total Frete:</span>
                      <span className="text-blue-400 font-semibold">R$ {Number(formData.valorFrete || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-600">
                      <span className="text-slate-300">Lucro:</span>
                      {Number(formData.valorFrete || 0) === 0 ? (
                        <span className="text-slate-400 text-sm">Preencha o Frete</span>
                      ) : (
                        <span className={`font-semibold ${lucroCalculado >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          R$ {lucroCalculado.toFixed(2)}
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
                          <p className="text-white text-2xl font-bold mt-1">R$ {totalFaturado.toFixed(2)}</p>
                        </div>
                        <div className="bg-red-900/30 rounded-lg p-4 border border-red-700/50">
                          <p className="text-red-300 text-xs uppercase tracking-wide">Total Custo</p>
                          <p className="text-white text-2xl font-bold mt-1">R$ {totalCusto.toFixed(2)}</p>
                        </div>
                        <div className={`rounded-lg p-4 border ${totalLucro >= 0 ? 'bg-green-900/30 border-green-700/50' : 'bg-red-900/40 border-red-700/50'}`}>
                          <p className={`text-xs uppercase tracking-wide ${totalLucro >= 0 ? 'text-green-300' : 'text-red-300'}`}>Total Lucro</p>
                          <p className={`text-2xl font-bold mt-1 ${totalLucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {totalLucro.toFixed(2)}</p>
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
                      <th className="text-right py-1 px-1 text-xs">Frete</th>
                      <th className="text-right py-1 px-1 text-xs">Custo</th>
                      <th className="text-right py-1 px-1 text-xs">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargas?.map((carga: any) => {
                      const dateParts = new Date(carga.data).toLocaleDateString('pt-BR').split('/');
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
                        <td className="text-right py-1 px-1 text-xs">R$ {Number(carga.valorFrete || 0).toFixed(2)}</td>
                        <td className="text-right py-1 px-1 text-xs">R$ {Number(carga.custoTotal || 0).toFixed(2)}</td>
                        <td className={`text-right py-1 px-1 text-xs font-semibold ${Number(carga.lucro || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          R$ {Number(carga.lucro || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                Nenhuma carga registrada nesta pasta
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
