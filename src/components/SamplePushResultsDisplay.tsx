import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ResultsTable } from '@/components/tables/ResultsTable';
import { UnitComparisonAnalysis } from '@/components/UnitComparisonAnalysis';
import { lineColors } from '@/utils/chartUtils';
import type { AnalysisResult } from '@/utils/chartUtils';
import type { SamplePushData } from '@/utils/logParser';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Legend } from 'recharts';
import { PeakPressureChart } from "@/components/charts/PeakPressureChart";

type ResultWithSample = AnalysisResult & { samplePushData?: SamplePushData | null };

interface SamplePushResultsDisplayProps {
  results: ResultWithSample[];
}

function prepareSamplePushOverlay(selectedFiles: Set<string>, results: ResultWithSample[]) {
  const selectedData = Array.from(selectedFiles).map((fileName, idx) => {
    const fileResult = results.find(r => r.file_name === fileName);
    if (!fileResult || !fileResult.samplePushData) return null;
    const readings = fileResult.samplePushData.pressureReadings.map((p, i) => ({ time: i * 50, pressure: p }));
    return { fileName, readings, color: lineColors[idx % lineColors.length] };
  }).filter(Boolean);
  if (selectedData.length === 0) return [];
  const maxTime = Math.max(...selectedData.map(d => Math.max(...d!.readings.map(r => r.time))));
  const timePoints = Array.from({ length: Math.floor(maxTime / 50) + 1 }, (_, i) => i * 50);
  return timePoints.map(t => {
    const row: { [key: string]: number | string } = { time: t };
    selectedData.forEach(d => {
      const r = d!.readings.find(rr => rr.time === t);
      if (r) row[d!.fileName] = r.pressure;
    });
    return row;
  });
}

const SamplePushOverlayChart = ({ selectedFiles, results }: { selectedFiles: Set<string>; results: ResultWithSample[] }) => {
  const data = prepareSamplePushOverlay(selectedFiles, results);
  if (selectedFiles.size === 0) return null;
  const filesArr = Array.from(selectedFiles);
  return (
    <div className="h-[400px] mb-8">
      <h3 className="text-md font-medium mb-2">Overlaid Pressure Readings</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" type="number" label={{ value: 'Time (ms)', position: 'insideBottom', offset: -5 }} domain={[0, 'auto']} />
          <YAxis label={{ value: 'Pressure (psi)', angle: -90, position: 'insideLeft' }} />
          <Tooltip labelFormatter={v => `Time: ${v}ms`} formatter={(val) => [val, 'Pressure (psi)']} />
          <Legend />
          {filesArr.map((file, idx) => (
            <Line key={file} type="monotone" dataKey={file} stroke={lineColors[idx % lineColors.length]} dot={false} name={file} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SamplePushResultsDisplay = ({ results }: SamplePushResultsDisplayProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(results.map(r => r.file_name)));
  const [unitSelections, setUnitSelections] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { setSelectedFiles(new Set(results.map(r => r.file_name))); }, [results]);

  const toggleSelect = (fileName: string) => {
    const newSel = new Set(selectedFiles);
    newSel.has(fileName) ? newSel.delete(fileName) : newSel.add(fileName);
    setSelectedFiles(newSel);
  };

  // Convert to analysis-like objects with sample push stats
  const tableResults: AnalysisResult[] = results.map(r => ({
    ...r,
    pressure_readings: r.samplePushData?.pressureReadings.length || 0,
    duration_ms: (r.samplePushData?.pressureReadings.length || 0) * 50,
    max_pressure: r.samplePushData ? Math.max(...r.samplePushData.pressureReadings).toFixed(3) : '0.000',
    raw_content: '',
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Sample Push Pressure</h2>
      <PeakPressureChart results={tableResults as unknown as any[]} />
      <SamplePushOverlayChart selectedFiles={selectedFiles} results={results} />
      <ResultsTable results={tableResults} selectedFiles={selectedFiles} unitSelections={unitSelections} isLoading={isLoading} onUnitChange={() => {}} onToggleFileSelection={toggleSelect} />
      <UnitComparisonAnalysis results={tableResults} unitSelections={unitSelections} />
    </div>
  );
} 