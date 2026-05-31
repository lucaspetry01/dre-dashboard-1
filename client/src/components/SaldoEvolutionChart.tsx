import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SaldoData {
  periodo: string;
  saldo: number;
  saldoAnterior: number | null;
}

interface SaldoEvolutionChartProps {
  data: SaldoData[];
  formatMoney: (value: number) => string;
}

export default function SaldoEvolutionChart({ data, formatMoney }: SaldoEvolutionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        <p>Sem dados disponíveis para exibir</p>
      </div>
    );
  }

  // Formatar dados para o gráfico
  const chartData = data.map((item) => ({
    periodo: item.periodo,
    'Período Atual': item.saldo,
    'Período Anterior': item.saldoAnterior || 0,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900">{payload[0].payload.periodo}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatMoney(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="periodo"
          angle={-45}
          textAnchor="end"
          height={100}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(value) => formatMoney(value)}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="square"
        />
        <Bar
          dataKey="Período Atual"
          fill="#3B82F6"
          radius={[8, 8, 0, 0]}
        />
        <Bar
          dataKey="Período Anterior"
          fill="#93C5FD"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
