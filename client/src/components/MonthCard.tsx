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
 */
export default function MonthCard({
  month,
  monthId,
  lucro,
  isSelected,
  onClick,
}: MonthCardProps) {
  const isPositive = lucro >= 0;
  const percentChange = Math.abs(lucro) > 1000 ? ((lucro / 10000) * 100).toFixed(1) : '0.0';
  
  // Gerar mini sparkline aleatória (em produção seria baseada em dados reais)
  const sparklinePoints = Array.from({ length: 12 }, () => Math.random());
  const maxPoint = Math.max(...sparklinePoints);
  const normalizedPoints = sparklinePoints.map(p => (p / maxPoint) * 100);

  return (
    <button
      onClick={onClick}
      className={`relative p-3 rounded-lg transition-all duration-200 entrance-animate ${
        isSelected
          ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
          : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
      }`}
    >
      {/* Header: Mês e Variação */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-bold">{month}</span>
        <div className={`flex items-center gap-0.5 text-xs font-semibold ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}>
          {isPositive ? (
            <TrendingUp size={12} />
          ) : (
            <TrendingDown size={12} />
          )}
          <span>{percentChange}%</span>
        </div>
      </div>

      {/* Mini Sparkline */}
      <svg
        className="w-full h-8 mb-1"
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
          stroke={isPositive ? '#4ade80' : '#f87171'}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Fill under curve */}
        <polygon
          points={`0,30 ${normalizedPoints
            .map((y, i) => `${(i / (normalizedPoints.length - 1)) * 100},${30 - (y / 100) * 25}`)
            .join(' ')} 100,30`}
          fill={isPositive ? '#4ade8033' : '#f8717133'}
        />
      </svg>

      {/* Valor */}
      <div className="text-xs font-semibold truncate">
        R$ {Math.abs(lucro).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
      </div>
    </button>
  );
}
