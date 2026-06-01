import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ArrowLeft, Truck } from 'lucide-react';

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
    motorista: '',
    valorCombustivel: '',
    litrosCombustivel: '',
    chapa1: '',
    chapa2: '',
    custoOutros: '',
    manutencao: '',
    numeroProtocolo: '',
    valorFrete: '',
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      pasta: selectedPasta,
      data: formData.data,
      rota: formData.rota,
      motorista: formData.motorista,
      valorCombustivel: parseFloat(formData.valorCombustivel) || 0,
      litrosCombustivel: parseFloat(formData.litrosCombustivel) || 0,
      chapa1: formData.chapa1,
      chapa2: formData.chapa2,
      custoOutros: parseFloat(formData.custoOutros) || 0,
      manutencao: parseFloat(formData.manutencao) || 0,
      numeroProtocolo: formData.numeroProtocolo,
      valorFrete: parseFloat(formData.valorFrete) || 0,
    });
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
      custoOutros: '',
      manutencao: '',
      numeroProtocolo: '',
      valorFrete: '',
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
      </div>

      {/* Layout: Pastas à esquerda, Imagem à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Coluna Esquerda: Pastas */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          {PASTAS.map((pasta) => (
            <Button
              key={pasta}
              onClick={() => setSelectedPasta(pasta)}
              variant={selectedPasta === pasta ? 'default' : 'outline'}
              className={`py-4 text-base font-semibold transition-all ${
                selectedPasta === pasta
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {pasta}
            </Button>
          ))}
        </div>

        {/* Coluna Direita: Imagem */}
        <div className="lg:col-span-3 flex items-center justify-center">
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

      {/* Formulário e Tabela de Cargas */}
      <div className="grid grid-cols-1 gap-6">
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
                  {/* Data */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Data</label>
                    <Input
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>

                  {/* Rota */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Rota</label>
                    <Input
                      type="text"
                      placeholder="Ex: São Paulo - Gramado"
                      value={formData.rota}
                      onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>

                  {/* Motorista */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Motorista</label>
                    <Input
                      type="text"
                      placeholder="Nome do motorista"
                      value={formData.motorista}
                      onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>

                  {/* Combustível */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Valor Combustível (R$)</label>
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

                  {/* Chapas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Chapa 1</label>
                      <Input
                        type="text"
                        placeholder="Ex: ABC-1234"
                        value={formData.chapa1}
                        onChange={(e) => setFormData({ ...formData, chapa1: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Chapa 2</label>
                      <Input
                        type="text"
                        placeholder="Ex: XYZ-5678"
                        value={formData.chapa2}
                        onChange={(e) => setFormData({ ...formData, chapa2: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
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

                  {/* Botão Salvar */}
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Salvando...' : 'Salvar Carga'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center text-slate-400">Carregando cargas...</div>
            ) : cargas && cargas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead className="border-b border-slate-700">
                    <tr>
                      <th className="text-left py-2 px-2">Data</th>
                      <th className="text-left py-2 px-2">Rota</th>
                      <th className="text-left py-2 px-2">Motorista</th>
                      <th className="text-right py-2 px-2">Frete (R$)</th>
                      <th className="text-right py-2 px-2">Custo Total (R$)</th>
                      <th className="text-right py-2 px-2">Lucro (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargas?.map((carga: any) => (
                      <tr key={carga.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="py-2 px-2">{new Date(carga.data).toLocaleDateString('pt-BR')}</td>
                        <td className="py-2 px-2">{carga.rota}</td>
                        <td className="py-2 px-2">{carga.motorista}</td>
                        <td className="text-right py-2 px-2">R$ {carga.valorFrete?.toFixed(2)}</td>
                        <td className="text-right py-2 px-2">R$ {carga.custoTotal?.toFixed(2)}</td>
                        <td className={`text-right py-2 px-2 font-semibold ${(carga.lucro ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          R$ {carga.lucro?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
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
