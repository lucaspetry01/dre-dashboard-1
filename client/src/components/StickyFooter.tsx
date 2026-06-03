import { BarChart3, Settings, Zap } from 'lucide-react';
import { useLocation } from 'wouter';

export default function StickyFooter() {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center gap-8 py-4">
          {/* Dashboard */}
          <button
            onClick={() => setLocation('/')}
            className={`flex flex-col items-center gap-2 px-6 py-2 rounded-lg transition-all ${
              isActive('/')
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">Dashboard</span>
          </button>

          {/* Reports */}
          <button
            onClick={() => setLocation('/combustivel')}
            className={`flex flex-col items-center gap-2 px-6 py-2 rounded-lg transition-all ${
              isActive('/combustivel')
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">Reports</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setLocation('/cargas')}
            className={`flex flex-col items-center gap-2 px-6 py-2 rounded-lg transition-all ${
              isActive('/cargas')
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">Cargas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
