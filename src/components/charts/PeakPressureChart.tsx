
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { lineColors } from '@/utils/chartUtils';
import type { AnalysisResult } from '@/utils/chartUtils';

interface PeakPressureChartProps {
  results: AnalysisResult[];
}

export const PeakPressureChart = ({ results }: PeakPressureChartProps) => {
  const comparisonData = results.map(result => ({
    name: result.file_name,
    pressure: parseFloat(result.max_pressure),
    readings: result.pressure_readings,
  }));

  return (
    <div className="h-[300px] mb-8">
      <h3 className="text-md font-medium mb-2">Peak Pressure Comparison</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={comparisonData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value, name, props) => {
              // Fix TypeScript error by explicitly typing the name parameter as string
              const nameStr = String(name);
              return [value, nameStr.endsWith('pressure') ? 'Pressure (psi)' : nameStr];
            }} 
          />
          <Line 
            type="monotone" 
            dataKey="pressure" 
            stroke={lineColors[0]}
            activeDot={{ r: 8 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
