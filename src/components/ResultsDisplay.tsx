
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
import { useState } from 'react';
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

// Array of colors for different lines
const lineColors = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
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
    let startTime: number | null = null;
    
    lines.forEach((line) => {
      const pressureMatch = line.match(/(\d+\.\d+)psi/);
      if (pressureMatch) {
        if (startTime === null) {
          startTime = 0;
        }
        readings.push({
          time: readings.length * 50,
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

  // Get all pressure readings for selected files
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
              stroke="hsl(var(--primary))" 
              activeDot={{ r: 8 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {selectedFiles.size > 0 && (
        <div className="h-[400px] mb-8">
          <h3 className="text-md font-medium mb-2">Overlaid Pressure Readings</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time"
                type="number"
                label={{ value: 'Time (ms)', position: 'insideBottom', offset: -5 }}
                domain={[0, 'dataMax']}
              />
              <YAxis 
                label={{ value: 'Pressure (psi)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              {selectedFilesData.map((fileData, index) => (
                <Line
                  key={fileData?.fileName}
                  data={fileData?.readings}
                  type="monotone"
                  dataKey="pressure"
                  name={fileData?.fileName}
                  stroke={fileData?.color}
                  dot={false}
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
