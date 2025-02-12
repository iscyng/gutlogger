
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

interface AnalysisResult {
  file_name: string;
  wait_time: string;
  trigger_time: string;
  pressure_readings: number;
  duration_ms: number;
  max_pressure: string;
}

interface ResultsDisplayProps {
  results: AnalysisResult[];
}

export const ResultsDisplay = ({ results }: ResultsDisplayProps) => {
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

  // Mock data for the chart
  const chartData = results.map(result => ({
    name: result.file_name,
    pressure: parseFloat(result.max_pressure),
    readings: result.pressure_readings,
  }));

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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.file_name}>
                <TableCell>{result.file_name}</TableCell>
                <TableCell>{result.wait_time}</TableCell>
                <TableCell>{result.trigger_time}</TableCell>
                <TableCell>{result.pressure_readings}</TableCell>
                <TableCell>{result.duration_ms}</TableCell>
                <TableCell>{result.max_pressure}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
