
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
import { PeakPressureChart } from "@/components/charts/PeakPressureChart";
import { OverlayChart } from "@/components/charts/OverlayChart";
import { ResultsTable } from "@/components/tables/ResultsTable";
import { AdditionalAnalysis } from "@/components/AdditionalAnalysis";
import { getPressureReadings, type AnalysisResult } from '@/utils/chartUtils';

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

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GutLogger';
    workbook.created = new Date();
    
    // Create Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'File Name', key: 'fileName' },
      { header: 'Unit', key: 'unit' },
      { header: 'Pressure Readings', key: 'readings' },
      { header: 'Duration (ms)', key: 'duration' },
      { header: 'Max Pressure', key: 'maxPressure' }
    ];
    
    results.forEach(r => {
      summarySheet.addRow({
        fileName: r.file_name,
        unit: unitSelections[r.file_name] || '',
        readings: r.pressure_readings,
        duration: r.duration_ms,
        maxPressure: r.max_pressure
      });
    });

    // Create individual data sheets
    results.forEach(result => {
      const readings = getPressureReadings(result.raw_content);
      const sheetName = `${result.file_name.slice(0, 28)}_Data`;
      const dataSheet = workbook.addWorksheet(sheetName);
      
      dataSheet.columns = [
        { header: 'Time (ms)', key: 'time' },
        { header: 'Pressure (psi)', key: 'pressure' }
      ];
      
      readings.forEach(reading => {
        dataSheet.addRow({
          time: reading.time,
          pressure: reading.pressure
        });
      });
    });

    // Save workbook
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bubble_sensor_analysis.xlsx';
    a.click();
    URL.revokeObjectURL(url);
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
