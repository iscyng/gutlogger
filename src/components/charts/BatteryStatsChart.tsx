
import { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Legend } from 'recharts';
import { lineColors } from '@/utils/chartUtils';

interface BatteryStatEntry {
  timestamp: string;
  batteryPercent?: string;
  batteryTempMin?: string;
  batteryTempMax?: string;
  batteryCurrent?: string;
  batteryVoltage?: string;
  fileName: string;
  unitNumber: string;
}

interface BatteryStatsChartProps {
  batteryStats: BatteryStatEntry[];
  unitNumbers: string[];
}

type BatteryStatKey = 'batteryPercent' | 'batteryTempMin' | 'batteryTempMax' | 'batteryCurrent' | 'batteryVoltage';

export const BatteryStatsChart = ({ batteryStats, unitNumbers }: BatteryStatsChartProps) => {
  const [selectedUnit, setSelectedUnit] = useState<string>(unitNumbers[0] || '');
  const [selectedStat, setSelectedStat] = useState<BatteryStatKey>('batteryPercent');

  const statOptions: { value: BatteryStatKey; label: string }[] = [
    { value: 'batteryPercent', label: 'Battery Percent' },
    { value: 'batteryTempMin', label: 'Battery Min Temp' },
    { value: 'batteryTempMax', label: 'Battery Max Temp' },
    { value: 'batteryCurrent', label: 'Battery Current' },
    { value: 'batteryVoltage', label: 'Battery Voltage' },
  ];

  const chartData = useMemo(() => {
    if (!selectedUnit) return [];
    
    return batteryStats
      .filter(stat => stat.unitNumber === selectedUnit && stat[selectedStat] !== undefined)
      .map(stat => ({
        timestamp: stat.timestamp,
        [selectedStat]: parseFloat(stat[selectedStat] || '0'),
        fileName: stat.fileName,
      }))
      .sort((a, b) => {
        // Sort by timestamp in ascending order
        const dateA = new Date(a.timestamp.replace(/_/g, ' '));
        const dateB = new Date(b.timestamp.replace(/_/g, ' '));
        return dateA.getTime() - dateB.getTime();
      });
  }, [batteryStats, selectedUnit, selectedStat]);

  if (batteryStats.length === 0) {
    return <div className="text-center py-8">No battery statistics available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label htmlFor="unit-select" className="block text-sm font-medium mb-1">Select Unit:</label>
          <select
            id="unit-select"
            className="w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedUnit}
            onChange={e => setSelectedUnit(e.target.value)}
          >
            {unitNumbers.map(unit => (
              <option key={unit} value={unit}>Unit {unit}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="stat-select" className="block text-sm font-medium mb-1">Select Statistic:</label>
          <select
            id="stat-select"
            className="w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedStat}
            onChange={e => setSelectedStat(e.target.value as BatteryStatKey)}
          >
            {statOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => {
                const date = new Date(value.replace(/_/g, ' '));
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => {
                const date = new Date(value.replace(/_/g, ' '));
                return date.toLocaleString();
              }}
              formatter={(value, name) => {
                const displayName = statOptions.find(opt => opt.value === name)?.label || name;
                return [value, displayName];
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={selectedStat}
              stroke={lineColors[0]}
              activeDot={{ r: 8 }}
              name={statOptions.find(opt => opt.value === selectedStat)?.label || selectedStat}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
