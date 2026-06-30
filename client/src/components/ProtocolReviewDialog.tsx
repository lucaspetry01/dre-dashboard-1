import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, AlertCircle } from 'lucide-react';

export interface ProtocolItem {
  id: string;
  data: string;
  numeroProtocolo: string;
  valorFrete: number;
  pesoTotal?: number;
  motorista?: string;
  isDuplicate?: boolean;
}

interface ProtocolReviewDialogProps {
  isOpen: boolean;
  protocolos: ProtocolItem[];
  onConfirm: (selectedIds: string[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProtocolReviewDialog({
  isOpen,
  protocolos,
  onConfirm,
  onCancel,
  isLoading = false,
}: ProtocolReviewDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(protocolos.filter(p => !p.isDuplicate).map(p => p.id))
  );

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === protocolos.filter(p => !p.isDuplicate).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(protocolos.filter(p => !p.isDuplicate).map(p => p.id)));
    }
  };

  const novos = protocolos.filter(p => !p.isDuplicate).length;
  const duplicados = protocolos.filter(p => p.isDuplicate).length;
  const selecionados = selectedIds.size;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Revisar Protocolos Sincronizados</DialogTitle>
          <p className="text-sm text-slate-400 mt-2">
            {novos} novo(s) • {duplicados} duplicado(s) ignorado(s)
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
              {protocolos.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Nenhum protocolo encontrado
                </div>
              ) : (
                <>
                  {/* Header com checkbox "Selecionar Tudo" */}
                  {novos > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg mb-2">
                      <Checkbox
                        checked={selecionados === novos}
                        onCheckedChange={handleSelectAll}
                        disabled={isLoading}
                      />
                      <span className="text-sm font-medium text-slate-300">
                        Selecionar Todos ({selecionados}/{novos})
                      </span>
                    </div>
                  )}

                  {/* Lista de protocolos novos */}
                  {protocolos
                    .filter(p => !p.isDuplicate)
                    .map(protocolo => (
                      <div
                        key={protocolo.id}
                        className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors border border-slate-700/50"
                      >
                        <Checkbox
                          checked={selectedIds.has(protocolo.id)}
                          onCheckedChange={() => handleToggle(protocolo.id)}
                          disabled={isLoading}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">
                              {protocolo.numeroProtocolo}
                            </span>
                            <span className="text-xs text-slate-500">{protocolo.data}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-400">
                            <div>
                              Valor: <span className="text-green-400 font-medium">
                                R$ {protocolo.valorFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {protocolo.pesoTotal && (
                              <div>
                                Peso: <span className="text-slate-300">{protocolo.pesoTotal} kg</span>
                              </div>
                            )}
                            {protocolo.motorista && (
                              <div className="col-span-2">
                                Motorista: <span className="text-slate-300">{protocolo.motorista}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Lista de protocolos duplicados */}
                  {duplicados > 0 && (
                    <>
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Duplicados (ignorados)
                        </h3>
                      </div>
                      {protocolos
                        .filter(p => p.isDuplicate)
                        .map(protocolo => (
                          <div
                            key={protocolo.id}
                            className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30 opacity-60"
                          >
                            <CheckCircle className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-400">
                                  {protocolo.numeroProtocolo}
                                </span>
                                <span className="text-xs text-slate-600">{protocolo.data}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Já foi sincronizado anteriormente
                              </p>
                            </div>
                          </div>
                        ))}
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(Array.from(selectedIds));
            }}
            disabled={isLoading || selecionados === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Salvando...' : `Confirmar ${selecionados} Carga(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
