import { BarChart3, Truck, Fuel, Map, Zap, MapPin, Download } from 'lucide-react';
import { useLocation } from 'wouter';
import { useRef } from 'react';

export default function StickyFooter() {
  const [location, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isActive = (path: string) => location === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 z-50 pointer-events-auto">
      <div className="flex items-center justify-start gap-2 sm:gap-4 py-2 px-2 sm:px-4 overflow-x-auto scrollbar-hide w-full">
          {/* Dashboard */}
          <button
            onClick={() => setLocation('/')}
            className={`flex flex-col items-center gap-1 px-4 sm:px-6 py-1 rounded-lg transition-all flex-shrink-0 ${
              isActive('/')
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-medium whitespace-nowrap leading-tight">Dashboard</span>
          </button>

          {/* Cargas */}
          <button
            onClick={() => setLocation('/cargas')}
            className={`flex flex-col items-center gap-2 px-4 sm:px-6 py-2 rounded-lg transition-all flex-shrink-0 ${
              isActive('/cargas')
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-xs font-medium whitespace-nowrap leading-tight">Cargas</span>
          </button>

          {/* Abastecimento */}
          <button
            onClick={() => {}}
            className="flex flex-col items-center gap-1 px-4 sm:px-6 py-1 rounded-lg transition-all flex-shrink-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          >
            <Fuel className="w-5 h-5" />
            <span className="text-xs font-medium whitespace-nowrap leading-tight">Abastecimento</span>
          </button>

          {/* Rotas PM */}
          <button
            onClick={() => {}}
            className="flex flex-col items-center gap-1 px-4 sm:px-6 py-1 rounded-lg transition-all flex-shrink-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          >
            <Map className="w-5 h-5" />
            <span className="text-xs font-medium whitespace-nowrap leading-tight">Rotas PM</span>
          </button>

          {/* IA Insights */}
          <button
            onClick={() => {}}
            className="flex flex-col items-center gap-1 px-4 sm:px-6 py-1 rounded-lg transition-all flex-shrink-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          >
            <Zap className="w-5 h-5" />
            <span className="text-xs font-medium whitespace-nowrap leading-tight">IA Insights</span>
          </button>

          {/* Mapa */}
          <button
            onClick={() => {}}
            className="flex flex-col items-center gap-1 px-4 sm:px-6 py-1 rounded-lg transition-all flex-shrink-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          >
            <MapPin className="w-5 h-5" />
            <span className="text-xs font-medium whitespace-nowrap leading-tight">Mapa</span>
          </button>

          {/* OFX Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 px-4 sm:px-6 py-1 rounded-lg transition-all flex-shrink-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          >
            <Download className="w-5 h-5" />
            <span className="text-xs font-medium whitespace-nowrap leading-tight">OFX</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ofx,.txt,application/x-ofx,text/plain,application/octet-stream"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('Arquivo selecionado:', file.name, file.type, file.size);
                window.dispatchEvent(new CustomEvent('ofx-upload', { detail: { file } }));
                // Reset input para permitir selecionar o mesmo arquivo novamente
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              } else {
                console.log('Nenhum arquivo selecionado');
              }
            }}
          />
      </div>
    </div>
  );
}
