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
import { OverlayChart } from "@/components/charts/OverlayChart";
import { getPressureReadings, type AnalysisResult } from '@/utils/chartUtils';

interface ResultsDisplayProps {
  results: AnalysisResult[];
}

export const ResultsDisplay = ({ results }: ResultsDisplayProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(results.map(r => r.file_name)));
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

  useEffect(() => {
    // When new results come in, select all files by default
    setSelectedFiles(new Set(results.map(r => r.file_name)));
  }, [results]);

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
    const wb = XLSX.utils.book_new();
    
    // Create Summary sheet
    const summaryData = results.map(r => ({
      'File Name': r.file_name,
      'Unit': unitSelections[r.file_name] || '',
      'Pressure Readings': r.pressure_readings,
      'Duration (ms)': r.duration_ms,
      'Max Pressure': r.max_pressure
    }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    
    // Create individual data sheets
    results.forEach(result => {
      const readings = getPressureReadings(result.raw_content);
      const sheetName = result.file_name.length > 28 
        ? `${result.file_name.slice(0, 28)}_Data` 
        : `${result.file_name}_Data`;
      
      const readingsData = readings.map(reading => ({
        'Time (ms)': reading.time,
        'Pressure (psi)': reading.pressure
      }));
      
      const dataSheet = XLSX.utils.json_to_sheet(readingsData);
      XLSX.utils.book_append_sheet(wb, dataSheet, sheetName);
    });

    // Save workbook
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
        <h2 className="text-lg font-semibold">Full Cycle Pressure</h2>
      </div>

      <OverlayChart selectedFiles={selectedFiles} results={results} />
    </div>
  );
};
