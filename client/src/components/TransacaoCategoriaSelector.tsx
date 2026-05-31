import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { trpc } from '@/lib/trpc';

const CATEGORIAS = [
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

interface TransacaoCategoriaProps {
  transacaoId: number;
  categoriaAtual: string;
  descricao: string;
  onSuccess?: () => void;
}

export function TransacaoCategoriaSelector({
  transacaoId,
  categoriaAtual,
  descricao,
  onSuccess,
}: TransacaoCategoriaProps) {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(categoriaAtual);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const atualizarMutation = trpc.ofx.atualizarCategoria.useMutation();

  const handleSelectChange = (novaCategoria: string) => {
    if (novaCategoria !== categoriaAtual) {
      setCategoriaSelecionada(novaCategoria);
      setShowConfirm(true);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await atualizarMutation.mutateAsync({
        transacaoId,
        novaCategoria: categoriaSelecionada,
      });

      if (result.success) {
        setShowConfirm(false);
        onSuccess?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCategoriaSelecionada(categoriaAtual);
    setShowConfirm(false);
  };

  return (
    <>
      <Select value={categoriaSelecionada} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione uma categoria" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIAS.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2 mt-2">
                <p className="text-sm text-foreground">
                  <strong>Transação:</strong> {descricao}
                </p>
                <p className="text-sm text-foreground">
                  <strong>De:</strong> {categoriaAtual}
                </p>
                <p className="text-sm text-foreground">
                  <strong>Para:</strong> {categoriaSelecionada}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? 'Atualizando...' : 'Confirmar'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
