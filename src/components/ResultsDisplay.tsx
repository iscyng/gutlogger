
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveUnitSelection, getUnitSelection } from '@/stores/unitSelections';
import { useToast } from "@/hooks/use-toast";
import { PeakPressureChart } from "@/components/charts/PeakPressureChart";
import { OverlayChart } from "@/components/charts/OverlayChart";
import { ResultsTable } from "@/components/tables/ResultsTable";
import { AdditionalAnalysis } from "@/components/AdditionalAnalysis";
import { getPressureReadings, type AnalysisResult } from "@/utils/chartUtils";

interface ResultsDisplayProps {
  results: AnalysisResult[];
}

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

  const toggleFileSelection = (fileName: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileName)) {
      newSelection.delete(fileName);
    } else {
      newSelection.add(fileName);
    }
    setSelectedFiles(newSelection);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analysis Results</h2>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <PeakPressureChart results={results} />

      <OverlayChart selectedFiles={selectedFiles} results={results} />

      <ResultsTable 
        results={results}
        selectedFiles={selectedFiles}
        unitSelections={unitSelections}
        isLoading={isLoading}
        onUnitChange={handleUnitChange}
        onToggleFileSelection={toggleFileSelection}
      />
      
      <AdditionalAnalysis results={results} />
    </div>
  );
};
