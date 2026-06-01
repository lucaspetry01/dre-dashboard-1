import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, ArrowLeft, Truck } from 'lucide-react';

type Pasta = 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU';

const PASTAS: Pasta[] = ['IES', 'IJD', 'DAJ', 'MFF', 'IGU'];

// Imagens das placas
const PLACA_IMAGES: Record<Pasta, string> = {
  IES: '/manus-storage/placa_ies_no_bg_a1b2c3d4.png',
  MFF: '/manus-storage/placa_mff_no_bg_e5f6g7h8.png',
  IJD: '/manus-storage/placa_ijd_no_bg_i9j0k1l2.png',
  DAJ: '/manus-storage/placa_daj_m3n4o5p6.jpg',
  IGU: '/manus-storage/placa_igu_q7r8s9t0.jpg',
};

export default function Cargas() {
  const [, setLocation] = useLocation();
  const [selectedPasta, setSelectedPasta] = useState<Pasta>('IES');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    data: '',
    rota: '',
    motorista: '',
    valorCombustivel: '',
    litrosCombustivel: '',
    chapa1: '',
    chapa2: '',
    manutencao: '',
    custoOutros: '',
    valorFrete: '',
    numeroProtocolo: '',
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: cargas, isLoading } = trpc.cargas.listarPorPasta.useQuery(selectedPasta);

  // Mutations
  const createMutation = trpc.cargas.criar.useMutation({
    onSuccess: () => {
      utils.cargas.listarPorPasta.invalidate(selectedPasta);
      handleCloseDialog();
      console.log('Carga registrada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao registrar carga:', error.message);
    },
  });

  const deleteMutation = trpc.cargas.deletar.useMutation({
    onSuccess: () => {
      utils.cargas.listarPorPasta.invalidate(selectedPasta);
      console.log('Carga deletada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar carga:', error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data) {
      console.error('Data é obrigatória');
      return;
    }

    createMutation.mutate({
      pasta: selectedPasta,
      data: formData.data,
      rota: formData.rota || undefined,
      motorista: formData.motorista || undefined,
      valorCombustivel: parseFloat(formData.valorCombustivel) || 0,
      litrosCombustivel: parseFloat(formData.litrosCombustivel) || 0,
      chapa1: formData.chapa1 || undefined,
      chapa2: formData.chapa2 || undefined,
      manutencao: parseFloat(formData.manutencao) || 0,
      custoOutros: parseFloat(formData.custoOutros) || 0,
      valorFrete: parseFloat(formData.valorFrete) || 0,
      numeroProtocolo: formData.numeroProtocolo || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja deletar esta carga?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (carga: any) => {
    setEditingId(carga.id);
    setFormData({
      data: carga.data instanceof Date ? carga.data.toISOString().split('T')[0] : carga.data,
      rota: carga.rota || '',
      motorista: carga.motorista || '',
      valorCombustivel: String(carga.valorCombustivel || ''),
      litrosCombustivel: String(carga.litrosCombustivel || ''),
      chapa1: carga.chapa1 || '',
      chapa2: carga.chapa2 || '',
      manutencao: String(carga.manutencao || ''),
      custoOutros: String(carga.custoOutros || ''),
      valorFrete: String(carga.valorFrete || ''),
      numeroProtocolo: carga.numeroProtocolo || '',
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      data: '',
      rota: '',
      motorista: '',
      valorCombustivel: '',
      litrosCombustivel: '',
      chapa1: '',
      chapa2: '',
      manutencao: '',
      custoOutros: '',
      valorFrete: '',
      numeroProtocolo: '',
    });
  };

  const formatDate = (date: any) => {
    if (date instanceof Date) {
      return date.toLocaleDateString('pt-BR');
    }
    return String(date);
  };

  const formatMoney = (value: any) => {
    return `R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      {/* Header com botão de voltar */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/dashboard')}
          className="text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Truck className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">Cargas</h1>
        </div>
      </div>

      {/* Sidebar com Pastas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        {PASTAS.map((pasta) => (
          <Button
            key={pasta}
            onClick={() => setSelectedPasta(pasta)}
            variant={selectedPasta === pasta ? 'default' : 'outline'}
            className={`py-6 text-lg font-semibold transition-all ${
              selectedPasta === pasta
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {pasta}
          </Button>
        ))}
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Imagem da Placa - 30% em desktop, 100% em mobile */}
        <div className="lg:col-span-1 flex items-center justify-center">
          <Card className="w-full bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <img
                src={PLACA_IMAGES[selectedPasta]}
                alt={`Placa ${selectedPasta}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Cargas - 70% em desktop, 100% em mobile */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Cargas - {selectedPasta}</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingId ? 'Editar Carga' : 'Nova Carga'} - {selectedPasta}
                    </DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Linha 1: Data e Rota */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Data *
                        </label>
                        <Input
                          type="date"
                          value={formData.data}
                          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Rota
                        </label>
                        <Input
                          type="text"
                          placeholder="ex: Gramado"
                          value={formData.rota}
                          onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    {/* Linha 2: Motorista */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Motorista
                      </label>
                      <Input
                        type="text"
                        placeholder="Nome do motorista"
                        value={formData.motorista}
                        onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    {/* Linha 3: Combustível */}
                    <div className="border-t border-slate-600 pt-4">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Combustível</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Valor (R$)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.valorCombustivel}
                            onChange={(e) => setFormData({ ...formData, valorCombustivel: e.target.value })}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Litros
                          </label>
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
                    </div>

                    {/* Linha 4: Veículos */}
                    <div className="border-t border-slate-600 pt-4">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Veículos</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Chapa 1
                          </label>
                          <Input
                            type="text"
                            placeholder="ex: ABC-1234"
                            value={formData.chapa1}
                            onChange={(e) => setFormData({ ...formData, chapa1: e.target.value })}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Chapa 2
                          </label>
                          <Input
                            type="text"
                            placeholder="ex: XYZ-5678"
                            value={formData.chapa2}
                            onChange={(e) => setFormData({ ...formData, chapa2: e.target.value })}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Linha 5: Custos */}
                    <div className="border-t border-slate-600 pt-4">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Custos</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Manutenção (R$)
                          </label>
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
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Outros (R$)
                          </label>
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
                    </div>

                    {/* Linha 6: Frete e Protocolo */}
                    <div className="border-t border-slate-600 pt-4">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Frete e Protocolo</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Valor Frete (R$) *
                          </label>
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
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Protocolo
                          </label>
                          <Input
                            type="text"
                            placeholder="ex: PROT-123456"
                            value={formData.numeroProtocolo}
                            onChange={(e) => setFormData({ ...formData, numeroProtocolo: e.target.value })}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="flex gap-3 pt-4 border-t border-slate-600">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseDialog}
                        className="flex-1 bg-slate-700 text-white hover:bg-slate-600"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">Carregando...</div>
              ) : !cargas || cargas.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Nenhuma carga registrada nesta pasta
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Data</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Rota</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Motorista</th>
                        <th className="text-right py-3 px-4 text-slate-300 font-semibold">Frete</th>
                        <th className="text-right py-3 px-4 text-slate-300 font-semibold">Custo</th>
                        <th className="text-right py-3 px-4 text-slate-300 font-semibold">Lucro</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargas.map((carga: any) => (
                        <tr key={carga.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-3 px-4 text-slate-300">{formatDate(carga.data)}</td>
                          <td className="py-3 px-4 text-slate-300">{carga.rota || '-'}</td>
                          <td className="py-3 px-4 text-slate-300">{carga.motorista || '-'}</td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            {formatMoney(carga.valorFrete)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            {formatMoney(carga.custoTotal)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              Number(carga.lucro) >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {formatMoney(carga.lucro)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(carga)}
                                className="text-blue-400 hover:bg-slate-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(carga.id)}
                                className="text-red-400 hover:bg-slate-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
