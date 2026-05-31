import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useMemo } from 'react';

interface BarChartWithLabelsProps {
  data: any[];
  formatMoney: (value: number) => string;
}

// Abreviar nomes para mobile
const abbreviateName = (name: string): string => {
  const abbreviations: Record<string, string> = {
    'Combustível': 'Comb.',
    'Conta/Boleto': 'Conta',
    'Chapa': 'Chapa',
    'Manutenção': 'Manut.',
    'Salário': 'Salário',
    'Despesa Operacional': 'Desp. Op.',
    'Seguro': 'Seguro',
    'Taxas': 'Taxas',
    'Outros': 'Outros'
  };
  
  return abbreviations[name] || name.substring(0, 8);
};

export default function BarChartWithLabels({ data, formatMoney }: BarChartWithLabelsProps) {
  // Processar dados: top 5 + "Outros"
  const processedData = useMemo(() => {
    if (data.length <= 5) {
      return data.map(d => ({
        ...d,
        nomeAbreviado: abbreviateName(d.nome)
      }));
    }

    const sorted = [...data].sort((a, b) => b.valor_display - a.valor_display);
    const top5 = sorted.slice(0, 5);
    const outros = sorted.slice(5);
    
    const outrosTotal = outros.reduce((sum, item) => sum + item.valor_display, 0);
    
    return [
      ...top5.map(d => ({
        ...d,
        nomeAbreviado: abbreviateName(d.nome)
      })),
      {
        nome: 'Outros',
        nomeAbreviado: 'Outros',
        valor_display: outrosTotal
      }
    ];
  }, [data]);

  const maxValue = Math.max(...processedData.map((d: any) => d.valor_display));

  // Configuração responsiva baseada na largura da tela
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const chartConfig = {
    mobile: {
      height: 320,
      margin: { top: 20, right: 16, left: 0, bottom: 80 },
      xAxisHeight: 100,
      xAxisAngle: -45,
      xAxisFontSize: 10,
      tooltipOnly: true
    },
    desktop: {
      height: 500,
      margin: { top: 60, right: 30, left: 0, bottom: 100 },
      xAxisHeight: 120,
      xAxisAngle: -45,
      xAxisFontSize: 11,
      tooltipOnly: false
    }
  };

  const config = isMobile ? chartConfig.mobile : chartConfig.desktop;

  return (
    <div className="relative w-full overflow-x-hidden">
      <ResponsiveContainer width="100%" height={config.height}>
        <BarChart 
          data={processedData} 
          margin={config.margin}
          layout="vertical"
          className="sm:static"
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis 
            type="number"
            tick={{ fontSize: config.xAxisFontSize }}
            stroke="#94a3b8"
          />
          <YAxis 
            type="category"
            dataKey="nomeAbreviado"
            tick={{ fontSize: config.xAxisFontSize }}
            stroke="#94a3b8"
            width={isMobile ? 60 : 80}
          />
          <Tooltip 
            formatter={(value: any) => formatMoney(Number(value))}
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f1f5f9'
            }}
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
          />
          <Bar 
            dataKey="valor_display" 
            fill="#3B82F6" 
            radius={[0, 8, 8, 0]}
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Labels apenas em desktop */}
      {!isMobile && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-end justify-around px-8 pb-28">
          {processedData.map((item, idx) => {
            const barHeight = (item.valor_display / maxValue) * 380;
            const isSmallBar = barHeight < 50;
            
            return (
              <div 
                key={idx}
                className="flex flex-col items-center text-xs font-bold"
                style={{ 
                  height: `${barHeight}px`,
                  minWidth: '45px',
                  justifyContent: isSmallBar ? 'flex-start' : 'flex-end',
                  paddingBottom: isSmallBar ? '4px' : '6px',
                  paddingTop: isSmallBar ? '2px' : '0px'
                }}
              >
                <div className="whitespace-nowrap text-gray-700 bg-white px-1 rounded text-[10px]">
                  {formatMoney(item.valor_display)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
