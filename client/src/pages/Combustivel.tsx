import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, ArrowLeft } from 'lucide-react';

type Pasta = 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU';

const PASTAS: Pasta[] = ['IES', 'IJD', 'DAJ', 'MFF', 'IGU'];

export default function Combustivel() {
  const [, setLocation] = useLocation();
  const [selectedPasta, setSelectedPasta] = useState<Pasta>('IES');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    data: '',
    placa: '',
    rota: '',
    motorista: '',
    protocolo: '',
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: abastecimentos, isLoading } = trpc.abastecimentos.getByPasta.useQuery({
    pasta: selectedPasta,
  });

  // Mutations
  const createMutation = trpc.abastecimentos.create.useMutation({
    onSuccess: () => {
      utils.abastecimentos.getByPasta.invalidate({ pasta: selectedPasta });
      handleCloseDialog();
      console.log('Abastecimento registrado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao registrar abastecimento:', error.message);
    },
  });

  const deleteMutation = trpc.abastecimentos.delete.useMutation({
    onSuccess: () => {
      utils.abastecimentos.getByPasta.invalidate({ pasta: selectedPasta });
      console.log('Abastecimento deletado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar abastecimento:', error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data || !formData.placa) {
      console.error('Data e placa são obrigatórios');
      return;
    }
    createMutation.mutate({
      pasta: selectedPasta,
      data: formData.data,
      placa: formData.placa,
      rota: formData.rota,
      motorista: formData.motorista,
      protocolo: formData.protocolo,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja deletar este abastecimento?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleEdit = (abastecimento: any) => {
    setEditingId(abastecimento.id);
    setFormData({
      data: abastecimento.data instanceof Date ? abastecimento.data.toISOString().split('T')[0] : abastecimento.data,
      placa: abastecimento.placa,
      rota: abastecimento.rota || '',
      motorista: abastecimento.motorista || '',
      protocolo: abastecimento.protocolo || '',
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ data: '', placa: '', rota: '', motorista: '', protocolo: '' });
  };

  const formatDate = (date: any) => {
    if (date instanceof Date) {
      return date.toLocaleDateString('pt-BR');
    }
    return String(date);
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar com pastas */}
      <div className="w-32 bg-slate-800 border-r border-slate-700 p-2 overflow-y-auto">
        <h2 className="text-xs font-bold text-white mb-2">Pastas</h2>
        <div className="space-y-1">
          {PASTAS.map((pasta) => (
            <button
              key={pasta}
              onClick={() => setSelectedPasta(pasta)}
              className={`w-full text-left px-2 py-1 text-xs rounded-md transition-colors ${
                selectedPasta === pasta
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              {pasta}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocation('/')}
                className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                title="Voltar ao Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl font-bold text-white">Combustível - {selectedPasta}</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs h-7">
                  <Plus className="w-3 h-3 mr-1" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm text-white">{editingId ? 'Editar' : 'Novo Abastecimento'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-0.5">Data</label>
                    <Input
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white h-7 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-0.5">Placa</label>
                    <Input
                      type="text"
                      placeholder="ABC-1234"
                      value={formData.placa}
                      onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white h-7 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-0.5">Rota</label>
                    <Input
                      type="text"
                      placeholder="São Paulo - Rio"
                      value={formData.rota}
                      onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-0.5">Motorista</label>
                    <Input
                      type="text"
                      placeholder="Nome"
                      value={formData.motorista}
                      onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-0.5">Protocolo</label>
                    <Input
                      type="text"
                      placeholder="Número"
                      value={formData.protocolo}
                      onChange={(e) => setFormData({ ...formData, protocolo: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white h-7 text-xs"
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-xs h-7" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Layout responsivo: Imagem em cima (mobile) ou lado a lado (desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Imagem: 100% em mobile, 30% em desktop */}
            {selectedPasta === 'IES' && (
              <div className="col-span-1 lg:col-span-1 rounded-lg overflow-hidden bg-slate-700 p-3 flex items-center justify-center h-48 lg:h-auto">
                <img
                  src="/manus-storage/pasted_file_ofnWe9_image_aeac23d2.png"
                  alt="Placa IES"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {selectedPasta === 'MFF' && (
              <div className="col-span-1 lg:col-span-1 rounded-lg overflow-hidden bg-slate-700 p-3 flex items-center justify-center h-48 lg:h-auto">
                <img
                  src="/manus-storage/placa_mff_no_bg_eb502184.png"
                  alt="Placa MFF"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {selectedPasta === 'IJD' && (
              <div className="col-span-1 lg:col-span-1 rounded-lg overflow-hidden bg-slate-700 p-3 flex items-center justify-center h-48 lg:h-auto">
                <img
                  src="/manus-storage/placa_ijd_no_bg_0c6c2266.png"
                  alt="Placa IJD"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {selectedPasta === 'DAJ' && (
              <div className="col-span-1 lg:col-span-1 rounded-lg overflow-hidden bg-slate-700 p-3 flex items-center justify-center h-48 lg:h-auto">
                <img
                  src="/manus-storage/pasted_file_vIHW2R_image_62640b07.png"
                  alt="Placa DAJ"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {selectedPasta === 'IGU' && (
              <div className="col-span-1 lg:col-span-1 rounded-lg overflow-hidden bg-slate-700 p-3 flex items-center justify-center h-48 lg:h-auto">
                <img
                  src="/manus-storage/pasted_file_1mKDij_image_89cc173d.png"
                  alt="Placa IGU"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Tabela: 100% em mobile, 70% em desktop */}
            <div className={['IES', 'MFF', 'IJD', 'DAJ', 'IGU'].includes(selectedPasta) ? 'col-span-1 lg:col-span-2' : 'col-span-1 lg:col-span-3'}>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Abastecimentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center text-slate-400 text-xs">Carregando...</div>
                  ) : abastecimentos && abastecimentos.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-slate-300">
                        <thead className="bg-slate-700 text-slate-200">
                          <tr>
                            <th className="px-2 py-1 text-left">Data</th>
                            <th className="px-2 py-1 text-left">Placa</th>
                            <th className="px-2 py-1 text-left">Rota</th>
                            <th className="px-2 py-1 text-left">Motorista</th>
                            <th className="px-2 py-1 text-left">Protocolo</th>
                            <th className="px-2 py-1 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abastecimentos.map((abastecimento) => (
                            <tr key={abastecimento.id} className="border-t border-slate-700 hover:bg-slate-700">
                              <td className="px-2 py-1">{formatDate(abastecimento.data)}</td>
                              <td className="px-2 py-1 font-semibold">{abastecimento.placa}</td>
                              <td className="px-2 py-1">{abastecimento.rota || '-'}</td>
                              <td className="px-2 py-1">{abastecimento.motorista || '-'}</td>
                              <td className="px-2 py-1">{abastecimento.protocolo || '-'}</td>
                              <td className="px-2 py-1 text-center flex gap-1 justify-center">
                                <button
                                  onClick={() => handleEdit(abastecimento)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(abastecimento.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Deletar"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-4 text-xs">Nenhum abastecimento registrado nesta pasta</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
