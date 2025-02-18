
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

interface AnalysisResult {
  file_name: string;
  wait_time: string;
  trigger_time: string;
  pressure_readings: number;
  duration_ms: number;
  max_pressure: string;
  raw_content: string;
}

interface ResultsDisplayProps {
  results: AnalysisResult[];
}

const lineColors = [
  "#2563eb", // blue-600
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#ca8a04", // yellow-600
  "#9333ea", // purple-600
];

export const ResultsDisplay = ({ results }: ResultsDisplayProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    
    const summaryData = results.map(r => ({
      'File Name': r.file_name,
      'Wait Time': r.wait_time,
      'Trigger Time': r.trigger_time,
      'Pressure Readings': r.pressure_readings,
      'Duration (ms)': r.duration_ms,
      'Max Pressure': r.max_pressure
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    results.forEach(result => {
      const readings = getPressureReadings(result.raw_content);
      const readingsData = readings.map(r => ({
        'Time (ms)': r.time,
        'Pressure (psi)': r.pressure
      }));
      const readingsWs = XLSX.utils.json_to_sheet(readingsData);
      XLSX.utils.book_append_sheet(wb, readingsWs, `${result.file_name.slice(0, 28)}_Data`);
    });

    XLSX.writeFile(wb, 'bubble_sensor_analysis.xlsx');
  };

  const comparisonData = results.map(result => ({
    name: result.file_name,
    pressure: parseFloat(result.max_pressure),
    readings: result.pressure_readings,
  }));

  const getPressureReadings = (rawContent: string) => {
    const lines = rawContent.split('\n');
    const readings: { time: number; pressure: number }[] = [];
    
    lines.forEach((line, index) => {
      const pressureMatch = line.match(/(\d+\.\d+)psi/);
      if (pressureMatch) {
        readings.push({
          time: index * 50,
          pressure: parseFloat(pressureMatch[1]),
        });
      }
    });
    
    return readings;
  };

  const toggleFileSelection = (fileName: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileName)) {
      newSelection.delete(fileName);
    } else {
      newSelection.add(fileName);
    }
    setSelectedFiles(newSelection);
  };

  // Prepare overlay chart data
  const overlayChartData = useMemo(() => {
    const selectedFilesData = Array.from(selectedFiles).map((fileName, index) => {
      const fileData = results.find(r => r.file_name === fileName);
      if (!fileData) return null;
      
      const readings = getPressureReadings(fileData.raw_content);
      return {
        fileName,
        readings,
        color: lineColors[index % lineColors.length]
      };
    }).filter(Boolean);

    // Find the maximum time value across all datasets
    const maxTime = Math.max(
      ...selectedFilesData.map(data => 
        Math.max(...data!.readings.map(r => r.time))
      )
    );

    // Create time points array
    const timePoints = Array.from(
      { length: Math.floor(maxTime / 50) + 1 },
      (_, i) => i * 50
    );

    // Create the combined dataset
    return timePoints.map(time => {
      const point: { [key: string]: number } = { time };
      selectedFilesData.forEach(data => {
        const reading = data!.readings.find(r => r.time === time);
        if (reading) {
          point[data!.fileName] = reading.pressure;
        }
      });
      return point;
    });
  }, [selectedFiles, results]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analysis Results</h2>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <div className="h-[300px] mb-8">
        <h3 className="text-md font-medium mb-2">Peak Pressure Comparison</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="pressure" 
              stroke={lineColors[0]}
              activeDot={{ r: 8 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {selectedFiles.size > 0 && (
        <div className="h-[400px] mb-8">
          <h3 className="text-md font-medium mb-2">Overlaid Pressure Readings</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overlayChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time"
                type="number"
                label={{ value: 'Time (ms)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Pressure (psi)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                labelFormatter={(value) => `Time: ${value}ms`}
              />
              <Legend />
              {Array.from(selectedFiles).map((fileName, index) => (
                <Line
                  key={fileName}
                  type="monotone"
                  dataKey={fileName}
                  name={fileName}
                  stroke={lineColors[index % lineColors.length]}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Wait Time</TableHead>
              <TableHead>Trigger Time</TableHead>
              <TableHead>Pressure Readings</TableHead>
              <TableHead>Duration (ms)</TableHead>
              <TableHead>Max Pressure</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow 
                key={result.file_name}
                className={selectedFiles.has(result.file_name) ? "bg-muted/50" : ""}
              >
                <TableCell>{result.file_name}</TableCell>
                <TableCell>{result.wait_time}</TableCell>
                <TableCell>{result.trigger_time}</TableCell>
                <TableCell>{result.pressure_readings}</TableCell>
                <TableCell>{result.duration_ms}</TableCell>
                <TableCell>{result.max_pressure}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFileSelection(result.file_name)}
                  >
                    {selectedFiles.has(result.file_name) ? "Hide Graph" : "Show Graph"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
