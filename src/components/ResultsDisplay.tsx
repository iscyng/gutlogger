
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

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

export const ResultsDisplay = ({ results }: ResultsDisplayProps) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleExportCSV = () => {
    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      "File Name,Wait Time,Trigger Time,Pressure Readings,Duration (ms),Max Pressure\n" +
      results.map(r => 
        `${r.file_name},${r.wait_time},${r.trigger_time},${r.pressure_readings},${r.duration_ms},${r.max_pressure}`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "analysis_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Data for comparison chart (existing chart)
  const comparisonData = results.map(result => ({
    name: result.file_name,
    pressure: parseFloat(result.max_pressure),
    readings: result.pressure_readings,
  }));

  // Parse pressure readings from raw content for the selected file
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
          time: readings.length * 50, // 50ms intervals
          pressure: parseFloat(pressureMatch[1]),
        });
      }
    });
    
    return readings;
  };

  const selectedFileData = selectedFile 
    ? results.find(r => r.file_name === selectedFile)
    : null;

  const pressureReadings = selectedFileData 
    ? getPressureReadings(selectedFileData.raw_content)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analysis Results</h2>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
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

      {selectedFile && pressureReadings.length > 0 && (
        <div className="h-[300px] mb-8">
          <h3 className="text-md font-medium mb-2">Pressure Readings for {selectedFile}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pressureReadings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time (ms)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Pressure (psi)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="pressure" 
                stroke="hsl(var(--primary))" 
                dot={false}
              />
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
                className={selectedFile === result.file_name ? "bg-muted/50" : ""}
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
                    onClick={() => setSelectedFile(result.file_name === selectedFile ? null : result.file_name)}
                  >
                    {result.file_name === selectedFile ? "Hide Details" : "Show Details"}
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
