import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from '@/components/FileUploader';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { FileList } from '@/components/FileList';
import { AdditionalAnalysis } from '@/components/AdditionalAnalysis';
import { Card } from "@/components/ui/card";
import { CleaningCycleChart } from "@/components/charts/CleaningCycleChart";
import { extractCleaningCycleData, extractSamplePushData } from "@/utils/logParser";
import { CleaningCycleResultsDisplay } from '@/components/CleaningCycleResultsDisplay';
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import type { CleaningCycleData, SamplePushData } from "@/utils/logParser";
import { SamplePushResultsDisplay } from '@/components/SamplePushResultsDisplay';

interface AnalysisResult {
  file_name: string;
  wait_time: string;
  trigger_time: string;
  pressure_readings: number;
  duration_ms: number;
  max_pressure: string;
  raw_content: string; // Add raw content storage
  settings: Record<string, string>; // Store all settings
  battery_info: Record<string, string>; // Store battery information
  temperatures: string[]; // Store temperature readings
  system_events: string[]; // Store system events
  cleaningCycleData?: CleaningCycleData | null;
  samplePushData?: SamplePushData | null;
}

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleFilesSelected = (newFiles: File[]) => {
    const logFiles = newFiles.filter(file => file.name.endsWith('.log'));
    if (logFiles.length !== newFiles.length) {
      toast({
        title: "Invalid file type",
        description: "Only .log files are supported",
        variant: "destructive",
      });
    }
    setFiles(prevFiles => [...prevFiles, ...logFiles]);
  };

  const handleRemoveFile = (fileName: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  const parseLogFile = (content: string): AnalysisResult => {
    const lines = content.split('\n');
    let wait_time = '';
    let trigger_time = '';
    let pressure_readings: number[] = [];
    let measuring = false;
    const settings: Record<string, string> = {};
    const battery_info: Record<string, string> = {};
    const temperatures: string[] = [];
    const system_events: string[] = [];
    const cleaningCycleData = extractCleaningCycleData(content);
    const samplePushData = extractSamplePushData(content);

    for (const line of lines) {
      // Store settings
      if (line.includes("Setting")) {
        const settingMatch = line.match(/Setting "(\w+)" (?:value is|changed from .* to) (.*)/);
        if (settingMatch) {
          settings[settingMatch[1]] = settingMatch[2];
        }
      }

      // Store battery info
      if (line.includes("battery")) {
        const batteryMatch = line.match(/battery(\w+) = (.*)/);
        if (batteryMatch) {
          battery_info[batteryMatch[1]] = batteryMatch[2];
        }
      }

      // Store temperature readings
      if (line.includes("C")) {
        const tempMatch = line.match(/(\d+\.\d+)C/);
        if (tempMatch) {
          temperatures.push(tempMatch[1]);
        }
      }

      // Store system events
      if (line.includes("Manager")) {
        system_events.push(line.trim());
      }

      // Look for the start of pressure readings
      if (line.includes("Waiting to trigger with sample")) {
        measuring = true;
        const timeMatch = line.match(/\((.*?)_CST\)/);
        if (timeMatch) {
          wait_time = timeMatch[1].replace(/_/g, ' ');
        }
        continue;
      }

      // Look for trigger event
      if (measuring && (line.includes("Triggered!") || line.includes("TIME TO VENT"))) {
        const timeMatch = line.match(/\((.*?)_CST\)/);
        if (timeMatch) {
          trigger_time = timeMatch[1].replace(/_/g, ' ');
        }
        break;
      }

      // Collect pressure readings
      if (measuring) {
        const pressureMatch = line.match(/(\d+\.\d+)psi/);
        if (pressureMatch) {
          pressure_readings.push(parseFloat(pressureMatch[1]));
        }
      }
    }

    return {
      file_name: '',  // Will be set by the caller
      wait_time,
      trigger_time,
      pressure_readings: pressure_readings.length,
      duration_ms: pressure_readings.length * 50, // Each reading is 50ms
      max_pressure: pressure_readings.length > 0 ? Math.max(...pressure_readings).toFixed(3) : "0.000",
      raw_content: content,
      settings,
      battery_info,
      temperatures,
      system_events,
      cleaningCycleData,
      samplePushData,
    };
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    try {
      const results = await Promise.all(files.map(async (file) => {
        return new Promise<AnalysisResult>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            const result = parseLogFile(content);
            result.file_name = file.name;
            resolve(result);
          };
          reader.readAsText(file);
        });
      }));

      setResults(results);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${files.length} file(s)`,
      });
    } catch (error) {
      console.error('Error analyzing files:', error);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing the files",
        variant: "destructive",
      });
    }
  };

  // Export both sample push and cleaning cycle readings
  const handleExportAll = () => {
    console.log('Exporting results:', results);
    const wb = XLSX.utils.book_new();
    // Sample Push Summary
    const samplePushData = results.map(r => ({
      'File Name': r.file_name,
      'Pressure Readings': r.pressure_readings,
      'Duration (ms)': r.duration_ms,
      'Max Pressure': r.max_pressure
    }));
    // Cleaning Cycle Summary
    const cleaningCycleResults = results.filter(r => r.cleaningCycleData && r.cleaningCycleData.pressureReadings.length > 0);
    const cleaningCycleData = cleaningCycleResults.map(r => ({
      'File Name': r.file_name,
      'Pressure Readings': r.cleaningCycleData?.pressureReadings.length || 0,
      'Duration (ms)': (r.cleaningCycleData?.pressureReadings.length || 0) * 50,
      'Max Pressure': r.cleaningCycleData ? Math.max(...r.cleaningCycleData.pressureReadings).toFixed(3) : '0.000'
    }));
    console.log('Sample Push Data:', samplePushData);
    console.log('Cleaning Cycle Data:', cleaningCycleData);
    // Build Summary sheet with two tables
    const summarySheet = XLSX.utils.aoa_to_sheet([['Sample Push Pressure']]);
    // Add Sample Push table starting at row 2
    XLSX.utils.sheet_add_json(summarySheet, samplePushData, {
      origin: 'A2',
      header: ['File Name', 'Pressure Readings', 'Duration (ms)', 'Max Pressure']
    });

    // Determine starting row for cleaning cycle table
    const startRowCleaning = samplePushData.length + 4; // title row + header row + data + one blank
    XLSX.utils.sheet_add_aoa(summarySheet, [['Cleaning Cycle Pressure']], { origin: `A${startRowCleaning}` });
    XLSX.utils.sheet_add_json(summarySheet, cleaningCycleData, {
      origin: `A${startRowCleaning + 1}`,
      header: ['File Name', 'Pressure Readings', 'Duration (ms)', 'Max Pressure']
    });

    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    // Add individual sheets for sample push
    samplePushData.forEach(row => {
      const result = results.find(r => r.file_name === row['File Name']);
      if (result && result.raw_content) {
        const readings = result.raw_content.split('\n').map((line, i) => {
          const match = line.match(/(\d+\.\d+)psi/);
          return match ? { 'Time (ms)': i * 50, 'Pressure (psi)': parseFloat(match[1]) } : null;
        }).filter(Boolean);
        if (readings.length) {
          const sheetName = safeSheetName(result.file_name, '_SamplePush');
          const dataSheet = XLSX.utils.json_to_sheet(readings);
          XLSX.utils.book_append_sheet(wb, dataSheet, sheetName);
        }
      }
    });
    // Add individual sheets for cleaning cycles
    cleaningCycleResults.forEach(result => {
      if (result.cleaningCycleData) {
        const readingsData = result.cleaningCycleData.pressureReadings.map((pressure, i) => ({
          'Time (ms)': i * 50,
          'Pressure (psi)': pressure
        }));
        const sheetName = safeSheetName(result.file_name, '_CleaningCycle');
        const dataSheet = XLSX.utils.json_to_sheet(readingsData);
        XLSX.utils.book_append_sheet(wb, dataSheet, sheetName);
      }
    });
    XLSX.writeFile(wb, 'gutlogger_analysis.xlsx');
  };

  // helper to generate safe sheet names (<=31 chars)
  const safeSheetName = (fileName: string, suffix: string) => {
    const base = fileName.replace(/\.[^/.]+$/, ''); // remove extension
    const maxBaseLen = 31 - suffix.length;
    const trimmed = base.length > maxBaseLen ? base.slice(0, maxBaseLen) : base;
    return `${trimmed}${suffix}`;
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">GutLogger</h1>
          <p className="text-muted-foreground">Upload your log files to analyze data</p>
          <div className="flex justify-end max-w-5xl mx-auto mt-4">
            <Button onClick={handleExportAll} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="p-6">
            <FileUploader onFilesSelected={handleFilesSelected} />
          </Card>

          {files.length > 0 && (
            <Card className="p-6 animate-file-drop">
              <FileList 
                files={files} 
                onRemove={handleRemoveFile} 
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            </Card>
          )}

          {results.length > 0 && (
            <>
              <Card className="p-6 animate-results-appear">
                <ResultsDisplay results={results} />
              </Card>
              {/* Sample Push Panel */}
              {results.some(r=>r.samplePushData) && (
                <Card className="p-6 animate-results-appear mt-8">
                  <SamplePushResultsDisplay results={results.filter(r=>r.samplePushData)} />
                </Card>
              )}
              {/* Cleaning Cycle Panel */}
              {results.some(r => r.cleaningCycleData) && (
                <Card className="p-6 animate-results-appear mt-8">
                  <CleaningCycleResultsDisplay results={results.filter(r => r.cleaningCycleData)} />
                </Card>
              )}
              <AdditionalAnalysis results={results} autoAnalyze={true} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
