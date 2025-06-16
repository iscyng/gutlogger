import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ResultsTable } from '@/components/tables/ResultsTable';
import { UnitComparisonAnalysis } from '@/components/UnitComparisonAnalysis';
import { lineColors } from '@/utils/chartUtils';
import type { AnalysisResult } from '@/utils/chartUtils';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Legend } from 'recharts';

interface CleaningCycleResultsDisplayProps {
  results: AnalysisResult[];
}

function prepareCleaningOverlayChartData(selectedFiles: Set<string>, results: AnalysisResult[]) {
  const selectedFilesData = Array.from(selectedFiles).map((fileName, index) => {
    const fileData = results.find(r => r.file_name === fileName);
    if (!fileData || !fileData.cleaningCycleData) return null;
    const readings = fileData.cleaningCycleData.pressureReadings.map((pressure, i) => ({
      time: i * 50,
      pressure,
    }));
    return {
      fileName,
      readings,
      color: lineColors[index % lineColors.length]
    };
  }).filter(Boolean);

  if (selectedFilesData.length === 0) return [];

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
    });
    return point;
  });
}

const CleaningOverlayChart = ({ selectedFiles, results }: { selectedFiles: Set<string>, results: AnalysisResult[] }) => {
  const overlayChartData = prepareCleaningOverlayChartData(selectedFiles, results);
  if (selectedFiles.size === 0) return null;
  const selectedFilesArr = Array.from(selectedFiles);
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
            formatter={(value, name: string) => [value, 'Pressure (psi)']}
          />
          <Legend />
          {selectedFilesArr.map((fileName, idx) => (
            <Line 
              key={fileName}
              type="monotone"
              dataKey={fileName}
              stroke={lineColors[idx % lineColors.length]}
              name={fileName}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CleaningCycleResultsDisplay = ({ results }: CleaningCycleResultsDisplayProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(results.map(r => r.file_name)));
  const [unitSelections, setUnitSelections] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setUnitSelections({});
    setIsLoading(false);
  }, [results]);

  const handleExport = async () => {
    const wb = XLSX.utils.book_new();
    const summaryData = results.map(r => ({
      'File Name': r.file_name,
      'Unit': unitSelections[r.file_name] || '',
      'Pressure Readings': r.cleaningCycleData?.pressureReadings.length || 0,
      'Duration (ms)': (r.cleaningCycleData?.pressureReadings.length || 0) * 50,
      'Max Pressure': r.cleaningCycleData ? Math.max(...r.cleaningCycleData.pressureReadings).toFixed(3) : '0.000'
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Cleaning Cycle Summary');
    results.forEach(result => {
      if (result.cleaningCycleData) {
        const readingsData = result.cleaningCycleData.pressureReadings.map((pressure, i) => ({
          'Time (ms)': i * 50,
          'Pressure (psi)': pressure
        }));
        const sheetName = result.file_name.length > 28 
          ? `${result.file_name.slice(0, 28)}_CleaningCycle` 
          : `${result.file_name}_CleaningCycle`;
        const dataSheet = XLSX.utils.json_to_sheet(readingsData);
        XLSX.utils.book_append_sheet(wb, dataSheet, sheetName);
      }
    });
    XLSX.writeFile(wb, 'cleaning_cycle_analysis.xlsx');
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

  // Prepare fake AnalysisResult for overlay/table using cleaningCycleData
  const cleaningResults = results.map(r => ({
    ...r,
    pressure_readings: r.cleaningCycleData?.pressureReadings.length || 0,
    duration_ms: (r.cleaningCycleData?.pressureReadings.length || 0) * 50,
    max_pressure: r.cleaningCycleData ? Math.max(...r.cleaningCycleData.pressureReadings).toFixed(3) : '0.000',
    raw_content: '', // Not used for cleaning overlay
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cleaning Cycle Pressure</h2>
      </div>
      <CleaningOverlayChart selectedFiles={selectedFiles} results={results} />
      <ResultsTable 
        results={cleaningResults}
        selectedFiles={selectedFiles}
        unitSelections={unitSelections}
        isLoading={isLoading}
        onUnitChange={() => {}}
        onToggleFileSelection={toggleFileSelection}
      />
      <UnitComparisonAnalysis 
        results={cleaningResults}
        unitSelections={unitSelections}
      />
    </div>
  );
}; 