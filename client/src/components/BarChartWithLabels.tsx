import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
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

  // Configuração responsiva baseada na largura da tela
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const chartConfig = {
    mobile: {
      height: 320,
      margin: { top: 40, right: 16, left: 0, bottom: 80 },
      xAxisFontSize: 10,
    },
    desktop: {
      height: 500,
      margin: { top: 60, right: 30, left: 0, bottom: 100 },
      xAxisFontSize: 11,
    }
  };

  const config = isMobile ? chartConfig.mobile : chartConfig.desktop;

  // Renderizar label customizado com valor em moeda no topo
  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#f1f5f9"
        textAnchor="middle"
        fontSize={isMobile ? 9 : 10}
        fontWeight="bold"
      >
        {formatMoney(value)}
      </text>
    );
  };

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
            label={renderCustomLabel}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
