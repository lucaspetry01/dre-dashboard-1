import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';
import { useMemo } from 'react';

interface BarChartWithLabelsProps {
  data: any[];
  formatMoney: (value: number) => string;
  onCategoryClick?: (nome: string, item: any) => void;
}

// Limpar nome: remover "/" e textos após barra
const cleanName = (name: string): string => {
  if (!name) return '';
  // Remove tudo após "/" e trim
  const cleaned = name.split('/')[0].trim();
  return cleaned;
};

export default function BarChartWithLabels({ data, formatMoney, onCategoryClick }: BarChartWithLabelsProps) {
  // Processar dados: filtrar categorias sem valor e limpar nomes
  const processedData = useMemo(() => {
    return data
      .filter(d => (d.valor_display ?? 0) > 0)
      .map(d => ({
        ...d,
        nomeAbreviado: cleanName(d.nome),
        total: d.valor_display
      }));
  }, [data]);

  // Configuração responsiva
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Altura dinâmica - mais compacta
  const rowHeight = isMobile ? 28 : 34;
  const dynamicHeight = Math.max(200, processedData.length * rowHeight + 30);

  const config = {
    height: dynamicHeight,
    margin: isMobile
      ? { top: 4, right: 80, left: 4, bottom: 4 }
      : { top: 6, right: 100, left: 8, bottom: 6 },
    xAxisFontSize: isMobile ? 9 : 11,
    yAxisFontSize: isMobile ? 10 : 11,
  };

  // Renderizar label customizado com valor centralizado na coluna
  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;

    return (
      <text
        x={x + width + 6}
        y={y + height / 2}
        fill="#f1f5f9"
        textAnchor="start"
        fontSize={isMobile ? 10 : 11}
        fontWeight="600"
        dominantBaseline="middle"
      >
        {formatMoney(value)}
      </text>
    );
  };

  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        Sem dados para exibir no período selecionado
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-hidden">
      <ResponsiveContainer width="100%" height={config.height}>
        <BarChart
          data={processedData}
          margin={config.margin}
          layout="vertical"
          barCategoryGap={isMobile ? 4 : 6}
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
            stroke="#475569"
            width={isMobile ? 90 : 120}
            interval={0}
            tick={(props: any) => {
              const { x, y, payload } = props;
              const axisWidth = isMobile ? 90 : 120;
              return (
                <text
                  x={x - axisWidth + 4}
                  y={y}
                  fill="#f1f5f9"
                  fontSize={config.yAxisFontSize}
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {payload.value}
                </text>
              );
            }}
          />

          <Bar
            dataKey="valor_display"
            fill="#3B82F6"
            radius={[0, 6, 6, 0]}
            isAnimationActive={true}
            label={renderCustomLabel}
            barSize={isMobile ? 18 : 24}
            cursor={onCategoryClick ? 'pointer' : 'default'}
            onClick={(d: any) => {
              if (onCategoryClick && d?.nome) {
                onCategoryClick(d.nome, d);
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
