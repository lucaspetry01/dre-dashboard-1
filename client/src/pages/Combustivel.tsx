import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';

type Pasta = 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU';

const PASTAS: Pasta[] = ['IES', 'IJD', 'DAJ', 'MFF', 'IGU'];

export default function Combustivel() {
  const [selectedPasta, setSelectedPasta] = useState<Pasta>('IES');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      setFormData({ data: '', placa: '', rota: '', motorista: '', protocolo: '' });
      setIsDialogOpen(false);
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

  const formatDate = (date: any) => {
    if (date instanceof Date) {
      return date.toLocaleDateString('pt-BR');
    }
    return String(date);
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar com pastas */}
      <div className="w-48 bg-slate-800 border-r border-slate-700 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold text-white mb-4">Pastas</h2>
        <div className="space-y-2">
          {PASTAS.map((pasta) => (
            <button
              key={pasta}
              onClick={() => setSelectedPasta(pasta)}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
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
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">Combustível - {selectedPasta}</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Abastecimento
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Registrar Abastecimento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Placa</label>
                    <Input
                      type="text"
                      placeholder="ABC-1234"
                      value={formData.placa}
                      onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Rota</label>
                    <Input
                      type="text"
                      placeholder="São Paulo - Rio de Janeiro"
                      value={formData.rota}
                      onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Motorista</label>
                    <Input
                      type="text"
                      placeholder="Nome do motorista"
                      value={formData.motorista}
                      onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Protocolo</label>
                    <Input
                      type="text"
                      placeholder="Número do protocolo"
                      value={formData.protocolo}
                      onChange={(e) => setFormData({ ...formData, protocolo: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Registrando...' : 'Registrar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabela de abastecimentos */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Abastecimentos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-slate-400">Carregando...</div>
              ) : abastecimentos && abastecimentos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-300">
                    <thead className="bg-slate-700 text-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left">Data</th>
                        <th className="px-4 py-2 text-left">Placa</th>
                        <th className="px-4 py-2 text-left">Rota</th>
                        <th className="px-4 py-2 text-left">Motorista</th>
                        <th className="px-4 py-2 text-left">Protocolo</th>
                        <th className="px-4 py-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abastecimentos.map((abastecimento) => (
                        <tr key={abastecimento.id} className="border-t border-slate-700 hover:bg-slate-700">
                          <td className="px-4 py-2">{formatDate(abastecimento.data)}</td>
                          <td className="px-4 py-2 font-semibold">{abastecimento.placa}</td>
                          <td className="px-4 py-2">{abastecimento.rota || '-'}</td>
                          <td className="px-4 py-2">{abastecimento.motorista || '-'}</td>
                          <td className="px-4 py-2">{abastecimento.protocolo || '-'}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleDelete(abastecimento.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">Nenhum abastecimento registrado nesta pasta</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
