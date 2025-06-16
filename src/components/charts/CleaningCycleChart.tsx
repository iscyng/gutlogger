import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CleaningCycleData } from '@/utils/logParser';

interface CleaningCycleChartProps {
  cleaningCycleData: CleaningCycleData;
  fileName: string;
}

export const CleaningCycleChart = ({ cleaningCycleData, fileName }: CleaningCycleChartProps) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  const chartData = cleaningCycleData.pressureReadings.map((pressure, index) => ({
    time: index * 50, // Each reading is 50ms apart
    pressure,
    timestamp: cleaningCycleData.timestamps[index]
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Cleaning Cycle - {fileName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time (ms)', position: 'insideBottomRight', offset: -5 }} 
              />
              <YAxis 
                label={{ value: 'Pressure (psi)', angle: -90, position: 'insideLeft' }} 
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(3)} psi`, 'Pressure']}
                labelFormatter={(label) => `Time: ${label}ms`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="pressure" 
                stroke="#2563eb" 
                name="Pressure"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>Start Time: {cleaningCycleData.startTime}</p>
          <p>End Time: {cleaningCycleData.endTime}</p>
          <p>Max Pressure: {Math.max(...cleaningCycleData.pressureReadings).toFixed(3)} psi</p>
          <p>Duration: {(cleaningCycleData.pressureReadings.length * 50).toFixed(0)} ms</p>
        </div>
      </CardContent>
    </Card>
  );
}; 