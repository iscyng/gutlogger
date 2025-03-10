
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Legend, ReferenceLine } from 'recharts';
import { useMemo } from 'react';
import { lineColors, prepareOverlayChartData } from '@/utils/chartUtils';
import type { AnalysisResult } from '@/utils/chartUtils';

interface OverlayChartProps {
  selectedFiles: Set<string>;
  results: AnalysisResult[];
}

export const OverlayChart = ({ selectedFiles, results }: OverlayChartProps) => {
  const overlayChartData = useMemo(() => {
    return prepareOverlayChartData(selectedFiles, results);
  }, [selectedFiles, results]);

  if (selectedFiles.size === 0) return null;

  return (
    <div className="h-[400px] mb-8">
      <h3 className="text-md font-medium mb-2">Overlaid Pressure Readings</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={overlayChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time"
            type="number"
            label={{ value: 'Time (ms)', position: 'insideBottom', offset: -5 }}
            domain={[0, 'auto']}
          />
          <YAxis 
            label={{ value: 'Pressure (psi)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            labelFormatter={(value) => `Time: ${value}ms`}
            formatter={(value, name: string) => {
              if (name.endsWith('_event')) return [value, 'Event'];
              return [value, 'Pressure (psi)'];
            }}
          />
          <Legend />
          {Array.from(selectedFiles).map((fileName, index) => (
            <>
              <Line
                key={fileName}
                type="monotone"
                dataKey={fileName}
                name={fileName}
                stroke={lineColors[index % lineColors.length]}
                dot={false}
                connectNulls
              />
              <ReferenceLine
                key={`${fileName}_events`}
                yAxisId={0}
                label={({ viewBox }) => {
                  const event = overlayChartData.find(d => d[`${fileName}_event`]);
                  if (!event) return null;
                  return (
                    <text x={viewBox.x} y={viewBox.y - 10} fill={lineColors[index % lineColors.length]} fontSize="12">
                      {event[`${fileName}_event`]}
                    </text>
                  );
                }}
              />
            </>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
