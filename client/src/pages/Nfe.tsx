import { FileText, Download, RefreshCw, Search } from 'lucide-react';

export default function Nfe() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 pb-28">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            Notas Fiscais
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gestão de NF-e via XML do Gmail</p>
        </div>

        {/* Botão importar do Gmail */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6 flex flex-col items-center gap-4">
          <FileText className="w-12 h-12 text-blue-400 opacity-60" />
          <div className="text-center">
            <p className="text-slate-200 font-semibold mb-1">Importar XMLs do Gmail</p>
            <p className="text-slate-400 text-xs">Busca automaticamente os XMLs de NF-e recebidos no Gmail e salva no banco</p>
          </div>
          <button
            disabled
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600/50 text-blue-200 text-sm font-semibold cursor-not-allowed opacity-60"
          >
            <RefreshCw className="w-4 h-4" />
            Importar do Gmail
            <span className="text-xs bg-blue-900/50 px-2 py-0.5 rounded-full ml-1">Em breve</span>
          </button>
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por chave, CNPJ ou valor..."
            disabled
            className="w-full bg-slate-800/80 border border-slate-700 text-slate-400 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm cursor-not-allowed opacity-60"
          />
        </div>

        {/* Lista vazia */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-12 flex flex-col items-center gap-3">
          <FileText className="w-16 h-16 text-slate-600" />
          <p className="text-slate-400 font-medium">Nenhuma NF-e importada ainda</p>
          <p className="text-slate-500 text-xs text-center">
            Conecte o Gmail e importe os XMLs para visualizar as notas fiscais aqui
          </p>
        </div>

      </div>
    </div>
  );
}
