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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveUnitSelection, getUnitSelection } from '@/stores/unitSelections';
import { useToast } from "@/hooks/use-toast";
import { extractEvents } from "@/utils/logParser";

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

const UNIT_OPTIONS = Array.from({ length: 17 }, (_, i) => `Unit ${i + 1}`);

export const ResultsDisplay = ({ results }: ResultsDisplayProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [unitSelections, setUnitSelections] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadUnitSelections = async () => {
      setIsLoading(true);
      try {
        const selections: Record<string, string> = {};
        await Promise.all(
          results.map(async (result) => {
            const savedUnit = await getUnitSelection(result.file_name);
            if (savedUnit) {
              selections[result.file_name] = savedUnit;
            }
          })
        );
        setUnitSelections(selections);
      } catch (error) {
        console.error('Error loading unit selections:', error);
        toast({
          title: "Error",
          description: "Failed to load unit selections",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUnitSelections();
  }, [results, toast]);

  const handleUnitChange = async (fileName: string, unit: string) => {
    try {
      await saveUnitSelection(fileName, unit);
      setUnitSelections(prev => ({ ...prev, [fileName]: unit }));
      toast({
        title: "Success",
        description: "Unit selection saved",
      });
    } catch (error) {
      console.error('Error saving unit selection:', error);
      toast({
        title: "Error",
        description: "Failed to save unit selection",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    
    const summaryData = results.map(r => ({
      'File Name': r.file_name,
      'Unit': unitSelections[r.file_name] || '',
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
    let firstPressureIndex = -1;
    
    // First find the first actual pressure reading (where pressure > 0)
    lines.forEach((line, index) => {
      if (firstPressureIndex === -1) {
        const pressureMatch = line.match(/(\d+\.\d+)psi/);
        if (pressureMatch && parseFloat(pressureMatch[1]) > 0) {
          firstPressureIndex = index;
        }
      }
    });

    // If no pressure readings found, return empty array
    if (firstPressureIndex === -1) return readings;

    // Now collect all readings with normalized time
    lines.forEach((line, index) => {
      const pressureMatch = line.match(/(\d+\.\d+)psi/);
      if (pressureMatch) {
        readings.push({
          time: (index - firstPressureIndex) * 50, // Normalize time relative to first pressure reading
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

  const overlayChartData = useMemo(() => {
    const selectedFilesData = Array.from(selectedFiles).map((fileName, index) => {
      const fileData = results.find(r => r.file_name === fileName);
      if (!fileData) return null;
      
      const readings = getPressureReadings(fileData.raw_content);
      const events = extractEvents(fileData.raw_content);
      
      return {
        fileName,
        readings,
        events,
        color: lineColors[index % lineColors.length]
      };
    }).filter(Boolean);

    const maxTime = Math.max(
      ...selectedFilesData.map(data => 
        Math.max(...data!.readings.map(r => r.time))
      )
    );

    const timePoints = Array.from(
      { length: Math.floor(maxTime / 50) + 1 },
      (_, i) => i * 50
    );

    return timePoints.map(time => {
      const point: { [key: string]: number | string } = { time };
      selectedFilesData.forEach(data => {
        const reading = data!.readings.find(r => r.time === time);
        if (reading) {
          point[data!.fileName] = reading.pressure;
        }
        // Add event if it exists at this time point
        const event = data!.events.find(e => Math.abs(e.time - time) < 25);
        if (event) {
          point[`${data!.fileName}_event`] = event.event;
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
                formatter={(value, name) => {
                  if (name.includes('_event')) return [value, 'Event'];
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
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Unit</TableHead>
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
                <TableCell>
                  <Select
                    value={unitSelections[result.file_name] || ''}
                    onValueChange={(value) => handleUnitChange(result.file_name, value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
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
