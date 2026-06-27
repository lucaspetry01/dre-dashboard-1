import { useState, useCallback } from 'react';
import { MoreVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

const CATEGORIAS_DISPONIVEIS = [
  'RECEITAS OPERACIONAIS',
  'COMBUSTÍVEL / POSTO',
  'CHAPA / OPERACIONAL PF',
  'PRÓ-LABORE / SOCIETÁRIO',
  'MECÂNICA / MANUTENÇÃO',
  'PEDÁGIOS / TAGS',
  'IMPOSTOS / TRIBUTOS / OUTROS',
  'CONTA / BOLETO',
  'CONSÓRCIO / FINANCIAMENTO',
  'CUSTO OPERACIONAL ESPECÍFICO',
  'PAGAMENTOS',
  'SAÍDAS NÃO CATEGORIZADAS',
];

/**
 * Botão para mover transação entre categorias com opção de criar regra automática.
 */
export function MovimentarCategoriaButton({
  transacaoId,
  categoriaAtual,
  descricao,
  onSuccess,
}: {
  transacaoId: number;
  categoriaAtual: string;
  descricao: string;
  onSuccess: () => void;
}) {
  const mutation = trpc.ofx.moverComRegra.useMutation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [tipoRegra, setTipoRegra] = useState<'KEYWORD' | 'NOME_EXATO' | 'SEM_REGRA'>('SEM_REGRA');
  const [valorRegra, setValorRegra] = useState('');

  // Sugestão de keyword: primeira palavra com mais de 3 letras que não seja número
  const sugestaoKeyword = descricao
    .trim()
    .split(/\s+/)
    .find(p => p.length > 3 && !/^\d+$/.test(p)) ?? descricao.split(' ')[0];

  const abrirModal = (categoria: string) => {
    setNovaCategoria(categoria);
    setMenuOpen(false);
    setValorRegra(sugestaoKeyword);
    setTipoRegra('SEM_REGRA');
    setModalOpen(true);
  };

  const confirmar = useCallback(() => {
    mutation.mutate(
      {
        transacaoId,
        novaCategoria,
        criarRegra: tipoRegra !== 'SEM_REGRA',
        tipoRegra: tipoRegra !== 'SEM_REGRA' ? tipoRegra : undefined,
        valorRegra: tipoRegra !== 'SEM_REGRA' ? valorRegra : undefined,
      },
      {
        onSuccess: (result) => {
          if (result.sucesso) {
            toast.success(
              tipoRegra !== 'SEM_REGRA'
                ? `Movido para "${novaCategoria}" e regra criada!`
                : `Movido para "${novaCategoria}"`
            );
            setModalOpen(false);
            onSuccess();
          } else {
            toast.error(result.mensagem || 'Erro ao mover');
          }
        },
        onError: () => toast.error('Erro ao mover transação'),
      }
    );
  }, [transacaoId, novaCategoria, tipoRegra, valorRegra, mutation, onSuccess]);

  return (
    <>
      {/* Menu de seleção de categoria */}
      <Select open={menuOpen} onOpenChange={setMenuOpen}>
        <SelectTrigger className="w-8 h-6 p-0 border-0 bg-slate-700 hover:bg-slate-600">
          <MoreVertical className="w-3 h-3" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIAS_DISPONIVEIS
            .filter(cat => cat !== categoriaAtual)
            .map(cat => (
              <SelectItem key={cat} value={cat} onPointerDown={() => abrirModal(cat)}>
                {cat}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Modal de confirmação e criação de regra */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-100 text-sm">
              Mover para: <span className="text-blue-400">{novaCategoria}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs text-slate-300">
            {/* Descrição da transação */}
            <p className="text-slate-400 break-words italic">"{descricao}"</p>

            <p className="font-semibold text-slate-200">Criar regra automática?</p>
            <p className="text-slate-500 text-xs">
              Uma regra faz com que futuras transações similares sejam categorizadas automaticamente.
            </p>

            {/* Opção: sem regra */}
            <button
              onClick={() => setTipoRegra('SEM_REGRA')}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                tipoRegra === 'SEM_REGRA'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-500'
              }`}
            >
              🚫 Só mover essa transação
            </button>

            {/* Opção: keyword */}
            <button
              onClick={() => setTipoRegra('KEYWORD')}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                tipoRegra === 'KEYWORD'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-500'
              }`}
            >
              🔑 Criar regra por palavra-chave
              <span className="block text-slate-500 text-xs mt-0.5">
                Ex: toda transação com "FARMACIA" vai para esta categoria
              </span>
            </button>

            {/* Opção: nome exato */}
            <button
              onClick={() => setTipoRegra('NOME_EXATO')}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                tipoRegra === 'NOME_EXATO'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-500'
              }`}
            >
              🎯 Criar regra por nome exato
              <span className="block text-slate-500 text-xs mt-0.5">
                Só transações com descrição idêntica serão afetadas
              </span>
            </button>

            {/* Input do valor da regra */}
            {tipoRegra !== 'SEM_REGRA' && (
              <div>
                <label className="text-slate-400 mb-1 block">
                  {tipoRegra === 'KEYWORD' ? 'Palavra-chave:' : 'Nome exato:'}
                </label>
                <input
                  type="text"
                  value={valorRegra}
                  onChange={e => setValorRegra(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={mutation.isPending || (tipoRegra !== 'SEM_REGRA' && !valorRegra.trim())}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
