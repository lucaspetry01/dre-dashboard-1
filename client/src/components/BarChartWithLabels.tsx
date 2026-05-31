import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
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
        nomeAbreviado: abbreviateName(d.nome),
        total: d.valor_display
      }));
    }

    const sorted = [...data].sort((a, b) => b.valor_display - a.valor_display);
    const top5 = sorted.slice(0, 5);
    const outros = sorted.slice(5);
    
    const outrosTotal = outros.reduce((sum, item) => sum + item.valor_display, 0);
    
    return [
      ...top5.map(d => ({
        ...d,
        nomeAbreviado: abbreviateName(d.nome),
        total: d.valor_display
      })),
      {
        nome: 'Outros',
        nomeAbreviado: 'Outros',
        valor_display: outrosTotal,
        total: outrosTotal
      }
    ];
  }, [data]);

  const maxValue = Math.max(...processedData.map((d: any) => d.valor_display));
  const totalGeral = processedData.reduce((sum, d) => sum + d.valor_display, 0);

  // Configuração responsiva baseada na largura da tela
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const chartConfig = {
    mobile: {
      height: 320,
      margin: { top: 20, right: 16, left: 0, bottom: 80 },
      xAxisFontSize: 10,
      tooltipOnly: true
    },
    desktop: {
      height: 500,
      margin: { top: 60, right: 30, left: 0, bottom: 100 },
      xAxisFontSize: 11,
      tooltipOnly: false
    }
  };

  const config = isMobile ? chartConfig.mobile : chartConfig.desktop;

  // Renderizar label customizado com valor em moeda
  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    const isSmallBar = height < 50;
    
    return (
      <text
        x={x + width / 2}
        y={isSmallBar ? y - 8 : y + height - 8}
        fill="#f1f5f9"
        textAnchor="middle"
        fontSize={10}
        fontWeight="bold"
      >
        {formatMoney(value)}
      </text>
    );
  };

  return (
    <div className="relative w-full overflow-x-hidden">
      {/* Total Geral */}
      <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <p className="text-xs text-slate-400 mb-1">Total de Despesas</p>
        <p className="text-lg font-bold text-white">{formatMoney(totalGeral)}</p>
      </div>

      <ResponsiveContainer width="100%" height={config.height}>
        <BarChart 
          data={processedData} 
          margin={config.margin}
          layout="vertical"
          className="sm:static"
        >
          <CartesianGrid 
            strokeDasharray="0"
            stroke="transparent"
            vertical={false}
          />
          <XAxis 
            type="number"
            tick={{ fontSize: config.xAxisFontSize, fill: '#f1f5f9' }}
            stroke="#475569"
            tickFormatter={(value) => formatMoney(value)}
          />
          <YAxis 
            type="category"
            dataKey="nomeAbreviado"
            tick={{ fontSize: config.xAxisFontSize, fill: '#f1f5f9' }}
            stroke="#475569"
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
            labelStyle={{ color: '#f1f5f9' }}
          />
          <Bar 
            dataKey="valor_display" 
            fill="#3B82F6" 
            radius={[0, 8, 8, 0]}
            isAnimationActive={true}
            label={!isMobile ? renderCustomLabel : false}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Labels apenas em mobile com valores em moeda */}
      {isMobile && (
        <div className="mt-4 space-y-2">
          {processedData.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-2 bg-slate-800/30 rounded border border-slate-700">
              <span className="text-xs font-medium text-slate-300">{item.nomeAbreviado}</span>
              <span className="text-sm font-bold text-white">{formatMoney(item.valor_display)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
