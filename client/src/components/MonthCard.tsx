import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MonthCardProps {
  month: string;
  monthId: string;
  lucro: number;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * MonthCard - Card com mini gráfico sparkline mostrando tendência mensal
 * Exibe o mês, variação percentual e um mini gráfico de tendência
 * Formatação condicional: amarelo para 0,0k | neutro com transparência para meses futuros
 */
export default function MonthCard({
  month,
  monthId,
  lucro,
  isSelected,
  onClick,
}: MonthCardProps) {
  const isPositive = lucro >= 0;
  const hasData = Math.abs(lucro) > 0;
  const percentChange = Math.abs(lucro) > 1000 ? ((lucro / 10000) * 100).toFixed(1) : '0.0';
  
  // Gerar mini sparkline aleatória (em produção seria baseada em dados reais)
  const sparklinePoints = Array.from({ length: 12 }, () => Math.random());
  const maxPoint = Math.max(...sparklinePoints);
  const normalizedPoints = sparklinePoints.map(p => (p / maxPoint) * 100);

  // Determinar cor e estilo baseado em dados
  const getCardStyle = () => {
    if (isSelected) {
      return 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400';
    }
    
    // Sem dados - transparência 80% (20% opacidade)
    if (!hasData) {
      return 'bg-slate-800/20 border border-slate-700/20 hover:bg-slate-800/30';
    }
    
    // Com dados - estilo normal
    return 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700';
  };

  const getValueColor = () => {
    if (isSelected) return 'text-white';
    if (!hasData) return 'text-white/90';
    return 'text-slate-200';
  };

  const getSparklineColor = () => {
    if (!hasData) return '#94a3b8'; // Cor neutra para sem dados
    return isPositive ? '#4ade80' : '#f87171';
  };

  const getSparklineFillColor = () => {
    if (!hasData) return '#64748b33'; // Transparência neutra
    return isPositive ? '#4ade8033' : '#f8717133';
  };

  return (
    <button
      onClick={onClick}
      className={`relative w-20 h-24 flex flex-col items-center justify-between p-2 rounded-md transition-all duration-200 entrance-animate text-xs ${getCardStyle()}`}
      style={{ minWidth: '80px' }}
    >
      {/* Header: Mês e Variação */}
      <div className="flex items-start justify-between w-full">
        <span className="text-xs font-bold leading-tight">{month}</span>
        {hasData && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            {isPositive ? (
              <TrendingUp size={10} />
            ) : (
              <TrendingDown size={10} />
            )}
            <span className="text-xxs leading-none">{percentChange}%</span>
          </div>
        )}
        {!hasData && (
          <span className="text-xs leading-none text-yellow-400 font-semibold">—</span>
        )}
      </div>

      {/* Mini Sparkline */}
      <svg
        className={`w-full flex-1 my-1 ${!hasData ? 'opacity-50' : ''}`}
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
      >
        {/* Background */}
        <rect width="100" height="30" fill="transparent" />
        
        {/* Sparkline path */}
        <polyline
          points={normalizedPoints
            .map((y, i) => `${(i / (normalizedPoints.length - 1)) * 100},${30 - (y / 100) * 25}`)
            .join(' ')}
          fill="none"
          stroke={getSparklineColor()}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Fill under curve */}
        <polygon
          points={`0,30 ${normalizedPoints
            .map((y, i) => `${(i / (normalizedPoints.length - 1)) * 100},${30 - (y / 100) * 25}`)
            .join(' ')} 100,30`}
          fill={getSparklineFillColor()}
        />
      </svg>

      {/* Valor em Reais */}
      <div className={`text-xs font-semibold truncate leading-tight text-center w-full ${getValueColor()}`}>
        R$ {(Math.abs(lucro) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k
      </div>
    </button>
  );
}
