import { BarChart3, Truck, Fuel, Map, Zap, MapPin } from 'lucide-react';
import { useLocation } from 'wouter';

export default function StickyFooter() {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center gap-4 sm:gap-6 py-2 overflow-x-auto">
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
        </div>
      </div>
    </div>
  );
}
