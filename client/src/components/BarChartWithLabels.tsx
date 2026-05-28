import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface BarChartWithLabelsProps {
  data: any[];
  formatMoney: (value: number) => string;
}

export default function BarChartWithLabels({ data, formatMoney }: BarChartWithLabelsProps) {
  const maxValue = Math.max(...data.map((d: any) => d.valor_display));

  return (
    <div className="relative w-full">
      <ResponsiveContainer width="100%" height={500}>
        <BarChart data={data} margin={{ top: 60, right: 30, left: 0, bottom: 100 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="nome" 
            angle={-45} 
            textAnchor="end" 
            height={120}
            tick={{ fontSize: 11 }}
          />
          <YAxis />
          <Tooltip 
            formatter={(value: any) => formatMoney(Number(value))}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
          />
          <Bar 
            dataKey="valor_display" 
            fill="#3B82F6" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Overlay com labels posicionados dinamicamente */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-end justify-around px-8 pb-28">
        {data.map((item, idx) => {
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
    </div>
  );
}
